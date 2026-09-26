import { parseProto, typeRefText, SCALAR_TYPES } from "./parser.js";

/**
 * Build a cross-file index of types, references, and search entries.
 */
export function createWorkspace() {
  return {
    files: [], // { id, filename, source, ast, loadedAt }
    types: new Map(), // fqn -> type record
    byId: new Map(),
    searchIndex: [],
  };
}

function joinFqn(pkg, ...parts) {
  const rest = parts.filter(Boolean).join(".");
  if (!pkg) return rest;
  if (!rest) return pkg;
  return `${pkg}.${rest}`;
}

function walkMessage(ws, file, pkg, parentPath, msg) {
  const fqn = joinFqn(pkg, parentPath, msg.name);
  const path = parentPath ? `${parentPath}.${msg.name}` : msg.name;
  const rec = {
    id: `msg:${fqn}`,
    kind: "message",
    name: msg.name,
    fqn,
    package: pkg,
    fileId: file.id,
    filename: file.filename,
    comment: msg.comment,
    node: msg,
    parentFqn: parentPath ? joinFqn(pkg, parentPath) : null,
    fields: [],
    nested: [],
  };

  const allFields = [
    ...msg.fields,
    ...msg.oneofs.flatMap((o) => o.fields.map((f) => ({ ...f, oneof: o.name }))),
  ];

  for (const f of allFields) {
    const typeText = typeRefText(f.type);
    rec.fields.push({
      name: f.name,
      number: f.number,
      label: f.label,
      typeText,
      typeRaw: f.type,
      comment: f.comment,
      oneof: f.oneof || null,
      isMap: !!f.isMap || (f.type && f.type.kind === "map"),
      options: f.options || [],
    });
  }

  ws.types.set(fqn, rec);
  ws.byId.set(rec.id, rec);

  for (const nested of msg.messages) {
    const child = walkMessage(ws, file, pkg, path, nested);
    rec.nested.push(child.fqn);
  }
  for (const en of msg.enums) {
    const child = walkEnum(ws, file, pkg, path, en);
    rec.nested.push(child.fqn);
  }

  return rec;
}

function walkEnum(ws, file, pkg, parentPath, en) {
  const fqn = joinFqn(pkg, parentPath, en.name);
  const rec = {
    id: `enm:${fqn}`,
    kind: "enum",
    name: en.name,
    fqn,
    package: pkg,
    fileId: file.id,
    filename: file.filename,
    comment: en.comment,
    node: en,
    parentFqn: parentPath ? joinFqn(pkg, parentPath) : null,
    values: en.values.map((v) => ({
      name: v.name,
      number: v.number,
      comment: v.comment,
    })),
  };
  ws.types.set(fqn, rec);
  ws.byId.set(rec.id, rec);
  return rec;
}

function walkService(ws, file, pkg, svc) {
  const fqn = joinFqn(pkg, svc.name);
  const rec = {
    id: `svc:${fqn}`,
    kind: "service",
    name: svc.name,
    fqn,
    package: pkg,
    fileId: file.id,
    filename: file.filename,
    comment: svc.comment,
    node: svc,
    methods: svc.methods.map((m) => ({
      name: m.name,
      requestType: m.requestType,
      responseType: m.responseType,
      clientStreaming: m.clientStreaming,
      serverStreaming: m.serverStreaming,
      comment: m.comment,
    })),
  };
  ws.types.set(fqn, rec);
  ws.byId.set(rec.id, rec);
  return rec;
}

function resolveRef(ws, fromPkg, fromParent, typeName) {
  if (!typeName || typeof typeName !== "string") return null;
  if (SCALAR_TYPES.has(typeName)) return { kind: "scalar", fqn: typeName };
  if (typeName.startsWith(".")) {
    const abs = typeName.slice(1);
    if (ws.types.has(abs)) return { kind: "type", fqn: abs };
    return { kind: "unresolved", fqn: abs };
  }

  // nested-relative then package-relative then absolute
  const candidates = [];
  if (fromParent) candidates.push(joinFqn(fromPkg, fromParent, typeName));
  if (fromPkg) {
    candidates.push(joinFqn(fromPkg, typeName));
    // walk up package segments
    const parts = fromPkg.split(".");
    for (let i = parts.length - 1; i >= 0; i--) {
      candidates.push(joinFqn(parts.slice(0, i).join("."), typeName));
    }
  }
  candidates.push(typeName);

  for (const c of candidates) {
    if (ws.types.has(c)) return { kind: "type", fqn: c };
  }
  return { kind: "unresolved", fqn: typeName };
}

