import grpc from "./learn/grpc.js";
import http2 from "./learn/http2.js";
import together from "./learn/together.js";
import protobufHub from "./learn/protobuf/hub.js";
import protobuf1 from "./learn/protobuf/ep01.js";
import protobuf2 from "./learn/protobuf/ep02.js";
import protobuf3 from "./learn/protobuf/ep03.js";
import protobuf4 from "./learn/protobuf/ep04.js";
import protobuf5 from "./learn/protobuf/ep05.js";

export const learnPages = {
  protobuf: protobufHub,
  "protobuf/1": protobuf1,
  "protobuf/2": protobuf2,
  "protobuf/3": protobuf3,
  "protobuf/4": protobuf4,
  "protobuf/5": protobuf5,
  grpc,
  http2,
  together,
};

export function renderLearnPage(key) {
  const page = learnPages[key];
  if (!page) {
    return `<article class="learn"><p>Unknown lesson. <a href="#/learn/protobuf">Back to Harbor Heist</a></p></article>`;
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
