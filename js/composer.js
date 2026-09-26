/**
 * Visual protobuf composer → emits .proto source.
 */

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "className") node.className = v;
    else if (k === "on") {
      for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn);
    } else if (k === "value" && (tag === "input" || tag === "textarea" || tag === "select")) {
      node.value = v;
    } else if (v != null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

const SCALAR_OPTS = [
  "string", "bool", "int32", "int64", "uint32", "uint64", "float", "double", "bytes",
  "sint32", "sint64", "fixed32", "fixed64", "sfixed32", "sfixed64",
];

export function mountComposer(root, { onPreview } = {}) {
  const state = {
    enums: [],
    messages: [],
    rpcs: [],
  };

  const enumsEl = root.querySelector("#compose-enums");
  const messagesEl = root.querySelector("#compose-messages");
  const rpcsEl = root.querySelector("#compose-rpcs");
  const form = root.closest("form") || root;

  function bump() {
    onPreview?.(emitProto(form, state));
  }

  function addEnum(data = { name: "", values: [{ name: "UNSPECIFIED", number: 0 }] }) {
    state.enums.push(data);
    renderEnums();
    bump();
  }

  function addMessage(data = { name: "", fields: [{ type: "string", name: "", number: 1, label: "" }] }) {
    state.messages.push(data);
    renderMessages();
    bump();
  }

  function addRpc(data = { name: "", request: "", response: "" }) {
    state.rpcs.push(data);
    renderRpcs();
    bump();
  }

  function renderEnums() {
    enumsEl.innerHTML = "";
    state.enums.forEach((en, ei) => {
      const block = el("div", { className: "compose-block" });
      const head = el("div", { className: "compose-block-head" });
      const nameIn = el("input", {
        type: "text",
        placeholder: "EnumName",
        value: en.name,
        on: {
          input: () => {
            en.name = nameIn.value;
            bump();
          },
        },
      });
      head.append(
        nameIn,
        el("button", {
          type: "button",
          className: "btn tiny ghost",
          on: {
            click: () => {
              en.values.push({ name: "", number: en.values.length });
              renderEnums();
              bump();
            },
          },
        }, "+ value"),
        el("button", {
          type: "button",
          className: "btn tiny ghost",
          on: {
            click: () => {
              state.enums.splice(ei, 1);
              renderEnums();
              bump();
            },
          },
        }, "Remove"),
      );
      block.append(head);
      en.values.forEach((v, vi) => {
        const row = el("div", { className: "compose-row" });
        const n = el("input", {
          type: "text",
          placeholder: "VALUE_NAME",
          value: v.name,
          on: { input: () => { v.name = n.value; bump(); } },
        });
        const num = el("input", {
          type: "number",
          value: String(v.number),
          on: { input: () => { v.number = Number(num.value); bump(); } },
        });
        row.append(
          n,
          num,
          el("span"),
          el("button", {
            type: "button",
            className: "btn tiny ghost",
            on: {
              click: () => {
                en.values.splice(vi, 1);
                renderEnums();
                bump();
              },
            },
          }, "×"),
        );
        block.append(row);
      });
      enumsEl.append(block);
    });
  }

  function typeChoices() {
    const custom = [
      ...state.messages.map((m) => m.name).filter(Boolean),
      ...state.enums.map((e) => e.name).filter(Boolean),
    ];
    return [...SCALAR_OPTS, ...custom];
  }

  function renderMessages() {
    messagesEl.innerHTML = "";
    state.messages.forEach((msg, mi) => {
      const block = el("div", { className: "compose-block" });
      const head = el("div", { className: "compose-block-head" });
      const nameIn = el("input", {
        type: "text",
        placeholder: "MessageName",
        value: msg.name,
        on: { input: () => { msg.name = nameIn.value; bump(); } },
      });
      head.append(
        nameIn,
        el("button", {
          type: "button",
          className: "btn tiny ghost",
          on: {
            click: () => {
              const next = (msg.fields.at(-1)?.number || 0) + 1;
              msg.fields.push({ type: "string", name: "", number: next, label: "" });
              renderMessages();
              bump();
            },
          },
        }, "+ field"),
        el("button", {
          type: "button",
          className: "btn tiny ghost",
          on: {
            click: () => {
              state.messages.splice(mi, 1);
              renderMessages();
              bump();
            },
          },
        }, "Remove"),
      );
      block.append(head);

      msg.fields.forEach((f, fi) => {
        const row = el("div", { className: "compose-row" });
        const typeSel = el("select", {
          on: { change: () => { f.type = typeSel.value; bump(); } },
        });
        for (const t of typeChoices()) {
          const opt = el("option", { value: t }, t);
          if (t === f.type) opt.selected = true;
          typeSel.append(opt);
        }
        const labelSel = el("select", {
          on: { change: () => { f.label = labelSel.value; bump(); } },
        });
        for (const l of ["", "optional", "repeated"]) {
          const opt = el("option", { value: l }, l || "singular");
          if (l === (f.label || "")) opt.selected = true;
          labelSel.append(opt);
        }
        const n = el("input", {
          type: "text",
          placeholder: "field_name",
          value: f.name,
          on: { input: () => { f.name = n.value; bump(); } },
        });
        const num = el("input", {
          type: "number",
          value: String(f.number),
          on: { input: () => { f.number = Number(num.value); bump(); } },
        });
        row.append(
          typeSel,
          n,
          num,
          el("button", {
            type: "button",
            className: "btn tiny ghost",
            on: {
              click: () => {
                msg.fields.splice(fi, 1);
                renderMessages();
                bump();
              },
            },
          }, "×"),
        );
        // label on second visual row via prepend — keep compact: insert label as title
        labelSel.title = "label";
        row.insertBefore(labelSel, n);
        row.style.gridTemplateColumns = "0.9fr 0.8fr 1fr 0.55fr auto";
        block.append(row);
      });
      messagesEl.append(block);
    });
  }

  function renderRpcs() {
    rpcsEl.innerHTML = "";
    state.rpcs.forEach((rpc, ri) => {
      const row = el("div", { className: "compose-row" });
      row.style.gridTemplateColumns = "1fr 1fr 1fr auto";
      const name = el("input", {
        type: "text",
        placeholder: "MethodName",
        value: rpc.name,
        on: { input: () => { rpc.name = name.value; bump(); } },
      });
      const req = el("input", {
        type: "text",
        placeholder: "RequestType",
        value: rpc.request,
        list: "compose-type-list",
        on: { input: () => { rpc.request = req.value; bump(); } },
      });
      const res = el("input", {
        type: "text",
        placeholder: "ResponseType",
        value: rpc.response,
        on: { input: () => { rpc.response = res.value; bump(); } },
      });
      row.append(
        name,
        req,
        res,
        el("button", {
          type: "button",
          className: "btn tiny ghost",
          on: {
            click: () => {
              state.rpcs.splice(ri, 1);
              renderRpcs();
              bump();
            },
          },
        }, "×"),
      );
      rpcsEl.append(row);
    });
  }

  root.querySelector("#add-enum")?.addEventListener("click", () => addEnum());
  root.querySelector("#add-message")?.addEventListener("click", () => addMessage());
  root.querySelector("#add-rpc")?.addEventListener("click", () => addRpc());

  form.addEventListener("input", () => bump());
  form.addEventListener("change", () => bump());

  // seed one message for friendliness
  if (state.messages.length === 0) {
    addMessage({
      name: "Example",
      fields: [
        { type: "string", name: "id", number: 1, label: "" },
        { type: "string", name: "name", number: 2, label: "" },
      ],
    });
  } else {
    renderEnums();
    renderMessages();
    renderRpcs();
    bump();
  }

  return {
    getState: () => state,
    emit: () => emitProto(form, state),
    reset() {
      state.enums = [];
      state.messages = [];
      state.rpcs = [];
      addMessage({
        name: "Example",
        fields: [
          { type: "string", name: "id", number: 1, label: "" },
          { type: "string", name: "name", number: 2, label: "" },
        ],
      });
    },
  };
}

export function emitProto(form, state) {
  const fd = new FormData(form);
  const syntax = fd.get("syntax") || "proto3";
  const pkg = String(fd.get("package") || "").trim();
  const javaPkg = String(fd.get("java_package") || "").trim();
  const service = String(fd.get("service") || "").trim();

  const lines = [];
  lines.push(`syntax = "${syntax}";`);
  lines.push("");
  if (pkg) {
    lines.push(`package ${pkg};`);
    lines.push("");
  }
  if (javaPkg) {
    lines.push(`option java_package = "${javaPkg}";`);
    lines.push("option java_multiple_files = true;");
    lines.push("");
  }

  for (const en of state.enums) {
    if (!en.name) continue;
    lines.push(`enum ${en.name} {`);
    for (const v of en.values) {
      if (!v.name) continue;
      lines.push(`  ${v.name} = ${Number(v.number) || 0};`);
    }
    lines.push("}");
    lines.push("");
  }

  for (const msg of state.messages) {
    if (!msg.name) continue;
    lines.push(`message ${msg.name} {`);
    for (const f of msg.fields) {
      if (!f.name || !f.type) continue;
      const label = f.label ? f.label + " " : "";
      lines.push(`  ${label}${f.type} ${f.name} = ${Number(f.number) || 1};`);
    }
    lines.push("}");
    lines.push("");
  }

  if (service && state.rpcs.some((r) => r.name)) {
    lines.push(`service ${service} {`);
    for (const r of state.rpcs) {
      if (!r.name) continue;
      const req = r.request || "google.protobuf.Empty";
      const res = r.response || "google.protobuf.Empty";
      lines.push(`  rpc ${r.name}(${req}) returns (${res});`);
    }
    lines.push("}");
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}
