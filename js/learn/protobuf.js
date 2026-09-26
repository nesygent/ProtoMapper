const P = (s) => s.trim();

const toc = (route, items) => `
  <nav class="learn-toc" aria-label="On this page">
    <p class="learn-toc__title">On this page</p>
    ${items.map(([id, label]) => `<a href="#/learn/${route}" data-scroll="${id}">${label}</a>`).join("")}
  </nav>`;

export default {
  title: "Protocol Buffers 3",
  kicker: "Component 1 of 3 · Payload & contract language",
  lede: "Every IDL building block — messages, scalars, enums, maps, oneofs, services — plus wire rules, presence, JSON mapping, and how to read a real schema in ProtoMap. Nothing from the learning guide left behind.",
  tocHtml: toc("protobuf", [
    ["pb-exec", "Executive summary"],
    ["pb-blocks", "Building blocks"],
    ["pb-what", "What it is"],
    ["pb-tool", "Toolchain"],
    ["pb-sides", "Server vs client"],
    ["pb-syntax", "proto2 · proto3 · Editions"],
    ["pb-anatomy", "Anatomy of a .proto"],
    ["pb-msg", "Messages"],
    ["pb-fields", "Fields & numbers"],
    ["pb-scalars", "Scalar types"],
    ["pb-enums", "Enums"],
    ["pb-nest", "Nested & composition"],
    ["pb-coll", "repeated & map"],
    ["pb-oneof", "oneof"],
    ["pb-presence", "Defaults & presence"],
    ["pb-pkg", "Packages · imports · names"],
    ["pb-opts", "Options (codegen)"],
    ["pb-svc", "Services & RPCs"],
    ["pb-stream", "Streaming RPCs"],
    ["pb-json", "JSON mapping"],
    ["pb-wire", "Wire format"],
    ["pb-wkt", "Well-known types"],
    ["pb-evolve", "API evolution"],
    ["pb-pitfalls", "Common pitfalls"],
    ["pb-protomap", "Study in ProtoMap"],
    ["pb-ref", "Quick reference"]
  ]),
  body: P(`
    <div class="summary-box" id="pb-exec">
      <h2>Executive summary</h2>
      <ol>
        <li><strong>Building blocks:</strong> <code>syntax</code>, <code>package</code>, <code>import</code>, <code>option</code>, <code>message</code>, <code>field</code> (+ number), <code>enum</code>, <code>repeated</code>, <code>map</code>, <code>oneof</code>, <code>service</code>/<code>rpc</code>, <code>reserved</code>.</li>
        <li><strong>Message</strong> = struct/DTO. <strong>Scalar</strong> = primitive field type inside it. Field <em>numbers</em> are the public wire ABI — names are not on the wire.</li>
        <li><code>protoc</code> (+ plugins / Buf / Quarkus gRPC) generates adapters; your handlers are the business logic.</li>
        <li>Proto3 unset scalars look like zeros; protobuf.dev recommends <code>optional</code> on singular scalars for presence (smoother path to <strong>Editions</strong>).</li>
        <li>Protobuf ≠ transport. Pair with gRPC/HTTP/2 (or Kafka, files, …) separately.</li>
      </ol>
    </div>

    <h2 class="section-anchor" id="pb-blocks">Building blocks at a glance</h2>
    <p>Everything you declare in a <code>.proto</code> is one of these constructs. Miss none of them when reading a real schema.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Block</th><th>What it is</th><th>Example</th></tr></thead>
      <tbody>
        <tr><td><code>syntax</code></td><td>IDL dialect</td><td><code>syntax = "proto3";</code></td></tr>
        <tr><td><code>package</code></td><td>Logical namespace / API version</td><td><code>package ajara.context.v1;</code></td></tr>
        <tr><td><code>import</code></td><td>Pull in other contracts / WKTs</td><td><code>import "google/protobuf/timestamp.proto";</code></td></tr>
        <tr><td><code>option</code></td><td>Codegen / language binding knobs</td><td><code>option java_package = "…";</code></td></tr>
        <tr><td><code>message</code></td><td>Structured type (struct / DTO)</td><td><code>message Memory { … }</code></td></tr>
        <tr><td><strong>Field</strong></td><td>Named slot + <strong>field number</strong></td><td><code>string id = 1;</code></td></tr>
        <tr><td><strong>Scalar</strong></td><td>Leaf primitive type</td><td><code>string</code>, <code>int64</code>, <code>bytes</code>, …</td></tr>
        <tr><td><code>enum</code></td><td>Named integer set (needs <code>= 0</code>)</td><td><code>MEMORY_TYPE_UNSPECIFIED = 0</code></td></tr>
        <tr><td><code>repeated</code></td><td>Ordered list</td><td><code>repeated float embedding = 10;</code></td></tr>
        <tr><td><code>map</code></td><td>Dictionary</td><td><code>map&lt;string, string&gt; meta = 3;</code></td></tr>
        <tr><td><code>oneof</code></td><td>Mutually exclusive variants</td><td><code>oneof criterion { … }</code></td></tr>
        <tr><td><code>service</code> / <code>rpc</code></td><td>RPC API surface (gRPC)</td><td><code>rpc Remember(Req) returns (Resp);</code></td></tr>
        <tr><td><code>reserved</code></td><td>Retired numbers / names</td><td><code>reserved 4, 8 to 10;</code></td></tr>
        <tr><td><code>optional</code></td><td>Explicit presence on scalars</td><td><code>optional float score = 1;</code></td></tr>
      </tbody>
    </table></div>
    <div class="fig">
      <div class="mermaid-wrap"><pre class="mermaid">
flowchart TB
  subgraph File[".proto file"]
    syn["syntax"]
    pkg["package"]
    imp["import"]
    opt["option"]
    en["enum"]
    msg["message"]
    svc["service"]
  end
  msg --> fld["fields = N"]
  fld --> sc["scalar / enum / message"]
  fld --> col["repeated · map · oneof"]
  svc --> rpc["rpc methods"]
  rpc --> req["Request message"]
  rpc --> resp["Response message"]
      </pre></div>
      <p class="fig-caption">Figure — How the building blocks nest. Start at file headers, then data model, then services.</p>
    </div>

    <h2 class="section-anchor" id="pb-what">What Protocol Buffers are (and are not)</h2>
    <p>From <strong>protobuf.dev</strong>: language-neutral, platform-neutral serialization of structured data — smaller and faster than typical JSON/XML, with a strict schema.</p>
    <div class="chip-row">
      <span class="chip">IDL (.proto)</span>
      <span class="chip">Binary encoding</span>
      <span class="chip">Code generation</span>
      <span class="chip">Forward / backward compatible</span>
    </div>
    <div class="tile-grid">
      <div class="cds-tile"><h3>Is</h3><p>Contract language + binary encoder + stub/message generator.</p></div>
      <div class="cds-tile"><h3>Is not</h3><p>A network protocol, application server, or database.</p></div>
      <div class="cds-tile"><h3>Usual partner</h3><p>gRPC uses Protobuf as the default payload format.</p></div>
      <div class="cds-tile"><h3>Also alone</h3><p>Kafka payloads, storage blobs, mobile sync, logs.</p></div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>You already know</th><th>Protobuf analogue</th></tr></thead>
      <tbody>
        <tr><td>OpenAPI / JSON Schema</td><td><code>.proto</code> messages + services</td></tr>
        <tr><td>DTO / record / struct</td><td><code>message</code></td></tr>
        <tr><td>REST resource + verbs</td><td><code>service</code> + <code>rpc</code> (usually gRPC)</td></tr>
        <tr><td>Jackson / serde JSON</td><td>Protobuf binary (or JSON mapping)</td></tr>
        <tr><td>Swagger-generated client</td><td><code>protoc</code>-generated client stub</td></tr>
      </tbody>
    </table></div>

    <h2 class="section-anchor" id="pb-tool">Toolchain mental model</h2>
    <div class="step-cards">
      <div class="step-card"><div><h3>Author the contract</h3><p>Review <code>.proto</code> like an API design doc — source of truth for the public surface.</p></div></div>
      <div class="step-card"><div><h3>Generate</h3><p><code>protoc</code>, Buf, Quarkus gRPC / Maven plugins — emit message classes and stubs.</p></div></div>
      <div class="step-card"><div><h3>Implement server</h3><p>Fill handlers; generated code only marshals and dispatches.</p></div></div>
      <div class="step-card"><div><h3>Ship clients</h3><p>Any language with a plugin consumes the same schema (or a published SDK).</p></div></div>
    </div>
    <div class="fig">
      <div class="mermaid-wrap"><pre class="mermaid">
flowchart LR
  subgraph Contract["Source of truth"]
    PROTO["*.proto files"]
  end
  subgraph Gen["Build time"]
    PC["protoc + plugins"]
  end
  subgraph Runtime["Runtime"]
    MSG["Message classes"]
    SSV["Server stubs"]
    CST["Client stubs"]
    IMPL["Your handlers"]
    APP["Client apps"]
  end
  PROTO --> PC
  PC --> MSG
  PC --> SSV
  PC --> CST
  SSV --> IMPL
  CST --> APP
  APP <-.binary messages.-> IMPL
      </pre></div>
      <p class="fig-caption">Figure — Contract → codegen → your code. Generated artifacts are adapters, not the domain.</p>
    </div>

    <h2 class="section-anchor" id="pb-sides">Server vs client: what runs where</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>On the server</th><th>Role</th></tr></thead>
      <tbody>
        <tr><td>App runtime (Quarkus, Go, …)</td><td>Process that listens</td></tr>
        <tr><td><strong>Your</strong> service implementation</td><td>Business logic</td></tr>
        <tr><td>Generated server stubs / base classes</td><td>Dispatch RPCs → your methods</td></tr>
        <tr><td>Generated message classes</td><td>Parse / serialize requests &amp; responses</td></tr>
        <tr><td>Datastores, queues, …</td><td>Persistence / side effects</td></tr>
      </tbody>
    </table></div>
    <div class="table-wrap"><table>
      <thead><tr><th>On the client</th><th>Role</th></tr></thead>
      <tbody>
        <tr><td>Client application</td><td>Decides <em>when</em> to call</td></tr>
        <tr><td>Generated <strong>client</strong> stub</td><td>Opens channel, marshals calls</td></tr>
        <tr><td>Generated message classes</td><td>Build requests / read responses</td></tr>
        <tr><td><strong>Not</strong> required</td><td>Server DB, server business packages</td></tr>
      </tbody>
    </table></div>
    <div class="callout"><strong>Rule:</strong> clients need the <strong>schema</strong> (or a published SDK) and network access — not your server codebase.</div>

    <h2 class="section-anchor" id="pb-syntax">proto2 vs proto3 vs Editions</h2>
    <div class="table-wrap"><table>
      <thead><tr><th></th><th>proto2</th><th>proto3 (common default)</th><th>Editions (current direction)</th></tr></thead>
      <tbody>
        <tr><td>File marker</td><td><code>syntax = "proto2";</code></td><td><code>syntax = "proto3";</code></td><td><code>edition = "2023";</code> (etc.)</td></tr>
        <tr><td>Presence</td><td><code>required</code> / <code>optional</code></td><td>Implicit zeros; use <code>optional</code> for presence</td><td>Explicit presence by default; features tune behavior</td></tr>
        <tr><td>Enums</td><td>First value need not be 0</td><td><strong>Must</strong> have zero value</td><td>Feature-controlled openness</td></tr>
        <tr><td>Extensions</td><td>Classic extensions</td><td>Prefer new fields / <code>Any</code></td><td>Feature-based evolution</td></tr>
      </tbody>
    </table></div>
    <p><strong>For new APIs today:</strong> use <strong>proto3</strong> (most gRPC tooling assumes it). Prefer <code>optional</code> on singular scalars — protobuf.dev notes this eases migration to Editions, where explicit presence is the default.</p>

    <h2 class="section-anchor" id="pb-anatomy">Anatomy of a <code>.proto</code> file</h2>
    <pre class="code">syntax = "proto3";

package acme.billing.v1;

import "google/protobuf/timestamp.proto";

option java_package = "com.acme.billing.v1";
option java_multiple_files = true;
option go_package = "github.com/acme/billing/v1;billingv1";

enum InvoiceState { … }
message Invoice { … }
message GetInvoiceRequest { … }
message GetInvoiceResponse { … }

service BillingService {
  rpc GetInvoice(GetInvoiceRequest) returns (GetInvoiceResponse);
}</pre>
    <p><strong>Read order:</strong> (1) <code>syntax</code> / <code>package</code> → (2) <code>import</code> → (3) <code>option</code> → (4) <code>enum</code> / <code>message</code> → (5) <code>service</code>.</p>

    <h2 class="section-anchor" id="pb-msg">Messages — the core type</h2>
    <p>A <strong>message</strong> is a named structured type: a bag of fields with stable wire IDs. Think <em>struct / record / DTO</em>, not a function.</p>
    <pre class="code">message Memory {
  string id = 1;
  float importance = 4;
  int64 created_at_unix_ms = 9;
}</pre>
    <p>This declares a type <code>Memory</code>; instances carry those fields; on the wire, fields are identified by <strong>numbers</strong> (<code>1</code>, <code>4</code>, <code>9</code>), not names.</p>
    <div class="tile-grid">
      <div class="cds-tile"><h3>Can contain</h3><p>Scalars, enums, other messages, <code>repeated</code>, <code>map</code>, <code>oneof</code>.</p></div>
      <div class="cds-tile"><h3>Are not</h3><p>Classes with behavior, or database tables (mapping is your choice).</p></div>
    </div>
    <div class="callout"><strong>Vocabulary:</strong> <code>Memory</code> is the <em>message</em>. <code>id</code> / <code>importance</code> are <em>fields</em> (often scalars). Saying “Memory is a scalar” is wrong.</div>

    <h2 class="section-anchor" id="pb-fields">Fields, field numbers, and wire identity</h2>
    <pre class="code">string id = 1;</pre>
    <div class="table-wrap"><table>
      <thead><tr><th>Part</th><th>Meaning</th></tr></thead>
      <tbody>
        <tr><td><code>string</code></td><td>Field type</td></tr>
        <tr><td><code>id</code></td><td>Name in schema / generated API</td></tr>
        <tr><td><code>= 1</code></td><td><strong>Field number</strong> — permanent identity on the wire</td></tr>
      </tbody>
    </table></div>
    <ul>
      <li>Renaming <code>id</code> → <code>memory_id</code> is a source change; wire stays compatible if the number stays <code>1</code>.</li>
      <li>Changing <code>= 1</code> to <code>= 2</code> is a <strong>breaking</strong> wire change.</li>
      <li>Numbers must be unique within a message. Reserve deleted ones: <code>reserved 4, 8 to 10;</code> and <code>reserved "old_name";</code></li>
    </ul>
    <div class="illus" aria-hidden="true">
      <svg viewBox="0 0 640 160" xmlns="http://www.w3.org/2000/svg" width="640" height="160">
        <rect width="640" height="160" fill="#f8f9fa"/>
        <text x="24" y="36" font-family="IBM Plex Sans,sans-serif" font-size="14" fill="#42338f" font-weight="600">On the wire (conceptually)</text>
        <rect x="24" y="56" width="120" height="64" fill="#e5e5fc" stroke="#42338f"/>
        <text x="84" y="84" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="12" fill="#42338f">tag</text>
        <text x="84" y="104" text-anchor="middle" font-family="IBM Plex Sans,sans-serif" font-size="11" fill="#5f6368">field# ⊕ type</text>
        <rect x="154" y="56" width="200" height="64" fill="#fff" stroke="#dadce0"/>
        <text x="254" y="84" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="12" fill="#202124">payload bytes</text>
        <text x="254" y="104" text-anchor="middle" font-family="IBM Plex Sans,sans-serif" font-size="11" fill="#5f6368">value for that field</text>
        <rect x="364" y="56" width="120" height="64" fill="#e5e5fc" stroke="#42338f"/>
        <text x="424" y="94" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="12" fill="#42338f">next tag…</text>
        <text x="24" y="148" font-family="IBM Plex Sans,sans-serif" font-size="12" fill="#5f6368">Names like “importance” never appear in binary protobuf — only numbers.</text>
      </svg>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Range</th><th>Guidance</th></tr></thead>
      <tbody>
        <tr><td>1–15</td><td>Hot fields (1-byte tags — slightly smaller encoding)</td></tr>
        <tr><td>16–2047</td><td>Normal fields</td></tr>
        <tr><td>19,000–19,999</td><td>Reserved by protobuf implementation — do not use</td></tr>
        <tr><td>Very high</td><td>Fine, but tags cost more varint bytes</td></tr>
      </tbody>
    </table></div>

    <h2 class="section-anchor" id="pb-scalars">Scalar types</h2>
    <p><strong>Scalar</strong> = a leaf primitive field type (not a message, not a map entry by itself).</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Proto type</th><th>Typical meaning</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td><code>double</code>, <code>float</code></td><td>IEEE floats</td><td></td></tr>
        <tr><td><code>int32</code>, <code>int64</code></td><td>Signed ints</td><td>Use <code>sint32</code>/<code>sint64</code> (zigzag) when negatives are common</td></tr>
        <tr><td><code>uint32</code>, <code>uint64</code></td><td>Unsigned</td><td></td></tr>
        <tr><td><code>fixed32</code>, <code>fixed64</code>, <code>sfixed32</code>, <code>sfixed64</code></td><td>Fixed-width</td><td>Better when values are often large</td></tr>
        <tr><td><code>bool</code></td><td>Boolean</td><td></td></tr>
        <tr><td><code>string</code></td><td>UTF-8 text</td><td></td></tr>
        <tr><td><code>bytes</code></td><td>Opaque binary</td><td></td></tr>
      </tbody>
    </table></div>
    <div class="callout"><strong>Proto3:</strong> unset scalars → language zero values (<code>0</code>, <code>false</code>, <code>""</code>, empty bytes). Distinguishing “missing” vs “explicitly zero” needs <code>optional</code>, wrappers, or documented sentinels.</div>

    <h2 class="section-anchor" id="pb-enums">Enums</h2>
    <pre class="code">enum MemoryType {
  MEMORY_TYPE_UNSPECIFIED = 0;  // required zero in proto3
  MEMORY_TYPE_WORKING = 1;
  MEMORY_TYPE_SEMANTIC = 3;
}

message Memory {
  MemoryType type = 2;
}</pre>
    <ul>
      <li>Always define <code>0</code> as unspecified / unknown.</li>
      <li>Prefix values with the enum type name (C++ hygiene; good style everywhere).</li>
      <li>Unknown enum values on the wire must be preserved (forward compatibility).</li>
      <li>Do <strong>not</strong> renumber published values.</li>
    </ul>

    <h2 class="section-anchor" id="pb-nest">Nested messages and composition</h2>
    <p>Messages nest by <strong>field type</strong>, not only by textual nesting:</p>
    <pre class="code">message RememberResponse {
  Memory memory = 1;           // field whose type is another message
}

message RecallHit {
  string id = 1;
  float score = 2;
  Memory memory = 3;
}</pre>
    <p>You may declare a message <em>inside</em> another (scoped name); prefer top-level messages for public APIs unless the type is truly private.</p>
    <div class="callout"><strong>Composition pattern:</strong> separate <code>*Request</code> / <code>*Response</code> messages even if thin — keeps evolution flexible.</div>

    <h2 class="section-anchor" id="pb-coll">Collections: <code>repeated</code> and <code>map</code></h2>
    <h3><code>repeated</code> — list / array</h3>
    <pre class="code">repeated float embedding = 10;
repeated RecallHit hits = 1;
repeated MemoryType type_filters = 4;</pre>
    <ul>
      <li>Order is preserved.</li>
      <li>Empty list vs unset is subtle in proto3 (often both look empty in APIs).</li>
      <li>In generated Java: typically <code>List&lt;…&gt;</code>.</li>
    </ul>
    <h3><code>map</code> — dictionary</h3>
    <pre class="code">map&lt;string, string&gt; arguments = 3;</pre>
    <ul>
      <li>Keys: integral or <code>string</code> (not float, not <code>bytes</code>).</li>
      <li>Values: almost any type except another <code>map</code>.</li>
      <li>Maps are unordered logically — do not rely on iteration order.</li>
      <li>Encoded as repeated entries of a synthetic message under the hood.</li>
    </ul>

    <h2 class="section-anchor" id="pb-oneof"><code>oneof</code> — mutually exclusive fields</h2>
    <pre class="code">message Query {
  oneof criterion {
    string text = 1;
    bytes embedding = 2;
  }
}</pre>
    <p>At most one branch is set. Generated APIs expose a “which case” discriminator. Prefer <code>oneof</code> over parallel optional fields when exactly one variant should apply. (<code>oneof</code> fields always have presence.)</p>

    <h2 class="section-anchor" id="pb-presence">Default values and field presence</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Type</th><th>Default if unset</th></tr></thead>
      <tbody>
        <tr><td>Numbers</td><td><code>0</code></td></tr>
        <tr><td><code>bool</code></td><td><code>false</code></td></tr>
        <tr><td><code>string</code></td><td><code>""</code></td></tr>
        <tr><td><code>bytes</code></td><td>empty</td></tr>
        <tr><td>enum</td><td>value <code>0</code></td></tr>
        <tr><td>message field</td><td>not present / null-ish (language-specific)</td></tr>
        <tr><td><code>repeated</code> / <code>map</code></td><td>empty</td></tr>
      </tbody>
    </table></div>
    <p>Without <code>optional</code>, you often <strong>cannot</strong> tell “user sent <code>0</code>” from “user omitted the field.”</p>
    <pre class="code">message PatchScore {
  optional float importance = 1;  // presence tracked — has_importance()
}</pre>
    <ul>
      <li><strong>Message fields</strong> already have presence — adding <code>optional</code> is redundant for them (e.g. <code>google.protobuf.Timestamp</code>: omit the field for “unset”).</li>
      <li><strong>repeated</strong> / <strong>map</strong> do not track “listed empty vs absent” the same way.</li>
      <li>Use <code>optional</code> for PATCH-style semantics; otherwise document sentinels.</li>
    </ul>

    <h2 class="section-anchor" id="pb-pkg">Packages, imports, and naming</h2>
    <h3><code>package</code></h3>
    <pre class="code">package ajara.context.v1;</pre>
    <ul>
      <li>Logical namespace (<code>ajara.context.v1.Memory</code>).</li>
      <li><strong>API version</strong> often lives here (<code>v1</code>, <code>v2</code>) — this is <em>your</em> product version, <strong>not</strong> “protobuf version.”</li>
    </ul>
    <h3><code>import</code></h3>
    <pre class="code">import "ajara/store/v1/store.proto";
import public "common/types.proto";  // re-export to importers</pre>
    <p>Split contracts by domain. Avoid circular imports.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Kind</th><th>Convention</th></tr></thead>
      <tbody>
        <tr><td>Files</td><td><code>lower_snake.proto</code> or path matching package</td></tr>
        <tr><td>Messages</td><td><code>UpperCamelCase</code></td></tr>
        <tr><td>Fields</td><td><code>lower_snake_case</code></td></tr>
        <tr><td>Enums</td><td><code>UpperCamelCase</code> type, <code>TYPE_VALUE</code> values</td></tr>
        <tr><td>Services</td><td><code>UpperCamelCase</code> + <code>Service</code> suffix</td></tr>
        <tr><td>RPCs</td><td><code>UpperCamelCase</code> verbs</td></tr>
      </tbody>
    </table></div>

    <h2 class="section-anchor" id="pb-opts">Options (language bindings)</h2>
    <p>Options steer <strong>codegen</strong>, not the wire layout of your fields:</p>
    <pre class="code">option java_package = "ai.ajara.context.v1";
option java_multiple_files = true;
option java_outer_classname = "ContextProto";
option go_package = "…";
option csharp_namespace = "…";</pre>
    <div class="table-wrap"><table>
      <thead><tr><th>Option</th><th>Effect</th></tr></thead>
      <tbody>
        <tr><td><code>java_package</code></td><td>Package of generated Java classes</td></tr>
        <tr><td><code>java_multiple_files</code></td><td>One Java file per message (vs single outer class)</td></tr>
        <tr><td><code>go_package</code></td><td>Go import path / package name</td></tr>
      </tbody>
    </table></div>
    <div class="callout">You may <code>import ai.ajara.context.v1.AddEvidenceRequest</code> in Java even though you never hand-wrote that package — it was <strong>generated</strong> into <code>target/generated-sources/…</code>.</div>

    <h2 class="section-anchor" id="pb-svc">Services and RPCs (gRPC)</h2>
    <pre class="code">service ContextService {
  rpc Health(HealthRequest) returns (HealthResponse);
  rpc Remember(RememberRequest) returns (RememberResponse);
  rpc AddEvidence(AddEvidenceRequest) returns (AddEvidenceResponse);
}</pre>
    <div class="table-wrap"><table>
      <thead><tr><th>IDL piece</th><th>Meaning</th></tr></thead>
      <tbody>
        <tr><td><code>service ContextService</code></td><td>Named API surface → interface / stub</td></tr>
        <tr><td><code>rpc Remember(...)</code></td><td>One method</td></tr>
        <tr><td><code>(RememberRequest)</code></td><td>Input <strong>message</strong></td></tr>
        <tr><td><code>returns (RememberResponse)</code></td><td>Output <strong>message</strong></td></tr>
      </tbody>
    </table></div>
    <p><strong>Unary RPC</strong> (above): one request, one response — the default. Codegen produces a server interface you implement and a client stub. Contract name (<code>ContextService</code>) vs implementation class (<code>ContextGrpcService</code>) often differ — that is normal.</p>
    <p>Deep dive: <a href="#/learn/grpc">gRPC lesson</a>.</p>

    <h2 class="section-anchor" id="pb-stream">Streaming RPCs</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Kind</th><th>Signature sketch</th><th>Use when</th></tr></thead>
      <tbody>
        <tr><td>Unary</td><td><code>rpc Foo(Req) returns (Resp)</code></td><td>Normal request/response</td></tr>
        <tr><td>Server streaming</td><td><code>returns (stream Resp)</code></td><td>Subscribe / large result sets</td></tr>
        <tr><td>Client streaming</td><td><code>rpc Foo(stream Req) returns (Resp)</code></td><td>Upload many parts → one summary</td></tr>
        <tr><td>Bidirectional</td><td><code>rpc Foo(stream Req) returns (stream Resp)</code></td><td>Interactive duplex</td></tr>
      </tbody>
    </table></div>
    <p>Streaming is still message-oriented: each stream element is a protobuf message.</p>

    <h2 class="section-anchor" id="pb-json">JSON mapping</h2>
    <p>Protobuf has a defined <strong>JSON mapping</strong> (REST gateways, debugging, browsers):</p>
    <ul>
      <li>Field names often become <strong>lowerCamelCase</strong> (<code>created_at_unix_ms</code> → <code>createdAtUnixMs</code>), depending on options/tooling.</li>
      <li><code>int64</code> may appear as a <strong>string</strong> in JSON (JavaScript precision).</li>
      <li><code>bytes</code> become base64.</li>
      <li>Default/zero values may be omitted in JSON output.</li>
      <li><code>json_name</code> option can override the JSON key — do not assume JSON keys equal proto names.</li>
    </ul>

    <h2 class="section-anchor" id="pb-wire">Wire format (enough to reason)</h2>
    <ol>
      <li><strong>Tag = field number + wire type</strong> (varint). Small field numbers → slightly smaller tags.</li>
      <li><strong>Only set fields are encoded</strong> — absent fields cost nothing (unlike JSON that may always send <code>"x":0</code>).</li>
      <li><strong>Names are not on the wire</strong> — receivers need the schema (or descriptor).</li>
      <li><strong>Field order on the wire is not a semantic contract</strong>; field numbers are.</li>
      <li><strong>Unknown fields</strong> should be preserved when round-tripping (forward-compatible proxies).</li>
    </ol>
    <div class="fig">
      <div class="mermaid-wrap"><pre class="mermaid">
flowchart TB
  M["Serialized message"] --> R1["Record: tag + value"]
  M --> R2["Record: tag + value"]
  M --> R3["…"]
  R1 --> T["varint tag = field# and wire type"]
  R1 --> V["payload: varint / fixed / length-delimited"]
      </pre></div>
      <p class="fig-caption">Figure — Binary protobuf is TLV-style. Schema required to interpret tags.</p>
    </div>
    <details class="deep">
      <summary>Wire types (cheat sheet)</summary>
      <div class="table-wrap"><table>
        <thead><tr><th>Wire type</th><th>Meaning</th><th>Examples</th></tr></thead>
        <tbody>
          <tr><td>0 Varint</td><td>Variable-length int</td><td><code>int32</code>, <code>bool</code>, enum</td></tr>
          <tr><td>1 64-bit</td><td>Fixed 8 bytes</td><td><code>fixed64</code>, <code>double</code></td></tr>
          <tr><td>2 Length-delimited</td><td>Length + bytes</td><td><code>string</code>, <code>bytes</code>, embedded messages, packed repeated</td></tr>
          <tr><td>5 32-bit</td><td>Fixed 4 bytes</td><td><code>fixed32</code>, <code>float</code></td></tr>
        </tbody>
      </table></div>
    </details>

    <h2 class="section-anchor" id="pb-wkt">Well-known types &amp; <code>Any</code></h2>
    <p>Google ships reusable messages under <code>google/protobuf/…</code> — import them instead of reinventing:</p>
    <div class="chip-row">
      <span class="chip">Timestamp</span>
      <span class="chip">Duration</span>
      <span class="chip">Empty</span>
      <span class="chip">Struct / Value</span>
      <span class="chip">FieldMask</span>
      <span class="chip">Any</span>
    </div>
    <ul>
      <li><code>google.protobuf.Timestamp</code> — UTC time; as a <strong>message</strong> field it already has presence (omit = unset; don’t treat <code>seconds=0</code> as null blindly).</li>
      <li><code>google.protobuf.Any</code> — arbitrary serialized message + type URL; pack/unpack helpers in codegen. Useful for error details and plugins.</li>
      <li><code>google.protobuf.FieldMask</code> — partial updates (pair with PATCH-style APIs).</li>
    </ul>

    <h2 class="section-anchor" id="pb-evolve">API evolution and compatibility</h2>
    <div class="do-dont">
      <div class="do">
        <h3>Safe (non-breaking)</h3>
        <ul>
          <li>Add a new field with a new number</li>
          <li>Add a new RPC (old clients ignore it)</li>
          <li>Add enum values; tolerate unknowns</li>
          <li>Deprecate; <code>reserved</code> numbers/names when removing</li>
          <li>Version packages (<code>…v1</code> → <code>…v2</code>) for hard breaks; dual-run during migration</li>
        </ul>
      </div>
      <div class="dont">
        <h3>Breaking</h3>
        <ul>
          <li>Reuse a field number for a different meaning</li>
          <li>Change a field’s type incompatibly</li>
          <li>Rename package/service/RPC without dual-running</li>
          <li>Remove a field without <code>reserved</code> while old binaries still speak it</li>
          <li>Rely on serialization field order</li>
        </ul>
      </div>
    </div>

    <h2 class="section-anchor" id="pb-pitfalls">Common pitfalls</h2>
    <ol>
      <li><strong>Confusing <code>v1</code> in the package with “protobuf v1.”</strong> <code>ajara.context.v1</code> is <em>your</em> API version; the language is proto3.</li>
      <li><strong>Expecting generated classes under <code>src/main/java</code>.</strong> They live in build output (<code>target/generated-sources/…</code>).</li>
      <li><strong>Using <code>0</code> / empty string without documented semantics.</strong> Zero defaults collide with real data; document or use <code>optional</code>.</li>
      <li><strong>Renumbering fields during “cleanup.”</strong> Treat numbers as public ABI.</li>
      <li><strong>God messages.</strong> Prefer request/response types + shared entities over one mega-struct.</li>
      <li><strong>Assuming clients share your DB model.</strong> The <code>.proto</code> is the product boundary.</li>
      <li><strong>Forgetting enums need a zero value</strong> in proto3 — use <code>*_UNSPECIFIED = 0</code>.</li>
      <li><strong>Putting business logic only in comments.</strong> Validation still belongs in server code.</li>
      <li><strong>Huge unbounded unary payloads</strong> — paginate or stream instead.</li>
    </ol>

    <h2 class="section-anchor" id="pb-protomap">How to study a real schema in ProtoMap</h2>
    <div class="step-cards">
      <div class="step-card"><div><h3>Open .proto files</h3><p>Multi-file drop is fine — imports resolve in the graph.</p></div></div>
      <div class="step-card"><div><h3>Start at Services</h3><p>List RPCs; each RPC is an entry point.</p></div></div>
      <div class="step-card"><div><h3>Open Request/Response</h3><p>Learn payload shapes; follow links into shared entities.</p></div></div>
      <div class="step-card"><div><h3>Check field numbers</h3><p>Comments for evolution hints (<code>≤ 0 → default</code>); use JSON / grpcurl examples.</p></div></div>
    </div>
    <pre class="code">service → rpc list → core entity messages → enums → satellite request/response types</pre>

    <h2 class="section-anchor" id="pb-ref">Quick reference &amp; glossary</h2>
    <pre class="code">syntax = "proto3";
package example.v1;

option java_package = "com.example.v1";
option java_multiple_files = true;

enum Status {
  STATUS_UNSPECIFIED = 0;
  STATUS_ACTIVE = 1;
}

message Item {
  string id = 1;                 // scalar
  Status status = 2;             // enum
  repeated string tags = 3;      // list
  map&lt;string, string&gt; meta = 4;  // map
  double score = 5;
}

message GetItemRequest { string id = 1; }
message GetItemResponse {
  Item item = 1;                 // nested message field
  bool found = 2;
}

service ItemService {
  rpc GetItem(GetItemRequest) returns (GetItemResponse);
}</pre>
    <div class="table-wrap"><table>
      <thead><tr><th>Term</th><th>One-liner</th></tr></thead>
      <tbody>
        <tr><td>Message</td><td>Structured type (struct/DTO)</td></tr>
        <tr><td>Field</td><td>Named slot inside a message</td></tr>
        <tr><td>Field number</td><td>Wire identity (<code>= N</code>)</td></tr>
        <tr><td>Scalar</td><td>Primitive field type</td></tr>
        <tr><td>Enum</td><td>Named integer set with <code>0</code> default</td></tr>
        <tr><td>Service</td><td>RPC API surface</td></tr>
        <tr><td>RPC</td><td>One method: messages in/out</td></tr>
        <tr><td>Stub</td><td>Generated client or server adapter</td></tr>
        <tr><td>proto3</td><td>Current common IDL dialect</td></tr>
        <tr><td>Editions</td><td>Successor syntax with feature flags</td></tr>
      </tbody>
    </table></div>
    <details class="deep">
      <summary>Further reading</summary>
      <ul>
        <li><a href="https://protobuf.dev/programming-guides/proto3/" target="_blank" rel="noopener">Language Guide (proto3)</a></li>
        <li><a href="https://protobuf.dev/programming-guides/encoding/" target="_blank" rel="noopener">Protobuf Encoding</a></li>
        <li><a href="https://protobuf.dev/programming-guides/field_presence/" target="_blank" rel="noopener">Field Presence</a></li>
        <li><a href="https://protobuf.dev/editions/overview/" target="_blank" rel="noopener">Protobuf Editions</a></li>
        <li><a href="https://protobuf.dev/programming-guides/proto3/#json" target="_blank" rel="noopener">JSON Mapping</a></li>
        <li><a href="https://grpc.io/docs/what-is-grpc/core-concepts/" target="_blank" rel="noopener">gRPC Concepts</a></li>
        <li><a href="https://google.aip.dev/" target="_blank" rel="noopener">Google Cloud AIP</a> (API design patterns)</li>
      </ul>
    </details>
`),
  prev: { hash: "#/home", label: "Home" },
  next: { hash: "#/learn/grpc", label: "Next: gRPC" },
};
