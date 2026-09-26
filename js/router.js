import { renderLearnPage } from "./learn.js";

function pageIdForPath(path) {
  if (path === "home") return "page-home";
  if (path === "viewer") return "page-viewer";
  if (path.startsWith("learn/")) return "page-learn";
  return "page-home";
}

function learnKeyForPath(path) {
  if (!path.startsWith("learn/")) return null;
  return path.slice("learn/".length);
}

function navMatch(path, target) {
  if (target === path) return true;
  // Keep "Protocol Buffers 3" sidenav lit for episode subpages
  if (target === "learn/protobuf" && path.startsWith("learn/protobuf")) return true;
  return false;
}

let mermaidReady = null;

function ensureMermaid() {
  if (mermaidReady) return mermaidReady;
  mermaidReady = import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs")
    .then((m) => {
      m.default.initialize({
        startOnLoad: false,
        theme: document.documentElement.dataset.theme === "dark" ? "dark" : "base",
        themeVariables: {
          primaryColor: "#e5e5fc",
          primaryTextColor: "#1f2226",
          primaryBorderColor: "#42338f",
          lineColor: "#606770",
          secondaryColor: "#d9ebf4",
          tertiaryColor: "#fff6ef",
          fontFamily: "IBM Plex Sans, sans-serif",
        },
        securityLevel: "strict",
      });
      return m.default;
    })
    .catch((err) => {
      console.warn("Mermaid failed to load", err);
      return null;
    });
  return mermaidReady;
}

async function runMermaid(root) {
  const mermaid = await ensureMermaid();
  if (!mermaid || !root) return;
  const nodes = root.querySelectorAll(".mermaid");
  if (!nodes.length) return;
  // Reset processed flag for re-entry
  nodes.forEach((n) => {
    n.removeAttribute("data-processed");
    if (n.dataset.source) n.textContent = n.dataset.source;
    else n.dataset.source = n.textContent;
  });
  try {
    await mermaid.run({ nodes: [...nodes] });
  } catch (e) {
    console.warn("Mermaid render error", e);
  }
}

/** Turn wide tables into labeled cards on narrow viewports. */
function enhanceLearnTables(root) {
  if (!root) return;
  root.querySelectorAll(".table-wrap").forEach((wrap) => {
    const table = wrap.querySelector("table");
    if (!table || wrap.dataset.enhanced === "1") return;
    wrap.dataset.enhanced = "1";

    const headers = [...table.querySelectorAll("thead th")].map((th) =>
      th.textContent.replace(/\s+/g, " ").trim()
    );
    if (headers.length) {
      wrap.classList.add("is-cards");
      table.querySelectorAll("tbody tr").forEach((tr) => {
        [...tr.children].forEach((cell, i) => {
          if (cell.tagName === "TD" && headers[i]) {
            cell.setAttribute("data-label", headers[i]);
          }
        });
      });
    }

    const markScroll = () => {
      const scrollable = wrap.scrollWidth > wrap.clientWidth + 4;
      wrap.dataset.scrollable = scrollable ? "true" : "false";
      let hint = wrap.querySelector(".table-wrap__hint");
      if (scrollable && !hint) {
        hint = document.createElement("div");
        hint.className = "table-wrap__hint";
        hint.textContent = "Swipe sideways to see all columns";
        wrap.prepend(hint);
      }
      if (hint) hint.hidden = !scrollable;
    };
    markScroll();
    window.addEventListener("resize", markScroll, { passive: true });
  });
}

function parseHash() {
  const raw = (location.hash || "#/home").replace(/^#\/?/, "");
  const path = raw.replace(/\/$/, "") || "home";
  return path;
}

function setCurrentNav(path) {
  document.querySelectorAll("[data-nav]").forEach((el) => {
    const target = el.getAttribute("data-nav");
    const active = navMatch(path, target);
    el.setAttribute("aria-current", active ? "page" : "false");
  });
}

function showPage(id) {
  document.querySelectorAll(".page").forEach((p) => {
    p.classList.toggle("active", p.id === id);
    p.hidden = p.id !== id;
  });
}

export function navigate(path) {
  const normalized = path.replace(/^#\/?/, "").replace(/\/$/, "") || "home";
  if (location.hash !== `#/${normalized}`) {
    location.hash = `#/${normalized}`;
  } else {
    render();
  }
}

export async function render() {
  const path = parseHash();
  const pageId = pageIdForPath(path);
  showPage(pageId);
  setCurrentNav(path);

  const learnRoot = document.getElementById("learn-root");
  if (pageId === "page-learn" && learnRoot) {
    const key = learnKeyForPath(path);
    learnRoot.innerHTML = renderLearnPage(key);
    enhanceLearnTables(learnRoot);
    learnRoot.querySelectorAll("[data-scroll]").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const el = document.getElementById(a.getAttribute("data-scroll"));
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    await runMermaid(learnRoot);
  }

  const titles = {
    home: "ProtoMap — learn & view protobuf",
    viewer: "ProtoMap — Viewer",
    "learn/protobuf": "ProtoMap — Harbor Heist (Proto3)",
    "learn/protobuf/1": "ProtoMap — Ep1 · Names vanished",
    "learn/protobuf/2": "ProtoMap — Ep2 · Recruit crew",
    "learn/protobuf/3": "ProtoMap — Ep3 · Whiteboard",
    "learn/protobuf/4": "ProtoMap — Ep4 · Pull the job",
    "learn/protobuf/5": "ProtoMap — Ep5 · Getaway",
    "learn/grpc": "ProtoMap — gRPC",
    "learn/http2": "ProtoMap — HTTP/2",
    "learn/together": "ProtoMap — How they fit",
  };
  document.title = titles[path] || "ProtoMap";

  window.dispatchEvent(new CustomEvent("protomap:route", { detail: { path, pageId } }));
}

export function initRouter() {
  window.addEventListener("hashchange", () => {
    render();
  });
  if (!location.hash || location.hash === "#/" || location.hash === "#/home") {
    // Viewer is the primary surface; keep #/home reachable from sidenav Overview
    if (!location.hash || location.hash === "#/" ) {
      location.hash = "#/viewer";
    } else {
      render();
    }
  } else {
    render();
  }
}
