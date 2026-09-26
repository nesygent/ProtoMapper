import {
  createWorkspace,
  addFile,
  removeAll,
  searchWorkspace,
  neighborhood,
  exportMarkdown,
  getFile,
} from "./model.js";
import { highlightProto, escapeHtml } from "./highlight.js";
import { exampleForMessage, exampleForRpc } from "./examples.js";
import { mountComposer } from "./composer.js";

const THEME_KEY = "protomap-theme";
const RECENTS_KEY = "protomap-recents";

const ws = createWorkspace();
let currentId = null; // type id or file:id
let currentView = "structured"; // structured | source | graph | json
let treeMode = "types";
let searchActive = 0;

const $ = (sel, root = document) => root.querySelector(sel);
const app = $("#app");

function toast(msg, kind = "") {
  const host = $("#toast-host");
  const t = document.createElement("div");
  t.className = "toast" + (kind ? ` ${kind}` : "");
  t.textContent = msg;
  host.append(t);
  setTimeout(() => t.remove(), 2800);
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  // Default to light (Google White) for brand tone
  if (saved) setTheme(saved);
  else setTheme("light");
}

function saveRecentMeta() {
  const meta = ws.files.map((f) => ({
    filename: f.filename,
    package: f.ast.package,
    at: f.loadedAt,
  }));
  localStorage.setItem(RECENTS_KEY, JSON.stringify(meta.slice(-20)));
}

function enterWorkspace() {
  if (!location.hash.startsWith("#/viewer")) {
    location.hash = "#/viewer";
  }
  app.dataset.mode = "workspace";
  $("#welcome").hidden = true;
  $("#main").hidden = false;
  $("#inspector").hidden = false;
  renderTree();
  updateStats();
}

function exitWorkspace() {
  app.dataset.mode = "welcome";
  $("#welcome").hidden = false;
  $("#main").hidden = true;
  currentId = null;
}

async function loadTexts(files) {
  // files: [{filename, source}]
  let loaded = 0;
  for (const f of files) {
    if (!f.filename || f.source == null) continue;
    addFile(ws, f.filename, f.source);
    loaded++;
  }
  if (!loaded) {
    toast("No .proto content loaded", "error");
    return;
  }
  saveRecentMeta();
  enterWorkspace();
  const errors = ws.files.flatMap((f) => (f.ast.errors || []).map((e) => `${f.filename}: ${e}`));
  if (errors.length) toast(`Loaded with ${errors.length} parse warning(s)`);
  else toast(`Loaded ${loaded} file${loaded === 1 ? "" : "s"}`);

  // select first service or message
  const prefer =
    [...ws.types.values()].find((t) => t.kind === "service") ||
    [...ws.types.values()].find((t) => t.kind === "message");
  if (prefer) selectType(prefer.id);
  else renderStage();
}

async function readFileList(fileList) {
  const out = [];
  for (const file of fileList) {
    if (!file.name.endsWith(".proto") && file.type && !file.type.includes("text")) continue;
    const source = await file.text();
    out.push({ filename: file.name, source });
  }
  // if none matched extension, still try
  if (!out.length) {
    for (const file of fileList) {
      const source = await file.text();
      out.push({ filename: file.name.endsWith(".proto") ? file.name : file.name + ".proto", source });
    }
  }
  return out;
}

