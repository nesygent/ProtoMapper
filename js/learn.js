import protobuf from "./learn/protobuf.js";
import grpc from "./learn/grpc.js";
import http2 from "./learn/http2.js";
import together from "./learn/together.js";

export const learnPages = {
  protobuf,
  grpc,
  http2,
  together,
};

export function renderLearnPage(key) {
  const page = learnPages[key];
  if (!page) {
    return `<article class="learn"><p>Unknown lesson.</p></article>`;
  }
  return `
    <div class="learn-layout">
      ${page.tocHtml || ""}
      <article class="learn">
        <header class="learn-hero">
          <p class="learn-kicker">${page.kicker}</p>
          <h1>${page.title}</h1>
          <p class="learn-lede">${page.lede}</p>
        </header>
        ${page.body}
        <nav class="learn-pager">
          <a class="cds-btn cds-btn--ghost" href="${page.prev.hash}">← ${page.prev.label}</a>
          <a class="cds-btn cds-btn--primary" href="${page.next.hash}">${page.next.label} →</a>
        </nav>
      </article>
    </div>
  `;
}
