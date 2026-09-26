import { P, seasonNav } from "../_util.js";

export default {
  title: "1 · The night names vanished",
  kicker: "Harbor Heist · Episode 1 · ~8 min",
  lede: "Friday outage energy: two teams “used the same field.” The capture shows no letters—only numbers.",
  tocHtml: seasonNav(1),
  body: P(`
    <blockquote class="learn-scene"><strong>Scene:</strong> A Go service wrote <code>importance</code>. A Java client printed <code>0.0</code>. Both swear they matched. Packets carry no words—only stamps.</blockquote>

    <h2 class="section-anchor" id="e1-promise">Promise</h2>
    <p>Stop thinking protobuf is “typed JSON.” Treat it as a <strong>numbered contract</strong> that <em>codegen</em> turns into local types.</p>

    <h2 class="section-anchor" id="e1-prize">The prize</h2>
    <p>Protobuf (proto3) is three things:</p>
    <ol>
      <li>A language for declaring shapes (<code>.proto</code>)</li>
      <li>A binary encoding where <strong>field numbers</strong> identify data</li>
      <li>A toolchain that emits stubs—not your business logic</li>
    </ol>
    <p>It is <strong>not</strong> a network, not a server, not one language.</p>
    <pre class="code">Your head:   "importance"
The wire:    tag for field 4  +  float bits
Their head:  whatever their .proto named field 4</pre>
    <p>Agree on <strong>number + type</strong> → renames are theater. Disagree on the number → two different fields in costume.</p>

    <blockquote class="learn-challenge"><strong>Your move:</strong> Does renaming <code>importance</code> → <code>priority</code> break old binaries if the number stays <code>4</code>?</blockquote>
    <p><strong>Answer:</strong> No. The wire never carried the word.</p>

    <h2 class="section-anchor" id="e1-demo">Lived micro-demo</h2>
    <pre class="code">syntax = "proto3";
package harbor.ledger.v1;

message Cargo {
  string id = 1;
  float weight_kg = 4;
}</pre>
    <p>Watch <code>weight_kg = 4</code>: the name is a sticky note; <strong><code>4</code> is the passport stamp.</strong></p>

    <blockquote class="learn-reveal"><strong>Reveal:</strong> Names are for APIs you generate. Numbers are the treaty.</blockquote>
    <p>gRPC can truck these bytes over HTTP/2. Kafka can store them with no RPC. Same cargo; different trucks.</p>

    <h2 class="section-anchor" id="e1-transfer">Transfer</h2>
    <p>Open any real <code>.proto</code>. Cover one field name with your finger. What still identifies it?</p>

    <h2 class="section-anchor" id="e1-card">Field card</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Term</th><th>Sticky bit</th></tr></thead>
      <tbody>
        <tr><td><code>.proto</code></td><td>Contract source</td></tr>
        <tr><td>Message</td><td>Structured bag of fields</td></tr>
        <tr><td>Field number</td><td>Wire identity</td></tr>
        <tr><td>Codegen</td><td>Adapters, not domain logic</td></tr>
      </tbody>
    </table></div>
  `),
  prev: { hash: "#/learn/protobuf", label: "Season hub" },
  next: { hash: "#/learn/protobuf/2", label: "Episode 2" },
};