/* ——— Tree ——— */
function renderTree() {
  const root = $("#tree-root");
  const filter = ($("#tree-filter").value || "").toLowerCase().trim();
  root.innerHTML = "";

  if (treeMode === "files") {
    for (const file of ws.files) {
      if (filter && !file.filename.toLowerCase().includes(filter) && !(file.ast.package || "").toLowerCase().includes(filter)) continue;
      const btn = treeItem("file", file.filename, `file:${file.id}`, file.ast.package || "");
      root.append(btn);
    }
    return;
  }

  if (treeMode === "services") {
    const svcs = [...ws.types.values()].filter((t) => t.kind === "service").sort((a, b) => a.fqn.localeCompare(b.fqn));
    for (const s of svcs) {
      if (filter && !s.fqn.toLowerCase().includes(filter)) continue;
      root.append(treeItem("svc", s.name, s.id, s.package));
    }
    return;
  }

  // types by package
  const byPkg = new Map();
  for (const t of ws.types.values()) {
    if (t.kind === "service") continue;
    if (t.parentFqn) continue; // nest under parent in detail; show top-level in tree
    const pkg = t.package || "(default)";
    if (!byPkg.has(pkg)) byPkg.set(pkg, []);
    byPkg.get(pkg).push(t);
  }

  const pkgs = [...byPkg.keys()].sort();
  for (const pkg of pkgs) {
    const items = byPkg.get(pkg).sort((a, b) => a.name.localeCompare(b.name));
    const visible = items.filter((t) => !filter || t.fqn.toLowerCase().includes(filter) || (t.comment || "").toLowerCase().includes(filter));
    if (!visible.length) continue;
    const group = document.createElement("div");
    group.className = "tree-group";
    const label = document.createElement("button");
    label.type = "button";
    label.className = "tree-group-label";
    label.textContent = pkg;
    group.append(label);
    for (const t of visible) {
      group.append(treeItem(t.kind === "enum" ? "enm" : "msg", t.name, t.id, t.kind));
    }
    root.append(group);
  }
}

function treeItem(kind, label, id, title = "") {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tree-item" + (currentId === id ? " active" : "");
  btn.dataset.id = id;
  btn.title = title;
  btn.innerHTML = `<span class="kind ${kind}">${kind}</span><span class="label"></span>`;
  btn.querySelector(".label").textContent = label;
  btn.addEventListener("click", () => selectType(id));
  return btn;
}

function updateStats() {
  const msgs = [...ws.types.values()].filter((t) => t.kind === "message").length;
  const enms = [...ws.types.values()].filter((t) => t.kind === "enum").length;
  const svcs = [...ws.types.values()].filter((t) => t.kind === "service").length;
  $("#stats-label").textContent = `${ws.files.length} files · ${msgs} msg · ${enms} enum · ${svcs} svc`;
}

/* ——— Selection & stage ——— */
function selectType(id) {
  currentId = id;
  $("#stage-toolbar").hidden = false;
  renderTree();
  renderStage();
  renderInspector();
}

function getSelection() {
  if (!currentId) return null;
  if (currentId.startsWith("file:")) {
    const fileId = currentId.slice(5);
    const file = getFile(ws, fileId);
    return file ? { kind: "file", file } : null;
  }
  return ws.byId.get(currentId) || null;
}

function renderStage() {
  const body = $("#stage-body");
  const sel = getSelection();
  if (!sel) {
    body.innerHTML = `<div class="empty-stage"><p>Select a message, enum, or service from the tree — or search with <kbd>/</kbd>.</p></div>`;
    $("#stage-toolbar").hidden = true;
    return;
  }

  // view toggles
  for (const btn of document.querySelectorAll("[data-view]")) {
    btn.classList.toggle("active", btn.dataset.view === currentView);
  }

  if (sel.kind === "file") {
    $("#crumb").innerHTML = `<strong>${escapeHtml(sel.file.filename)}</strong>`;
    body.innerHTML = renderFileView(sel.file);
    bindTypeLinks(body);
    return;
  }

  $("#crumb").innerHTML = `${escapeHtml(sel.kind)} · <strong>${escapeHtml(sel.fqn)}</strong>`;

  if (currentView === "source") {
    const file = getFile(ws, sel.fileId);
    body.innerHTML = `<pre class="code-block">${highlightProto(file?.source || "")}</pre>`;
    return;
  }
  if (currentView === "graph") {
    body.innerHTML = renderGraph(sel);
    bindGraph(body, sel);
    return;
  }
  if (currentView === "json") {
    body.innerHTML = renderJsonView(sel);
    bindJson(body, sel);
    return;
  }

  // structured
  let html = "";
  if (sel.file && (getFile(ws, sel.fileId)?.ast.errors || []).length) {
    // n/a
  }
  const file = getFile(ws, sel.fileId);
  if (file?.ast.errors?.length) {
    html += `<div class="parse-errors">${file.ast.errors.map(escapeHtml).join("<br>")}</div>`;
  }

  if (sel.kind === "message") html += renderMessage(sel);
  else if (sel.kind === "enum") html += renderEnum(sel);
  else if (sel.kind === "service") html += renderService(sel);

  body.innerHTML = html;
  bindTypeLinks(body);
}

