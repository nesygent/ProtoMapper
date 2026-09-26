import { P, seasonNav } from "../_util.js";

export default {
  title: "2 · Recruit the crew",
  kicker: "Harbor Heist · Episode 2 · ~10 min",
  lede: "Legal wants an id, ops wants weight, finance wants a note—one sealed envelope.",
  tocHtml: seasonNav(2),
  body: P(`
    <blockquote class="learn-scene"><strong>Scene:</strong> Same <code>Cargo</code> job. You need a crew that fits in one briefcase.</blockquote>

    <h2 class="section-anchor" id="e2-promise">Promise</h2>
    <p>Build a proto3 <strong>message</strong> from <strong>scalars</strong> and place <strong>stamps</strong> like a pro—not like numbering notebook lines.</p>

    <h2 class="section-anchor" id="e2-lived">Lived example</h2>
    <pre class="code">syntax = "proto3";
package harbor.ledger.v1;

message Cargo {
  string id = 1;           // stamp 1 — hot path
  string note = 2;
  bool hazmat = 3;
  float weight_kg = 4;
  bytes seal_hash = 5;
  int64 recorded_unix_ms = 6;
}</pre>
    <p><strong>Crew (scalars):</strong> <code>string</code>, <code>bytes</code>, <code>bool</code>, floats, ints (<code>int32</code>/<code>int64</code>, <code>uint*</code>, <code>sint*</code> for zig-zag negatives, <code>fixed*</code> when values run large).</p>
    <p><strong>Rule:</strong> Unset scalars read as zeros. No “null string” on the wire without extra machinery (episode 3).</p>

    <h2 class="section-anchor" id="e2-stamps">Stamp discipline</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Stamps</th><th>Use</th></tr></thead>
      <tbody>
        <tr><td>1–15</td><td>Hot fields (cheaper tags)</td></tr>
        <tr><td>16–2047</td><td>Normal</td></tr>
        <tr><td>19000–19999</td><td>Forbidden</td></tr>
      </tbody>
    </table></div>
    <p>Never reuse a stamp. Retire with <code>reserved</code>.</p>
    <pre class="code">message Cargo {
  reserved 7, 9 to 11;
  reserved "legacy_code";
  string id = 1;
}</pre>

    <blockquote class="learn-challenge"><strong>Your move:</strong> You delete <code>note</code>. Which two <code>reserved</code> lines before anyone else ships?</blockquote>
    <details class="deep"><summary>Show</summary>
      <p><code>reserved 2;</code> and <code>reserved "note";</code></p>
    </details>

    <h2 class="section-anchor" id="e2-duel">Misconception duel</h2>
    <div class="do-dont">
      <div class="dont"><h3>Naive</h3><p>Field order in the file is the wire order.</p></div>
      <div class="do"><h3>Reality</h3><p>Wire order isn’t a contract. <strong>Numbers</strong> are.</p></div>
    </div>

    <blockquote class="learn-reveal"><strong>Reveal:</strong> A message is a briefcase. Scalars are objects. Stamps are the only IDs customs honor.</blockquote>

    <h2 class="section-anchor" id="e2-transfer">Transfer</h2>
    <p>Sketch five fields for a work <code>Person</code>. Stamps 1–5; hottest data in 1–15. No JSON.</p>

    <h2 class="section-anchor" id="e2-card">Field card</h2>
    <div class="chip-row">
      <span class="chip">message = struct</span>
      <span class="chip">scalar = leaf</span>
      <span class="chip">= N = ABI</span>
      <span class="chip">reserved = retired</span>
    </div>
  `),
  prev: { hash: "#/learn/protobuf/1", label: "Episode 1" },
  next: { hash: "#/learn/protobuf/3", label: "Episode 3" },
};
