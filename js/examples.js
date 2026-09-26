import { SCALAR_TYPES } from "./parser.js";

/**
 * Generate sample JSON payloads from message definitions.
 */
export function exampleForMessage(ws, fqn, opts = {}) {
  const { depth = 0, maxDepth = 3, seen = new Set() } = opts;
  const rec = ws.types.get(fqn);
  if (!rec || rec.kind !== "message") return null;
  if (seen.has(fqn) || depth > maxDepth) return { _ref: fqn };
  seen.add(fqn);

  const obj = {};
  for (const f of rec.fields) {
    if (f.oneof && Object.keys(obj).some((k) => rec.fields.find((x) => x.name === k && x.oneof === f.oneof))) {
      continue; // one field per oneof
    }
    const val = exampleValue(ws, f, depth, maxDepth, new Set(seen));
    if (f.label === "repeated" && !f.isMap) {
      obj[f.name] = [val];
    } else {
      obj[f.name] = val;
    }
  }
  return obj;
}

function exampleValue(ws, field, depth, maxDepth, seen) {
  if (field.isMap && field.typeRaw?.kind === "map") {
    const keyEx = scalarExample(field.typeRaw.keyType, field.name + "_key");
    const valType = field.typeRaw.valueType;
    let valEx;
    if (SCALAR_TYPES.has(valType)) valEx = scalarExample(valType, field.name);
    else {
      const resolved = field.valueResolved?.fqn || resolveLoose(ws, valType);
      valEx = resolved ? exampleForMessage(ws, resolved, { depth: depth + 1, maxDepth, seen }) : `<${valType}>`;
    }
    return { [String(keyEx)]: valEx };
  }

  const t = typeof field.typeRaw === "string" ? field.typeRaw : field.typeText;
  if (SCALAR_TYPES.has(t)) return scalarExample(t, field.name);

  const resolved = field.resolved?.kind === "type"
    ? field.resolved.fqn
    : resolveLoose(ws, t);

  if (resolved) {
    const target = ws.types.get(resolved);
    if (target?.kind === "enum") {
      return target.values[0]?.name || 0;
    }
    return exampleForMessage(ws, resolved, { depth: depth + 1, maxDepth, seen });
  }
  return null;
}

function resolveLoose(ws, name) {
  if (!name) return null;
  const clean = name.replace(/^\./, "");
  if (ws.types.has(clean)) return clean;
  for (const fqn of ws.types.keys()) {
    if (fqn.endsWith("." + clean) || fqn === clean) return fqn;
  }
  return null;
}

function scalarExample(type, hint = "") {
  switch (type) {
    case "bool":
      return true;
    case "string":
      return hint.includes("json") ? "{}" : hint.includes("id") ? "00000000-0000-0000-0000-000000000001" : "example";
    case "bytes":
      return "base64==";
    case "float":
    case "double":
      return 0.5;
    case "int32":
    case "int64":
    case "sint32":
    case "sint64":
    case "sfixed32":
    case "sfixed64":
    case "uint32":
    case "uint64":
    case "fixed32":
    case "fixed64":
      return hint.includes("unix") || hint.includes("time") ? Date.now() : 1;
    default:
      return null;
  }
}

export function exampleForRpc(ws, serviceFqn, methodName) {
  const svc = ws.types.get(serviceFqn);
  if (!svc || svc.kind !== "service") return null;
  const m = svc.methods.find((x) => x.name === methodName);
  if (!m) return null;
  const reqFqn = m.requestResolved?.kind === "type" ? m.requestResolved.fqn : resolveLoose(ws, m.requestType);
  const resFqn = m.responseResolved?.kind === "type" ? m.responseResolved.fqn : resolveLoose(ws, m.responseType);
  return {
    method: `${serviceFqn}/${m.name}`,
    request: reqFqn ? exampleForMessage(ws, reqFqn) : null,
    response: resFqn ? exampleForMessage(ws, resFqn) : null,
  };
}