function collectRefsFromType(typeRaw) {
  if (!typeRaw) return [];
  if (typeof typeRaw === "object" && typeRaw.kind === "map") {
    return [typeRaw.keyType, typeRaw.valueType].filter(Boolean);
  }
  return [String(typeRaw)];
}

export function rebuildIndex(ws) {
  ws.types.clear();
  ws.byId.clear();
  ws.searchIndex = [];

  for (const file of ws.files) {
    const pkg = file.ast.package || "";
    for (const msg of file.ast.messages) walkMessage(ws, file, pkg, "", msg);
    for (const en of file.ast.enums) walkEnum(ws, file, pkg, "", en);
    for (const svc of file.ast.services) walkService(ws, file, pkg, svc);
  }

  // resolve references + reverse edges
  for (const rec of ws.types.values()) {
    rec.refs = []; // outbound fqn refs
    rec.usedBy = [];
  }

  for (const rec of ws.types.values()) {
    const parentPath = rec.parentFqn
      ? rec.parentFqn.replace(rec.package ? rec.package + "." : "", "")
      : "";

    if (rec.kind === "message") {
      for (const f of rec.fields) {
        for (const tname of collectRefsFromType(f.typeRaw)) {
          if (SCALAR_TYPES.has(tname)) continue;
          if (typeof f.typeRaw === "object" && f.typeRaw.kind === "map") {
            // key is always scalar in valid proto; still resolve value
          }
          const resolved = resolveRef(ws, rec.package, parentPath || rec.name, tname);
          f.resolved = resolved;
          if (resolved?.kind === "type") {
            if (!rec.refs.includes(resolved.fqn)) rec.refs.push(resolved.fqn);
          }
        }
        // better map resolve
        if (f.isMap && f.typeRaw && typeof f.typeRaw === "object") {
          const vr = resolveRef(ws, rec.package, parentPath || rec.name, f.typeRaw.valueType);
          f.valueResolved = vr;
          if (vr?.kind === "type" && !rec.refs.includes(vr.fqn)) rec.refs.push(vr.fqn);
        }
      }
    }

    if (rec.kind === "service") {
      for (const m of rec.methods) {
        const req = resolveRef(ws, rec.package, "", m.requestType);
        const res = resolveRef(ws, rec.package, "", m.responseType);
        m.requestResolved = req;
        m.responseResolved = res;
        if (req?.kind === "type" && !rec.refs.includes(req.fqn)) rec.refs.push(req.fqn);
        if (res?.kind === "type" && !rec.refs.includes(res.fqn)) rec.refs.push(res.fqn);
      }
    }
  }

  for (const rec of ws.types.values()) {
    for (const ref of rec.refs) {
      const target = ws.types.get(ref);
      if (target && !target.usedBy.includes(rec.fqn)) target.usedBy.push(rec.fqn);
    }
  }

  // search index
  for (const rec of ws.types.values()) {
    ws.searchIndex.push({
      id: rec.id,
      kind: rec.kind,
      title: rec.name,
      subtitle: rec.fqn,
      haystack: [rec.name, rec.fqn, rec.comment || ""].join(" ").toLowerCase(),
    });
    if (rec.kind === "message") {
      for (const f of rec.fields) {
        ws.searchIndex.push({
          id: rec.id,
          kind: "field",
          title: f.name,
          subtitle: `${rec.fqn}.${f.name} : ${f.typeText}`,
          haystack: [f.name, f.typeText, f.comment || "", rec.fqn].join(" ").toLowerCase(),
          field: f.name,
        });
      }
    }
    if (rec.kind === "enum") {
      for (const v of rec.values) {
        ws.searchIndex.push({
          id: rec.id,
          kind: "enum_value",
          title: v.name,
          subtitle: `${rec.fqn}.${v.name} = ${v.number}`,
          haystack: [v.name, v.comment || "", rec.fqn].join(" ").toLowerCase(),
        });
      }
    }
    if (rec.kind === "service") {
      for (const m of rec.methods) {
        ws.searchIndex.push({
          id: rec.id,
          kind: "rpc",
          title: m.name,
          subtitle: `${rec.fqn}.${m.name}(${m.requestType}) → ${m.responseType}`,
          haystack: [m.name, m.requestType, m.responseType, m.comment || "", rec.fqn].join(" ").toLowerCase(),
          method: m.name,
        });
      }
    }
  }

  for (const file of ws.files) {
    ws.searchIndex.push({
      id: `file:${file.id}`,
      kind: "file",
      title: file.filename,
      subtitle: file.ast.package || "(no package)",
      haystack: [file.filename, file.ast.package || "", file.source.slice(0, 500)].join(" ").toLowerCase(),
      fileId: file.id,
    });
  }

  return ws;
}

