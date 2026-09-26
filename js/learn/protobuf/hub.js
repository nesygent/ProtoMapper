import { P, seasonNav } from "../_util.js";

export default {
  title: "Harbor Heist",
  kicker: "Protocol Buffers 3 · Season",
  lede: "A heist for durable contracts. Passport stamps are field numbers—names never ride the wire. Throughline: harbor.ledger.v1 · Cargo · Record.",
  tocHtml: seasonNav(0),
  body: P(`
    <div class="summary-box" id="hh-brief">
      <h2>Season brief</h2>
      <ol>
        <li><strong>You are</strong> shipping a tiny cargo API strangers will compile against.</li>
        <li><strong>Prize:</strong> a proto3 schema that survives years of foreign code.</li>
        <li><strong>Metaphor:</strong> passport stamps — the number is identity; the printed word is for humans.</li>
        <li><strong>How it moves:</strong> heist — cold open → crew → whiteboard → job → getaway.</li>
      </ol>
    </div>

    <h2 class="section-anchor" id="hh-watch">Watch order</h2>
    <div class="step-cards">
      <div class="step-card"><div>
        <h3><a href="#/learn/protobuf/1">1 · The night names vanished</a></h3>
        <p>What protobuf is. Names don’t travel. Numbers do. ~8 min</p>
      </div></div>
      <div class="step-card"><div>
        <h3><a href="#/learn/protobuf/2">2 · Recruit the crew</a></h3>
        <p>Message, scalars, stamp discipline, <code>reserved</code>. ~10 min</p>
      </div></div>
      <div class="step-card"><div>
        <h3><a href="#/learn/protobuf/3">3 · Whiteboard the job</a></h3>
        <p><code>enum</code>, <code>repeated</code>, <code>map</code>, <code>oneof</code>, <code>optional</code>. ~12 min</p>
      </div></div>
      <div class="step-card"><div>
        <h3><a href="#/learn/protobuf/4">4 · Pull the job</a></h3>
        <p>Package, envelopes, unary RPC. ~10 min</p>
      </div></div>
      <div class="step-card"><div>
        <h3><a href="#/learn/protobuf/5">5 · The getaway</a></h3>
        <p>Evolution, presence traps, well-known types. ~10 min</p>
      </div></div>
    </div>

    <div class="callout"><strong>After the season:</strong> read any <code>.proto</code>, design additive changes, and stop treating field <em>names</em> as the wire contract. Open the Proto Viewer when an episode says “Your move.”</div>

    <div class="learn-actions">
      <a class="cds-btn cds-btn--primary" href="#/learn/protobuf/1">Start episode 1</a>
      <a class="cds-btn cds-btn--tertiary" href="#/viewer">Open Proto Viewer</a>
    </div>
  `),
  prev: { hash: "#/home", label: "Home" },
  next: { hash: "#/learn/protobuf/1", label: "Episode 1" },
};
