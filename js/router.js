import { renderLearnPage } from "./learn.js";

const ROUTES = {
  home: "page-home",
  viewer: "page-viewer",
  "learn/protobuf": "page-learn",
  "learn/grpc": "page-learn",
  "learn/http2": "page-learn",
  "learn/together": "page-learn",
};

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

function parseHash() {
  const raw = (location.hash || "#/home").replace(/^#\/?/, "");
  const path = raw.replace(/\/$/, "") || "home";
  return path;
}

function setCurrentNav(path) {
  document.querySelectorAll("[data-nav]").forEach((el) => {
    const target = el.getAttribute("data-nav");
    const active = target === path;
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
  const pageId = ROUTES[path] || ROUTES.home;
  showPage(pageId);
  setCurrentNav(ROUTES[path] ? path : "home");

  const learnRoot = document.getElementById("learn-root");
  if (pageId === "page-learn" && learnRoot) {
    const key = path.split("/")[1];
    learnRoot.innerHTML = renderLearnPage(key);
    learnRoot.querySelectorAll("[data-scroll]").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const el = document.getElementById(a.getAttribute("data-scroll"));
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    await runMermaid(learnRoot);
  }

  document.title =
    {
      home: "ProtoMap — learn & view protobuf",
      viewer: "ProtoMap — Viewer",
      "learn/protobuf": "ProtoMap — Protocol Buffers 3",
      "learn/grpc": "ProtoMap — gRPC",
      "learn/http2": "ProtoMap — HTTP/2",
      "learn/together": "ProtoMap — How they fit",
    }[path] || "ProtoMap";

  // Notify viewer module
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