export function addFile(ws, filename, source) {
  const ast = parseProto(source, filename);
  const id = `${filename}::${crypto.randomUUID?.() || String(Date.now())}`;
  // replace same filename
  ws.files = ws.files.filter((f) => f.filename !== filename);
  ws.files.push({ id, filename, source, ast, loadedAt: Date.now() });
  rebuildIndex(ws);
  return id;
}

export function removeAll(ws) {
  ws.files = [];
  rebuildIndex(ws);
}

export function getFile(ws, fileId) {
  return ws.files.find((f) => f.id === fileId);
}

export function searchWorkspace(ws, query, limit = 40) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const parts = q.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const item of ws.searchIndex) {
    let score = 0;
    if (item.title.toLowerCase() === q) score += 100;
    if (item.title.toLowerCase().startsWith(q)) score += 40;
    if (item.title.toLowerCase().includes(q)) score += 20;
    if (parts.every((p) => item.haystack.includes(p))) score += 10;
    else continue;
    if (item.kind === "message" || item.kind === "service" || item.kind === "enum") score += 5;
    scored.push({ ...item, score });
  }
  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return scored.slice(0, limit);
}

export function neighborhood(ws, fqn, depth = 1) {
  const center = ws.types.get(fqn);
  if (!center) return { nodes: [], edges: [] };
  const nodes = new Map();
  const edges = [];
  const add = (id, kind, label) => {
    if (!nodes.has(id)) nodes.set(id, { id, kind, label });
  };
  add(fqn, center.kind, center.name);

  const visit = (cur, d) => {
    if (d <= 0) return;
    const rec = ws.types.get(cur);
    if (!rec) return;
    for (const ref of rec.refs) {
      const t = ws.types.get(ref);
      if (!t) continue;
      add(ref, t.kind, t.name);
      edges.push({ from: cur, to: ref });
      visit(ref, d - 1);
    }
    for (const u of rec.usedBy) {
      const t = ws.types.get(u);
      if (!t) continue;
      add(u, t.kind, t.name);
      edges.push({ from: u, to: cur });
      visit(u, d - 1);
    }
  };
  visit(fqn, depth);
  return { nodes: [...nodes.values()], edges };
}

export function exportMarkdown(ws, rec) {
  const lines = [];
  lines.push(`# ${rec.name}`);
  lines.push("");
  lines.push(`\`${rec.fqn}\` · ${rec.kind} · \`${rec.filename}\``);
  lines.push("");
  if (rec.comment) {
    lines.push(rec.comment);
    lines.push("");
  }
  if (rec.kind === "message") {
    lines.push("| # | Field | Type | Label | Notes |");
    lines.push("|---|-------|------|-------|-------|");
    for (const f of rec.fields) {
      const notes = [f.oneof ? `oneof ${f.oneof}` : "", f.comment || ""].filter(Boolean).join(" — ");
      lines.push(`| ${f.number} | \`${f.name}\` | \`${f.typeText}\` | ${f.label || ""} | ${notes.replace(/\|/g, "/")} |`);
    }
  }
  if (rec.kind === "enum") {
    lines.push("| Value | Number | Notes |");
    lines.push("|-------|--------|-------|");
    for (const v of rec.values) {
      lines.push(`| \`${v.name}\` | ${v.number} | ${(v.comment || "").replace(/\|/g, "/")} |`);
    }
  }
  if (rec.kind === "service") {
    for (const m of rec.methods) {
      lines.push(`## RPC \`${m.name}\``);
      lines.push("");
      lines.push(`\`${m.clientStreaming ? "stream " : ""}${m.requestType}\` → \`${m.serverStreaming ? "stream " : ""}${m.responseType}\``);
      lines.push("");
      if (m.comment) {
        lines.push(m.comment);
        lines.push("");
      }
    }
  }
  return lines.join("\n");
}

export function packagesOverview(ws) {
  const pkgs = new Map();
  for (const rec of ws.types.values()) {
    const pkg = rec.package || "(default)";
    if (!pkgs.has(pkg)) pkgs.set(pkg, { messages: 0, enums: 0, services: 0 });
    const p = pkgs.get(pkg);
    if (rec.kind === "message") p.messages++;
    if (rec.kind === "enum") p.enums++;
    if (rec.kind === "service") p.services++;
  }
  return pkgs;
}
