import { initRouter } from "./router.js";
import "./app.js";

function initShell() {
  const btn = document.getElementById("btn-nav-toggle");
  const sidenav = document.getElementById("sidenav");
  const mqNarrow = window.matchMedia("(max-width: 56rem)");

  const setNavCollapsed = (collapsed) => {
    sidenav?.setAttribute("data-collapsed", collapsed ? "true" : "false");
    document.body.classList.toggle("nav-collapsed", collapsed);
    const backdrop = document.getElementById("sidenav-backdrop");
    backdrop?.classList.toggle("is-active", !collapsed && mqNarrow.matches);
  };

  btn?.addEventListener("click", () => {
    const collapsed = sidenav.getAttribute("data-collapsed") === "true";
    setNavCollapsed(!collapsed);
  });

  document.getElementById("sidenav-backdrop")?.addEventListener("click", () => {
    setNavCollapsed(true);
  });

  // Close sidenav after navigating on small screens
  sidenav?.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      if (mqNarrow.matches) setNavCollapsed(true);
    });
  });

  setNavCollapsed(mqNarrow.matches);
  mqNarrow.addEventListener("change", (e) => setNavCollapsed(e.matches));

  initHeaderToolsOverflow();
}

function initHeaderToolsOverflow() {
  const tools = document.getElementById("viewer-toolbar");
  const moreBtn = document.getElementById("btn-tools-more");
  const overflow = document.getElementById("tools-overflow");
  if (!tools || !moreBtn || !overflow) return;

  const primaryTools = [...tools.querySelectorAll(".cds-header__tool:not(.cds-header__tool--more)")];

  const syncCompact = () => {
    const compact = window.matchMedia("(max-width: 42rem)").matches;
    tools.dataset.compact = compact ? "true" : "false";
    moreBtn.hidden = !compact;
    // Always force menu closed when leaving compact / on resize
    overflow.hidden = true;
    moreBtn.setAttribute("aria-expanded", "false");
  };

  // Ensure closed on boot
  overflow.hidden = true;
  moreBtn.hidden = true;

  moreBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = overflow.hidden;
    overflow.hidden = !open;
    moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  overflow.addEventListener("click", (e) => e.stopPropagation());

  overflow.querySelectorAll("[data-tool]").forEach((item) => {
    item.addEventListener("click", () => {
      const id = item.getAttribute("data-tool");
      document.getElementById(id)?.click();
      overflow.hidden = true;
      moreBtn.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", () => {
    overflow.hidden = true;
    moreBtn.setAttribute("aria-expanded", "false");
  });

  syncCompact();
  window.addEventListener("resize", syncCompact);
}

// Backdrop element
const backdrop = document.createElement("button");
backdrop.type = "button";
backdrop.id = "sidenav-backdrop";
backdrop.className = "cds-sidenav-backdrop";
backdrop.setAttribute("aria-label", "Close navigation");
document.body.append(backdrop);

initShell();
initRouter();
