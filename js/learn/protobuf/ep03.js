import { P, seasonNav } from "../_util.js";

export default {
  title: "3 · Whiteboard the job",
  kicker: "Harbor Heist · Episode 3 · ~12 min",
  lede: "State, ports list, meta map, scan that is text or barcode—never both.",
  tocHtml: seasonNav(3),
  body: P(`
    <blockquote class="learn-scene"><strong>Scene:</strong> Customs wants exclusivity and presence—not another pile of parallel maybes.</blockquote>

    <h2 class="section-anchor" id="e3-promise">Promise</h2>
    <p>Place <code>enum</code>, <code>repeated</code>, <code>map</code>, <code>oneof</code>, and <code>optional</code> as tools with jobs—not a checklist to empty.</p>

    <h2 class="section-anchor" id="e3-plan">The plan</h2>
    <pre class="code">syntax = "proto3";
package harbor.ledger.v1;

enum CargoState {
  CARGO_STATE_UNSPECIFIED = 0;
  CARGO_STATE_BONDED = 1;
  CARGO_STATE_CLEARED = 2;
}

message Cargo {
  string id = 1;
  CargoState state = 2;
  repeated string ports = 3;
  map&lt;string, string&gt; meta = 4;

  oneof scan {
    string text_code = 5;
    bytes barcode = 6;
  }

  optional float declared_value = 7;
}</pre>

    <div class="table-wrap"><table>
      <thead><tr><th>Hire</th><th>Job</th></tr></thead>
      <tbody>
        <tr><td><code>enum</code></td><td>Closed ints; unknown must round-trip; never renumber published</td></tr>
        <tr><td><code>repeated</code></td><td>Ordered list</td></tr>
        <tr><td><code>map</code></td><td>Dict; keys int/string; unordered</td></tr>
        <tr><td><code>oneof</code></td><td>At most one branch</td></tr>
        <tr><td><code>optional</code></td><td>Scalar presence (recommended; Editions-friendly)</td></tr>
      </tbody>
    </table></div>
    <p>Message fields already have presence. <code>repeated</code>/<code>map</code> don’t cleanly mean empty vs absent.</p>

    <blockquote class="learn-challenge"><strong>Your move:</strong> Without <code>optional</code>, can you tell “worth zero” from “not sent” for <code>declared_value</code>?</blockquote>
    <p><strong>Answer:</strong> Not reliably. Zeros and missing collapse.</p>

    <blockquote class="learn-reveal"><strong>Reveal:</strong> Collections and unions are still stamps. Exclusivity and presence are policies you declare—or invent badly in comments.</blockquote>

    <h2 class="section-anchor" id="e3-transfer">Transfer</h2>
    <p>Extend your <code>Person</code>: enum status, <code>repeated</code> emails, <code>oneof</code> phone vs pager, one <code>optional</code> PATCH-sensitive scalar.</p>

    <h2 class="section-anchor" id="e3-card">Field card</h2>
    <div class="chip-row">
      <span class="chip">enum 0 = unspecified</span>
      <span class="chip">oneof = mutex</span>
      <span class="chip">optional = presence</span>
      <span class="chip">maps ≠ ordered</span>
    </div>
  `),
  prev: { hash: "#/learn/protobuf/2", label: "Episode 2" },
  next: { hash: "#/learn/protobuf/4", label: "Episode 4" },
};