function renderFileView(file) {
  const msgs = file.ast.messages.map((m) => m.name).join(", ") || "—";
  const svcs = file.ast.services.map((s) => s.name).join(", ") || "—";
  const enms = file.ast.enums.map((e) => e.name).join(", ") || "—";
  const imports = file.ast.imports.length
    ? `<ul class="muted">${file.ast.imports.map((i) => `<li><code>${escapeHtml(i.path)}</code>${i.public ? " (public)" : ""}</li>`).join("")}</ul>`
    : `<p class="muted">None</p>`;
  const opts = file.ast.options.length
    ? `<ul class="muted">${file.ast.options.map((o) => `<li><code>${escapeHtml(o.name)}</code> = ${escapeHtml(JSON.stringify(o.value?.value ?? o.value))}</li>`).join("")}</ul>`
    : `<p class="muted">None</p>`;
  const errs = file.ast.errors?.length
    ? `<div class="parse-errors">${file.ast.errors.map(escapeHtml).join("<br>")}</div>`
    : `<p class="muted">Parse: clean</p>`;
  return `
    ${errs}
    <div class="detail-header">
      <div class="detail-kind">File</div>
      <h2 class="detail-title">${escapeHtml(file.filename)}</h2>
      <div class="detail-meta">package ${escapeHtml(file.ast.package || "(none)")} · syntax ${escapeHtml(file.ast.syntax)}</div>
    </div>
    <h3 class="section-title">Contents</h3>
    <p class="muted">Messages: ${escapeHtml(msgs)}</p>
    <p class="muted">Enums: ${escapeHtml(enms)}</p>
    <p class="muted">Services: ${escapeHtml(svcs)}</p>
    <h3 class="section-title">Imports</h3>
    ${imports}
    <h3 class="section-title">Options</h3>
    ${opts}
    <h3 class="section-title">Source</h3>
    <pre class="code-block">${highlightProto(file.source)}</pre>
  `;
}

function renderMessage(sel) {
  const rows = sel.fields.map((f) => {
    const typeBtn = typeLinkHtml(f.resolved?.kind === "type" ? f.resolved.fqn : null, f.typeText);
    const path = `${sel.fqn}.${f.name}`;
    return `<tr>
      <td class="field-num">${f.number}</td>
      <td>
        <button type="button" class="type-link field-name copy-path" data-path="${escapeHtml(path)}" title="Copy field path">${escapeHtml(f.name)}</button>
        ${f.comment ? `<span class="field-comment">${escapeHtml(f.comment)}</span>` : ""}
      </td>
      <td>${typeBtn}</td>
      <td>${f.label ? `<span class="field-label-pill">${escapeHtml(f.label)}</span>` : ""}${f.oneof ? ` <span class="field-label-pill">oneof ${escapeHtml(f.oneof)}</span>` : ""}</td>
    </tr>`;
  }).join("");

  const nested = (sel.nested || [])
    .map((fqn) => {
      const t = ws.types.get(fqn);
      if (!t) return "";
      return `<button type="button" class="chip type-nav" data-fqn="${escapeHtml(fqn)}">${escapeHtml(t.kind)} ${escapeHtml(t.name)}</button>`;
    })
    .join("");

  return `
    <div class="detail-header">
      <div class="detail-kind">Message</div>
      <h2 class="detail-title">${escapeHtml(sel.name)}</h2>
      <div class="detail-meta">${escapeHtml(sel.fqn)} · ${escapeHtml(sel.filename)}</div>
      ${sel.comment ? `<p class="detail-comment">${escapeHtml(sel.comment)}</p>` : ""}
    </div>
    <table class="field-table">
      <thead><tr><th>#</th><th>Field</th><th>Type</th><th>Label</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="4" class="muted">No fields</td></tr>`}</tbody>
    </table>
    ${nested ? `<h3 class="section-title">Nested types</h3><div class="chip-list">${nested}</div>` : ""}
  `;
}

function renderEnum(sel) {
  const rows = sel.values.map((v) => `<tr>
    <td class="field-name">${escapeHtml(v.name)}</td>
    <td class="field-num">${v.number}</td>
    <td>${v.comment ? escapeHtml(v.comment) : ""}</td>
  </tr>`).join("");
  return `
    <div class="detail-header">
      <div class="detail-kind">Enum</div>
      <h2 class="detail-title">${escapeHtml(sel.name)}</h2>
      <div class="detail-meta">${escapeHtml(sel.fqn)} · ${escapeHtml(sel.filename)}</div>
      ${sel.comment ? `<p class="detail-comment">${escapeHtml(sel.comment)}</p>` : ""}
    </div>
    <table class="field-table">
      <thead><tr><th>Value</th><th>Number</th><th>Notes</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderService(sel) {
  const cards = sel.methods.map((m) => {
    const req = typeLinkHtml(m.requestResolved?.kind === "type" ? m.requestResolved.fqn : null, m.requestType);
    const res = typeLinkHtml(m.responseResolved?.kind === "type" ? m.responseResolved.fqn : null, m.responseType);
    const streamIn = m.clientStreaming ? `<span class="field-label-pill">stream</span> ` : "";
    const streamOut = m.serverStreaming ? `<span class="field-label-pill">stream</span> ` : "";
    return `<article class="rpc-card" data-method="${escapeHtml(m.name)}">
      <h3 class="rpc-name">${escapeHtml(m.name)}</h3>
      <div class="rpc-sig">${streamIn}${req} <span>→</span> ${streamOut}${res}</div>
      ${m.comment ? `<p class="rpc-comment">${escapeHtml(m.comment)}</p>` : ""}
      <div style="margin-top:0.5rem">
        <button type="button" class="btn tiny secondary rpc-example" data-method="${escapeHtml(m.name)}">JSON examples</button>
      </div>
    </article>`;
  }).join("");

  return `
    <div class="detail-header">
      <div class="detail-kind">Service</div>
      <h2 class="detail-title">${escapeHtml(sel.name)}</h2>
      <div class="detail-meta">${escapeHtml(sel.fqn)} · ${escapeHtml(sel.filename)} · ${sel.methods.length} RPCs</div>
      ${sel.comment ? `<p class="detail-comment">${escapeHtml(sel.comment)}</p>` : ""}
    </div>
    <div class="rpc-list">${cards}</div>
  `;
}

