import { P, seasonNav } from "../_util.js";

export default {
  title: "5 · The getaway",
  kicker: "Harbor Heist · Episode 5 · ~10 min",
  lede: "Six months later someone says “just renumber to clean up.” That sentence is the alarm.",
  tocHtml: seasonNav(5),
  body: P(`
    <blockquote class="learn-scene"><strong>Scene:</strong> Old mobile stubs still live. You need a new field without torching the building.</blockquote>

    <h2 class="section-anchor" id="e5-promise">Promise</h2>
    <p>Evolve additively. Retire stamps safely. Stop confusing package <code>v1</code> with the protobuf language.</p>

    <h2 class="section-anchor" id="e5-escape">Escape rules</h2>
    <div class="do-dont">
      <div class="do">
        <h3>Safe</h3>
        <ul>
          <li>New field → new unused number</li>
          <li>New enum value (tolerate unknowns)</li>
          <li>New RPC; <code>reserved</code> on delete</li>
          <li><code>…v2</code> only for hard breaks + dual-run</li>
        </ul>
      </div>
      <div class="dont">
        <h3>Deadly</h3>
        <ul>
          <li>Reuse a number for new meaning</li>
          <li>Incompatible type change in place</li>
          <li>Renumber “for cleanliness”</li>
          <li>Delete without <code>reserved</code></li>
        </ul>
      </div>
    </div>
    <pre class="code">message Cargo {
  reserved 8;
  reserved "old_route";
  string id = 1;
  string route_code = 9;  // new stamp — not 8
}</pre>

    <h2 class="section-anchor" id="e5-presence">Presence trap</h2>
    <p>Without <code>optional</code>, missing float and true <code>0</code> look the same. Document sentinels or mark <code>optional</code>. For message fields like <code>Timestamp</code>: omit the field—don’t worship <code>seconds == 0</code>.</p>
    <p>Prefer well-known types: <code>Timestamp</code>, <code>Duration</code>, <code>FieldMask</code>, <code>Empty</code>, <code>Any</code>.</p>

    <blockquote class="learn-challenge"><strong>Your move:</strong> Old clients don’t know stamp <code>9</code>. New servers set it. Crash?</blockquote>
    <p><strong>Answer:</strong> No—they skip unknown fields. That’s the getaway car.</p>

    <blockquote class="learn-reveal"><strong>Reveal:</strong> Compatibility is empty passport pages for future stamps—and never forging an old number.</blockquote>

    <h2 class="section-anchor" id="e5-transfer">Transfer</h2>
    <p>List three real schema changes. Label safe vs breaking. For one deletion, write the <code>reserved</code> lines.</p>
    <details class="deep"><summary>Easter skill</summary>
      <p>Design a <code>Cargo</code> v1→v2 break that cannot be additive. Dual-run plan for two weeks?</p>
    </details>

    <h2 class="section-anchor" id="e5-card">Field card</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Do</th><th>Don’t</th></tr></thead>
      <tbody>
        <tr><td>Add numbers</td><td>Reuse numbers</td></tr>
        <tr><td>Reserve deletions</td><td>Silent renumbers</td></tr>
        <tr><td><code>optional</code> when zero ≠ missing</td><td>Hope comments save PATCH</td></tr>
        <tr><td>Package v1 = product API</td><td>Think it means “protobuf v1”</td></tr>
      </tbody>
    </table></div>

    <h2 class="section-anchor" id="e5-close">Season close</h2>
    <p>Walk a <code>.proto</code> like a blueprint: stamps first, names second, evolution always. Audit a real service for reused numbers and missing <code>reserved</code>.</p>
    <div class="learn-actions">
      <a class="cds-btn cds-btn--primary" href="#/viewer">Open Proto Viewer</a>
      <a class="cds-btn cds-btn--tertiary" href="#/learn/grpc">Next season trailer: gRPC</a>
    </div>
  `),
  prev: { hash: "#/learn/protobuf/4", label: "Episode 4" },
  next: { hash: "#/learn/grpc", label: "gRPC" },
};
