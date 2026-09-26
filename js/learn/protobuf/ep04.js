import { P, seasonNav } from "../_util.js";

export default {
  title: "4 · Pull the job",
  kicker: "Harbor Heist · Episode 4 · ~10 min",
  lede: "Two services, one contract—namespace, thin envelopes, one Record call.",
  tocHtml: seasonNav(4),
  body: P(`
    <blockquote class="learn-scene"><strong>Scene:</strong> Kick the door once: <em>record this cargo</em>.</blockquote>

    <h2 class="section-anchor" id="e4-promise">Promise</h2>
    <p>Wire <strong>package + composition + unary RPC</strong> without drowning in streaming taxonomy.</p>

    <h2 class="section-anchor" id="e4-job">The job</h2>
    <pre class="code">syntax = "proto3";
package harbor.ledger.v1;

option java_package = "com.harbor.ledger.v1";
option java_multiple_files = true;

message Cargo { /* from episode 3 */ }

message RecordRequest {
  Cargo cargo = 1;
}

message RecordResponse {
  string entry_id = 1;
  bool accepted = 2;
}

service Ledger {
  rpc Record(RecordRequest) returns (RecordResponse);
}</pre>
    <ul>
      <li><code>package …v1</code> — <em>your</em> API version, not “protobuf version.” Dialect is <code>syntax = "proto3"</code>.</li>
      <li>Thin <code>*Request</code>/<code>*Response</code> — evolution stays cheap.</li>
      <li><code>option java_package</code> — codegen knobs, not wire stamps.</li>
      <li>Path: <code>/harbor.ledger.v1.Ledger/Record</code></li>
    </ul>
    <pre class="code">Client stub.Record(req)
  → stamped protobuf bytes
  → (usually) HTTP/2 stream
  → your handler
  ← RecordResponse + status</pre>
    <p>Streaming exists. Start unary. Streams when the <em>interaction</em> is a stream.</p>

    <blockquote class="learn-challenge"><strong>Your move:</strong> Inline all <code>Cargo</code> fields into <code>RecordRequest</code>, or share a <code>Cargo</code> type?</blockquote>
    <p><strong>Fork:</strong> Shared entity when many RPCs speak it. Inline for one-offs. Harbor reuses <code>Cargo</code>—extract it.</p>

    <blockquote class="learn-reveal"><strong>Reveal:</strong> The heist isn’t the RPC. It’s a versioned package of stamped messages; the RPC is the door you kick.</blockquote>

    <h2 class="section-anchor" id="e4-transfer">Transfer</h2>
    <p>Name <code>package your.org.thing.v1</code>, one entity, one request/response, one <code>rpc</code>. No implementation.</p>

    <h2 class="section-anchor" id="e4-card">Field card</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Piece</th><th>Role</th></tr></thead>
      <tbody>
        <tr><td><code>package</code></td><td>Namespace + product version</td></tr>
        <tr><td><code>import</code></td><td>Other protos / WKTs</td></tr>
        <tr><td><code>option</code></td><td>Language bindings</td></tr>
        <tr><td><code>service</code>/<code>rpc</code></td><td>API surface</td></tr>
      </tbody>
    </table></div>
  `),
  prev: { hash: "#/learn/protobuf/3", label: "Episode 3" },
  next: { hash: "#/learn/protobuf/5", label: "Episode 5" },
};