function typeLinkHtml(fqn, text) {
  if (fqn && ws.types.has(fqn)) {
    return `<button type="button" class="type-link" data-fqn="${escapeHtml(fqn)}">${escapeHtml(text)}</button>`;
  }
  return `<span class="mono">${escapeHtml(text)}</span>`;
}

function bindTypeLinks(root) {
  root.querySelectorAll("[data-fqn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const rec = ws.types.get(btn.dataset.fqn);
      if (rec) selectType(rec.id);
    });
  });
  root.querySelectorAll(".copy-path").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(btn.dataset.path);
      toast("Copied field path");
    });
  });
  root.querySelectorAll(".rpc-example").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentView = "json";
      renderStage();
      // stash method focus
      const body = $("#stage-body");
      const sel = getSelection();
      if (sel?.kind === "service") {
        const ex = exampleForRpc(ws, sel.fqn, btn.dataset.method);
        body.innerHTML = renderJsonRpc(sel, ex, btn.dataset.method);
        bindJson(body, sel);
      }
    });
  });
}

function renderGraph(sel) {
  const { nodes, edges } = neighborhood(ws, sel.fqn, 1);
  const w = Math.max(480, nodes.length * 140);
  const h = 320;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.32;
  const pos = new Map();
  nodes.forEach((n, i) => {
    if (n.id === sel.fqn) pos.set(n.id, { x: cx, y: cy });
    else {
      const others = nodes.filter((x) => x.id !== sel.fqn);
      const idx = others.findIndex((x) => x.id === n.id);
      const a = (Math.PI * 2 * idx) / Math.max(others.length, 1) - Math.PI / 2;
      pos.set(n.id, { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
  });

  const edgeEls = edges.map((e) => {
    const a = pos.get(e.from);
    const b = pos.get(e.to);
    if (!a || !b) return "";
    return `<path class="graph-edge" d="M${a.x},${a.y} L${b.x},${b.y}" />`;
  }).join("");

  const nodeEls = nodes.map((n) => {
    const p = pos.get(n.id);
    const label = n.label.length > 18 ? n.label.slice(0, 16) + "…" : n.label;
    const active = n.id === sel.fqn ? " active" : "";
    return `<g class="graph-node ${n.kind}${active}" data-fqn="${escapeHtml(n.id)}" transform="translate(${p.x},${p.y})">
      <rect x="-70" y="-16" width="140" height="32"></rect>
      <text text-anchor="middle" dominant-baseline="middle">${escapeHtml(label)}</text>
    </g>`;
  }).join("");

  return `
    <p class="muted" style="margin-top:0">1-hop type neighborhood — click a node to navigate.</p>
    <div class="graph-wrap">
      <svg class="graph-svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" opacity="0.35"/>
          </marker>
        </defs>
        ${edgeEls}${nodeEls}
      </svg>
    </div>
  `;
}

function bindGraph(root) {
  root.querySelectorAll(".graph-node").forEach((g) => {
    g.addEventListener("click", () => {
      const rec = ws.types.get(g.dataset.fqn);
      if (rec) selectType(rec.id);
    });
  });
}

function renderJsonView(sel) {
  if (sel.kind === "message") {
    const ex = exampleForMessage(ws, sel.fqn);
    return `
      <div class="json-toolbar">
        <button type="button" class="btn tiny secondary" id="copy-json">Copy JSON</button>
        <button type="button" class="btn tiny ghost" id="copy-grpcurl">Copy grpcurl hint</button>
      </div>
      <p class="muted">Sample payload for <code>${escapeHtml(sel.fqn)}</code> (heuristic — not a wire encode).</p>
      <pre class="json-block" id="json-out">${escapeHtml(JSON.stringify(ex, null, 2))}</pre>
    `;
  }
  if (sel.kind === "service") {
    const first = sel.methods[0];
    const ex = first ? exampleForRpc(ws, sel.fqn, first.name) : null;
    return renderJsonRpc(sel, ex, first?.name);
  }
  return `<p class="muted">JSON examples are available for messages and service RPCs.</p>`;
}

function renderJsonRpc(sel, ex, method) {
  const methods = sel.methods.map((m) =>
    `<button type="button" class="btn tiny ${m.name === method ? "active" : "ghost"} rpc-pick" data-method="${escapeHtml(m.name)}">${escapeHtml(m.name)}</button>`
  ).join("");
  return `
    <div class="json-toolbar">${methods}
      <button type="button" class="btn tiny secondary" id="copy-json">Copy request</button>
    </div>
    <pre class="json-block" id="json-out">${escapeHtml(JSON.stringify(ex, null, 2))}</pre>
  `;
}

function bindJson(root, sel) {
  root.querySelector("#copy-json")?.addEventListener("click", async () => {
    const text = root.querySelector("#json-out")?.textContent || "";
    await navigator.clipboard.writeText(text);
    toast("Copied JSON");
  });
  root.querySelector("#copy-grpcurl")?.addEventListener("click", async () => {
    const payload = root.querySelector("#json-out")?.textContent || "{}";
    const hint = `# grpcurl-style hint\ngrpcurl -d '${payload.replace(/'/g, `'\\''`)}' \\\n  localhost:50051 ${sel.fqn}`;
    await navigator.clipboard.writeText(hint);
    toast("Copied grpcurl hint");
  });
  root.querySelectorAll(".rpc-pick").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ex = exampleForRpc(ws, sel.fqn, btn.dataset.method);
      root.innerHTML = renderJsonRpc(sel, ex, btn.dataset.method);
      bindJson(root, sel);
    });
  });
}

function renderInspector() {
  const body = $("#inspector-body");
  const sel = getSelection();
  if (!sel || sel.kind === "file") {
    body.innerHTML = `<p class="muted">Select a type to see references and dependents.</p>`;
    return;
  }
  const refs = (sel.refs || []).map((fqn) => {
    const t = ws.types.get(fqn);
    return `<button type="button" class="chip" data-fqn="${escapeHtml(fqn)}">${escapeHtml(t?.name || fqn)}</button>`;
  }).join("") || `<p class="muted">None</p>`;

  const used = (sel.usedBy || []).map((fqn) => {
    const t = ws.types.get(fqn);
    return `<button type="button" class="chip" data-fqn="${escapeHtml(fqn)}">${escapeHtml(t?.name || fqn)}</button>`;
  }).join("") || `<p class="muted">None</p>`;

  body.innerHTML = `
    <div class="inspector-block"><h3>References</h3><div class="chip-list">${refs}</div></div>
    <div class="inspector-block"><h3>Used by</h3><div class="chip-list">${used}</div></div>
    <div class="inspector-block"><h3>File</h3><p class="muted mono">${escapeHtml(sel.filename)}</p></div>
  `;
  bindTypeLinks(body);
}

/* ——— Search ——— */
function openSearch() {
  const dlg = $("#modal-search");
  dlg.showModal();
  const input = $("#search-input");
  input.value = "";
  $("#search-results").innerHTML = "";
  searchActive = 0;
  input.focus();
}

function renderSearch(q) {
  const results = searchWorkspace(ws, q);
  const box = $("#search-results");
  if (!q.trim()) {
    box.innerHTML = `<p class="muted" style="padding:0.5rem">Type to search across types, fields, RPCs, and comments.</p>`;
    return;
  }
  if (!results.length) {
    box.innerHTML = `<p class="muted" style="padding:0.5rem">No matches.</p>`;
    return;
  }
  box.innerHTML = results.map((r, i) => `
    <button type="button" class="search-hit${i === searchActive ? " active" : ""}" role="option" data-idx="${i}" data-id="${escapeHtml(r.id)}" data-file="${escapeHtml(r.fileId || "")}">
      <span class="hit-title">${escapeHtml(r.title)} <span class="muted">${escapeHtml(r.kind)}</span></span>
      <span class="hit-sub">${escapeHtml(r.subtitle)}</span>
    </button>
  `).join("");

  box.querySelectorAll(".search-hit").forEach((btn) => {
    btn.addEventListener("click", () => activateSearchHit(btn));
  });
}

function activateSearchHit(btn) {
  const id = btn.dataset.id;
  if (id.startsWith("file:")) selectType(id);
  else selectType(id);
  $("#modal-search").close();
}

/* ——— Composer ——— */
let composerApi = null;

function openCompose() {
  const dlg = $("#modal-compose");
  if (!composerApi) {
    composerApi = mountComposer($("#form-compose"), {
      onPreview(src) {
        $("#compose-preview").textContent = src;
      },
    });
  }
  dlg.showModal();
}

/* ——— Events ——— */
function wireUi() {
  initTheme();

  $("#btn-home")?.addEventListener("click", () => {
    // Brand returns to viewer welcome (clear selection UI)
    if (location.hash.startsWith("#/viewer")) {
      exitWorkspace();
    }
  });

  const openFiles = () => $("#file-input").click();
  $("#welcome-open").addEventListener("click", openFiles);
  $("#btn-open")?.addEventListener("click", openFiles);
  $("#file-input").addEventListener("change", async (e) => {
    const files = await readFileList([...e.target.files]);
    e.target.value = "";
    await loadTexts(files);
  });

  // drag drop
  const dz = $("#dropzone");
  const onDrag = (e) => {
    e.preventDefault();
    app.classList.add("dragging");
    dz.classList.add("dragover");
  };
  const onDragEnd = () => {
    app.classList.remove("dragging");
    dz.classList.remove("dragover");
  };
  ["dragenter", "dragover"].forEach((ev) => {
    window.addEventListener(ev, onDrag);
    dz.addEventListener(ev, onDrag);
  });
  ["dragleave", "drop"].forEach((ev) => {
    window.addEventListener(ev, (e) => {
      if (ev === "drop") return;
      onDragEnd();
    });
  });
  window.addEventListener("drop", async (e) => {
    e.preventDefault();
    onDragEnd();
    if (!location.hash.startsWith("#/viewer")) return;
    if (!e.dataTransfer?.files?.length) return;
    const files = await readFileList([...e.dataTransfer.files]);
    await loadTexts(files);
  });
  dz.addEventListener("click", openFiles);
  dz.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openFiles();
    }
  });

  // paste modal
  const openPaste = () => {
    $("#modal-paste").showModal();
    $("#form-paste").querySelector("textarea").focus();
  };
  $("#welcome-paste").addEventListener("click", openPaste);
  $("#btn-paste")?.addEventListener("click", openPaste);
  $("#form-paste").addEventListener("submit", async (e) => {
    const submitter = e.submitter;
    if (submitter?.value === "cancel") return;
    e.preventDefault();
    const fd = new FormData(e.target);
    const source = String(fd.get("source") || "");
    const filename = String(fd.get("filename") || "pasted.proto").trim() || "pasted.proto";
    $("#modal-paste").close();
    e.target.reset();
    await loadTexts([{ filename, source }]);
  });

  // fetch modal
  const openFetch = () => $("#modal-fetch").showModal();
  $("#welcome-url").addEventListener("click", openFetch);
  $("#btn-fetch")?.addEventListener("click", openFetch);
  $("#form-fetch").addEventListener("submit", async (e) => {
    const submitter = e.submitter;
    if (submitter?.value === "cancel") return;
    e.preventDefault();
    const fd = new FormData(e.target);
    const url = String(fd.get("url") || "").trim();
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const source = await res.text();
      let filename = url.split("?")[0].split("/").pop() || "remote.proto";
      if (!filename.endsWith(".proto")) filename += ".proto";
      $("#modal-fetch").close();
      e.target.reset();
      await loadTexts([{ filename, source }]);
    } catch (err) {
      toast(`Fetch failed: ${err.message}`, "error");
    }
  });

  // compose
  $("#welcome-compose").addEventListener("click", openCompose);
  $("#btn-compose")?.addEventListener("click", openCompose);
  $("#form-compose").addEventListener("submit", async (e) => {
    const submitter = e.submitter;
    if (submitter?.value === "cancel") return;
    e.preventDefault();
    const src = composerApi?.emit() || "";
    const fd = new FormData(e.target);
    const filename = String(fd.get("filename") || "composed.proto").trim() || "composed.proto";
    $("#modal-compose").close();
    await loadTexts([{ filename, source: src }]);
  });
  $("#compose-download")?.addEventListener("click", () => {
    const src = composerApi?.emit() || "";
    const fd = new FormData($("#form-compose"));
    const filename = String(fd.get("filename") || "composed.proto").trim() || "composed.proto";
    downloadText(filename, src);
    toast("Download started");
  });

  // search
  $("#btn-search")?.addEventListener("click", openSearch);
  $("#search-close").addEventListener("click", () => $("#modal-search").close());
  $("#search-input").addEventListener("input", (e) => {
    searchActive = 0;
    renderSearch(e.target.value);
  });
  $("#search-input").addEventListener("keydown", (e) => {
    const hits = [...$("#search-results").querySelectorAll(".search-hit")];
    if (e.key === "ArrowDown") {
      e.preventDefault();
      searchActive = Math.min(searchActive + 1, hits.length - 1);
      hits.forEach((h, i) => h.classList.toggle("active", i === searchActive));
      hits[searchActive]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      searchActive = Math.max(searchActive - 1, 0);
      hits.forEach((h, i) => h.classList.toggle("active", i === searchActive));
      hits[searchActive]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hits[searchActive]) activateSearchHit(hits[searchActive]);
    }
  });

  // tabs
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      treeMode = tab.dataset.tree;
      document.querySelectorAll(".tab").forEach((t) => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
      });
      renderTree();
    });
  });
  $("#tree-filter").addEventListener("input", renderTree);

  // views
  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentView = btn.dataset.view;
      renderStage();
    });
  });

  $("#btn-copy-fqn")?.addEventListener("click", async () => {
    const sel = getSelection();
    if (!sel || sel.kind === "file") return;
    await navigator.clipboard.writeText(sel.fqn);
    toast("Copied FQN");
  });

  $("#btn-export-md")?.addEventListener("click", () => {
    const sel = getSelection();
    if (!sel || sel.kind === "file") return;
    const md = exportMarkdown(ws, sel);
    downloadText(`${sel.name}.md`, md);
    toast("Markdown downloaded");
  });

  $("#btn-clear")?.addEventListener("click", () => {
    removeAll(ws);
    exitWorkspace();
    toast("Workspace cleared");
  });

  // keyboard — only when Viewer route is active
  window.addEventListener("keydown", (e) => {
    if (!location.hash.startsWith("#/viewer")) return;
    const tag = (e.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (ws.files.length) openSearch();
      return;
    }
    if (e.key === "/" && !typing) {
      e.preventDefault();
      if (ws.files.length) openSearch();
      return;
    }
    if (typing) return;
    if (e.key.toLowerCase() === "o") openFiles();
    if (e.key.toLowerCase() === "p") openPaste();
    if (e.key.toLowerCase() === "u") openFetch();
    if (e.key.toLowerCase() === "n") openCompose();
  });
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

wireUi();
