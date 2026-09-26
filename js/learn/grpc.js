const P = (s) => s.trim();

const toc = (route, items) => `
  <nav class="learn-toc" aria-label="On this page">
    <p class="learn-toc__title">On this page</p>
    ${items.map(([id, label]) => `<a href="#/learn/${route}" data-scroll="${id}">${label}</a>`).join("")}
  </nav>`;

export default {
  title: "gRPC",
  kicker: "Component 2 of 3 · RPC framework",
  lede: "Services, stubs, the four call styles, deadlines, metadata, status codes, channels, security, gRPC-Web, and how to read an API in ProtoMap — full coverage from the learning guide.",
  tocHtml: toc("grpc", [
    ["gr-exec", "Executive summary"],
    ["gr-what", "What gRPC is"],
    ["gr-stack", "Stack position"],
    ["gr-history", "Brief history"],
    ["gr-core", "Service · RPC · stub"],
    ["gr-sides", "Server vs client"],
    ["gr-styles", "Four RPC styles"],
    ["gr-deadline", "Deadlines & cancellation"],
    ["gr-meta", "Metadata"],
    ["gr-status", "Status & errors"],
    ["gr-channel", "Channels & LB"],
    ["gr-sec", "Security"],
    ["gr-intercept", "Interceptors"],
    ["gr-rest", "gRPC vs REST"],
    ["gr-web", "gRPC-Web"],
    ["gr-tools", "Tooling"],
    ["gr-design", "Design guidelines"],
    ["gr-obs", "Observability"],
    ["gr-pitfalls", "Pitfalls"],
    ["gr-protomap", "Read in ProtoMap"],
    ["gr-ref", "Quick reference"]
  ]),
  body: P(`
    <div class="summary-box" id="gr-exec">
      <h2>Executive summary</h2>
      <ol>
        <li>gRPC ≈ <strong>RPC API</strong> + Protobuf (default payload) + HTTP/2 (default transport) + tooling.</li>
        <li><code>service</code> / <code>rpc</code> in <code>.proto</code> → generated <strong>stubs</strong>; you implement handlers.</li>
        <li>Four styles: unary, server stream, client stream, bidi — start unary.</li>
        <li>Always set <strong>deadlines</strong>; honor cancellation. Check <strong>gRPC status</strong> (not only HTTP 200).</li>
        <li>Browsers need <strong>gRPC-Web</strong> or a JSON gateway — not raw native gRPC.</li>
      </ol>
    </div>

    <h2 class="section-anchor" id="gr-what">What gRPC is (and is not)</h2>
    <p><strong>gRPC</strong> is a Remote Procedure Call framework: declare methods on a service; clients call them like functions; the framework handles marshalling, transport, and status.</p>
    <div class="tile-grid">
      <div class="cds-tile"><h3>Is not</h3><p>Only “HTTP/2” or only “Protobuf” — those are transport and payload. gRPC adds RPC semantics.</p></div>
      <div class="cds-tile"><h3>Is not</h3><p>A drop-in for every public REST/JSON API. Great for service-to-service; browsers need gRPC-Web or a gateway.</p></div>
      <div class="cds-tile"><h3>Is not</h3><p>Your business logic — you still implement handlers.</p></div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>You already know</th><th>gRPC analogue</th></tr></thead>
      <tbody>
        <tr><td>OpenAPI operation</td><td><code>rpc</code> method</td></tr>
        <tr><td>REST controller</td><td>Service implementation</td></tr>
        <tr><td>Generated OpenAPI client</td><td>Generated <strong>client stub</strong></td></tr>
        <tr><td>HTTP status + problem+json</td><td>gRPC <strong>status code</strong> + optional error details</td></tr>
        <tr><td>WebSocket stream</td><td>Server / client / bidi streaming RPCs</td></tr>
      </tbody>
    </table></div>

    <h2 class="section-anchor" id="gr-stack">Where it sits in the stack</h2>
    <pre class="code">┌─────────────────────────────────────────────────────────┐
│  Your application (handlers / use-cases)                │
├─────────────────────────────────────────────────────────┤
│  gRPC stubs &amp; runtime (deadlines, status, streaming)    │  ← RPC API
├─────────────────────────────────────────────────────────┤
│  Protobuf encode/decode (messages)                      │  ← Payload
├─────────────────────────────────────────────────────────┤
│  HTTP/2 (streams, multiplexing, headers/trailers)       │  ← Transport
├─────────────────────────────────────────────────────────┤
│  TCP / TLS                                              │
└─────────────────────────────────────────────────────────┘</pre>
    <p><strong>One unary call on the wire:</strong></p>
    <pre class="code">Client stub.Remember(req)
  → HTTP/2 request stream
      path:   /package.Service/Method
      body:   length-prefixed protobuf bytes
  ← HTTP/2 response
      body:   protobuf bytes
      trailers: grpc-status, grpc-message</pre>
    <div class="fig">
      <div class="mermaid-wrap"><pre class="mermaid">
flowchart TB
  APP["Your handlers"] --> GRPC["gRPC runtime · stubs"]
  GRPC --> PB["Protobuf messages"]
  PB --> H2["HTTP/2 streams"]
  H2 --> TLS["TLS / TCP"]
      </pre></div>
      <p class="fig-caption">Figure — Application → RPC → payload → transport.</p>
    </div>

    <h2 class="section-anchor" id="gr-history">Brief history</h2>
    <ul>
      <li>Google’s internal predecessor: <strong>Stubby</strong>.</li>
      <li><strong>gRPC</strong> open-sourced <strong>2015</strong> (later CNCF).</li>
      <li>Default choice for many polyglot microservice meshes, mobile backends, and cloud control planes.</li>
    </ul>

    <h2 class="section-anchor" id="gr-core">Core concepts: service, RPC, stub</h2>
    <pre class="code">service ContextService {
  rpc Health(HealthRequest) returns (HealthResponse);
  rpc Remember(RememberRequest) returns (RememberResponse);
}</pre>
    <div class="table-wrap"><table>
      <thead><tr><th>Term</th><th>Meaning</th></tr></thead>
      <tbody>
        <tr><td><strong>Service</strong></td><td>Named API surface (<code>ContextService</code>)</td></tr>
        <tr><td><strong>RPC / method</strong></td><td>One callable operation (<code>Remember</code>)</td></tr>
        <tr><td><strong>Request / response</strong></td><td>Protobuf <strong>messages</strong></td></tr>
      </tbody>
    </table></div>
    <p>Fully-qualified method path (what HTTP/2 sees):</p>
    <pre class="code">/ajara.context.v1.ContextService/Remember</pre>
    <h3>Stub</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>Side</th><th>Stub role</th></tr></thead>
      <tbody>
        <tr><td><strong>Client stub</strong></td><td>Methods you call; opens channel, marshals request, waits for response</td></tr>
        <tr><td><strong>Server stub / skeleton</strong></td><td>Interface or base class <strong>you implement</strong></td></tr>
      </tbody>
    </table></div>
    <div class="callout">Contract: <code>ContextService</code> (from <code>.proto</code>). Implementation: <code>ContextGrpcService implements ContextService</code> — naming split is normal.</div>

    <h2 class="section-anchor" id="gr-sides">Server vs client responsibilities</h2>
    <div class="tile-grid">
      <div class="cds-tile"><h3>Server host runs</h3><p>App process, your implementation, generated server bindings + messages, downstream deps (DB, queues, other RPCs).</p></div>
      <div class="cds-tile"><h3>Client machine runs</h3><p>Client app / agent / another service, generated <strong>client</strong> stub + messages, network access.</p></div>
    </div>
    <p>Clients do <strong>not</strong> need your domain packages or database — only the schema (or SDK) and an endpoint.</p>

    <h2 class="section-anchor" id="gr-styles">The four RPC interaction styles</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Style</th><th>Signature</th><th>When to use</th></tr></thead>
      <tbody>
        <tr><td><strong>Unary</strong></td><td><code>rpc Foo(Req) returns (Resp)</code></td><td>Default request/response</td></tr>
        <tr><td><strong>Server streaming</strong></td><td><code>returns (stream Resp)</code></td><td>Subscribe, feeds, large result pages as stream</td></tr>
        <tr><td><strong>Client streaming</strong></td><td><code>rpc Foo(stream Req) returns (Resp)</code></td><td>Upload many parts → one summary</td></tr>
        <tr><td><strong>Bidirectional</strong></td><td><code>rpc Foo(stream Req) returns (stream Resp)</code></td><td>Interactive duplex</td></tr>
      </tbody>
    </table></div>
    <div class="illus" aria-hidden="true">
      <svg viewBox="0 0 680 120" xmlns="http://www.w3.org/2000/svg" width="680" height="120">
        <rect width="680" height="120" fill="#f8f9fa"/>
        <text x="40" y="28" font-weight="600" fill="#42338f" font-family="IBM Plex Sans,sans-serif" font-size="13">Unary</text>
        <path d="M40 50 H140" stroke="#42338f" marker-end="url(#a)"/>
        <path d="M140 70 H40" stroke="#52b7dc" marker-end="url(#b)"/>
        <text x="200" y="28" font-weight="600" fill="#42338f" font-family="IBM Plex Sans,sans-serif" font-size="13">Server stream</text>
        <path d="M200 50 H300" stroke="#42338f"/>
        <path d="M300 62 H200" stroke="#52b7dc"/>
        <path d="M300 74 H200" stroke="#52b7dc"/>
        <path d="M300 86 H200" stroke="#52b7dc"/>
        <text x="360" y="28" font-weight="600" fill="#42338f" font-family="IBM Plex Sans,sans-serif" font-size="13">Client stream</text>
        <path d="M360 50 H460" stroke="#42338f"/>
        <path d="M360 62 H460" stroke="#42338f"/>
        <path d="M360 74 H460" stroke="#42338f"/>
        <path d="M460 90 H360" stroke="#52b7dc"/>
        <text x="520" y="28" font-weight="600" fill="#42338f" font-family="IBM Plex Sans,sans-serif" font-size="13">Bidi</text>
        <path d="M520 50 H620" stroke="#42338f"/>
        <path d="M620 62 H520" stroke="#52b7dc"/>
        <path d="M520 74 H620" stroke="#42338f"/>
        <path d="M620 86 H520" stroke="#52b7dc"/>
        <defs>
          <marker id="a" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#42338f"/></marker>
          <marker id="b" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#52b7dc"/></marker>
        </defs>
      </svg>
    </div>
    <p>Most product APIs start <strong>unary</strong>. Add streaming when the interaction <em>naturally</em> is a stream. Each stream element is still a protobuf message on an HTTP/2 stream.</p>

    <h2 class="section-anchor" id="gr-deadline">Deadlines, cancellation, and timeouts</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Concept</th><th>Meaning</th></tr></thead>
      <tbody>
        <tr><td><strong>Deadline</strong></td><td>Absolute time by which the call must finish; propagated to the server</td></tr>
        <tr><td><strong>Cancellation</strong></td><td>Client aborts; server should observe and release resources</td></tr>
        <tr><td><strong>Timeout</strong></td><td>Client-side bound that usually sets a deadline</td></tr>
      </tbody>
    </table></div>
    <div class="callout"><strong>Practice:</strong> set deadlines on outbound calls; honor context cancellation in handlers (especially DB and nested RPCs).</div>

    <h2 class="section-anchor" id="gr-meta">Metadata (headers)</h2>
    <p><strong>Metadata</strong> = key/value pairs with a call (like HTTP headers). Typical uses: auth tokens (<code>authorization</code>), request IDs / trace context, tenant / locale hints, custom app headers (lowercase ASCII keys by convention).</p>
    <div class="callout">Metadata is <strong>not</strong> a substitute for request fields that belong in the contract. Prefer protobuf fields for business data; metadata for cross-cutting transport concerns.</div>

    <h2 class="section-anchor" id="gr-status">Status codes and errors</h2>
    <p>Every finished RPC has a <strong>status</strong>:</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Code</th><th>Rough meaning</th></tr></thead>
      <tbody>
        <tr><td><code>OK</code></td><td>Success</td></tr>
        <tr><td><code>INVALID_ARGUMENT</code></td><td>Bad request shape/values</td></tr>
        <tr><td><code>NOT_FOUND</code></td><td>Missing entity</td></tr>
        <tr><td><code>ALREADY_EXISTS</code></td><td>Conflict on create</td></tr>
        <tr><td><code>PERMISSION_DENIED</code> / <code>UNAUTHENTICATED</code></td><td>AuthZ / AuthN</td></tr>
        <tr><td><code>FAILED_PRECONDITION</code></td><td>State not ready</td></tr>
        <tr><td><code>RESOURCE_EXHAUSTED</code></td><td>Quota / rate limit</td></tr>
        <tr><td><code>UNAVAILABLE</code></td><td>Transient; retry with care</td></tr>
        <tr><td><code>DEADLINE_EXCEEDED</code></td><td>Too slow</td></tr>
        <tr><td><code>INTERNAL</code></td><td>Bug / unexpected</td></tr>
      </tbody>
    </table></div>
    <p>Optional <strong>rich error details</strong> (protobuf <code>Any</code> payloads, Google’s <code>error_details.proto</code>) attach structured machine-readable context.</p>
    <div class="callout">Do <strong>not</strong> overload <code>OK</code> with “logical failure” flags unless the API deliberately models soft failures in the response (e.g. <code>found = false</code>). Be consistent. HTTP may be <code>200</code> while gRPC status is <code>NOT_FOUND</code>.</div>

    <h2 class="section-anchor" id="gr-channel">Channels, connections, and load balancing</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Concept</th><th>Role</th></tr></thead>
      <tbody>
        <tr><td><strong>Channel</strong></td><td>Long-lived virtual connection to a target; multiplexes many RPCs</td></tr>
        <tr><td><strong>Subchannel / connection</strong></td><td>Actual HTTP/2 connection(s) under the channel</td></tr>
        <tr><td><strong>Load balancing</strong></td><td>Client-side policies (<code>pick_first</code>, <code>round_robin</code>, …) or proxy (Envoy, mesh)</td></tr>
        <tr><td><strong>Name resolution</strong></td><td>DNS, xDS, custom resolvers → addresses</td></tr>
      </tbody>
    </table></div>
    <p>Because HTTP/2 <strong>multiplexes</strong>, one connection carries many concurrent RPCs.</p>

    <h2 class="section-anchor" id="gr-sec">Security (TLS and auth)</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Layer</th><th>Typical approach</th></tr></thead>
      <tbody>
        <tr><td>Transport</td><td><strong>TLS</strong> (almost always in production)</td></tr>
        <tr><td>Service identity</td><td>mTLS in meshes</td></tr>
        <tr><td>User/app auth</td><td>Bearer tokens / JWT in metadata; SPIFFE; API keys</td></tr>
      </tbody>
    </table></div>
    <p>Cleartext gRPC is for local lab only.</p>

    <h2 class="section-anchor" id="gr-intercept">Interceptors / middleware</h2>
    <p>Most stacks support client and server <strong>interceptors</strong>:</p>
    <ul>
      <li>Logging / metrics</li>
      <li>Authn / Authz checks</li>
      <li>Deadline defaults</li>
      <li>Retries / hedged requests (careful — not all methods are idempotent)</li>
      <li>Validation</li>
    </ul>
    <p>Prefer interceptors for cross-cutting concerns; keep handlers focused on domain logic.</p>

    <h2 class="section-anchor" id="gr-rest">gRPC vs REST (practical)</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Concern</th><th>Typical REST/JSON</th><th>Typical gRPC</th></tr></thead>
      <tbody>
        <tr><td>Contract</td><td>OpenAPI</td><td><code>.proto</code> services</td></tr>
        <tr><td>Payload</td><td>JSON text</td><td>Protobuf binary</td></tr>
        <tr><td>Transport</td><td>HTTP/1.1 or HTTP/2</td><td>HTTP/2</td></tr>
        <tr><td>Browser</td><td>Native <code>fetch</code></td><td>Needs gRPC-Web or gateway</td></tr>
        <tr><td>Streaming</td><td>SSE / WebSocket / chunked</td><td>First-class stream RPCs</td></tr>
        <tr><td>Human debug</td><td>Easy in browser</td><td>grpcurl / reflection / ProtoMap</td></tr>
        <tr><td>Codegen</td><td>Optional</td><td>Central</td></tr>
      </tbody>
    </table></div>
    <p><strong>Use gRPC when:</strong> polyglot internal APIs, strong typing, performance, streaming.<br>
    <strong>Use REST/JSON when:</strong> public browser-first HTTP, cacheable GETs, widest tooling familiarity.<br>
    Many systems expose <strong>both</strong>: gRPC internally + HTTP/JSON gateway externally.</p>

    <h2 class="section-anchor" id="gr-web">gRPC-Web and browsers</h2>
    <p>Browsers cannot speak full raw gRPC/HTTP/2 the same way native clients do in all environments. <strong>gRPC-Web</strong> adapts the protocol (often via Envoy or a dedicated proxy):</p>
    <ul>
      <li>Slightly different framing</li>
      <li>Often unary + server-streaming first; bidi support varies by stack</li>
      <li>A translation layer in front of your gRPC server</li>
    </ul>
    <p>Alternatively: keep gRPC for backends; expose REST/JSON via grpc-gateway / Connect / custom façade for browsers.</p>

    <h2 class="section-anchor" id="gr-tools">Tooling and workflows</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Tool</th><th>Purpose</th></tr></thead>
      <tbody>
        <tr><td><code>protoc</code> + plugins</td><td>Generate stubs</td></tr>
        <tr><td>Buf</td><td>Lint, breaking-change detection, module registry</td></tr>
        <tr><td>grpcurl</td><td>CLI calls (curl for gRPC)</td></tr>
        <tr><td>Server reflection</td><td>Discover services at runtime for tooling</td></tr>
        <tr><td>ProtoMap</td><td>Explore <code>.proto</code> contracts visually</td></tr>
        <tr><td>Quarkus gRPC / grpc-java / grpc-go</td><td>Language runtimes</td></tr>
      </tbody>
    </table></div>
    <div class="step-cards">
      <div class="step-card"><div><h3>Design .proto</h3><p>Review messages + RPCs.</p></div></div>
      <div class="step-card"><div><h3>Lint / breaking check</h3><p>Buf in CI.</p></div></div>
      <div class="step-card"><div><h3>Generate &amp; implement</h3><p>Server handlers.</p></div></div>
      <div class="step-card"><div><h3>Exercise</h3><p>grpcurl / tests; publish SDK or schema.</p></div></div>
    </div>

    <h2 class="section-anchor" id="gr-design">Design guidelines for public APIs</h2>
    <ol>
      <li><strong>One service per domain boundary</strong> (avoid mega-services).</li>
      <li><strong>Separate Request/Response messages</strong> even when thin.</li>
      <li>Prefer <strong>noun resources + clear verbs</strong> (<code>GetMemory</code>, <code>ListTurns</code>).</li>
      <li>Use standard status codes; document soft-failure fields if used.</li>
      <li>Version via package (<code>…v1</code>) and additive evolution inside a major version.</li>
      <li>Keep <strong>idempotency</strong> explicit for retries (<code>UNAVAILABLE</code> + client retry).</li>
      <li>Don’t put large opaque blobs in metadata; use message fields or streaming.</li>
      <li>Document deadline expectations for slow RPCs (hydrate, search).</li>
    </ol>

    <h2 class="section-anchor" id="gr-obs">Observability</h2>
    <ul>
      <li><strong>Latency</strong> per method (p50/p95/p99)</li>
      <li><strong>Status code</strong> rates</li>
      <li><strong>Request / response size</strong></li>
      <li>Trace propagation (W3C / gRPC metadata)</li>
    </ul>
    <p>Distributed tracing pairs well with gRPC because method names are stable and typed.</p>

    <h2 class="section-anchor" id="gr-pitfalls">Common pitfalls</h2>
    <ol>
      <li>Treating gRPC as “just faster REST” without designing RPCs and errors carefully.</li>
      <li>Missing deadlines → hung resource chains.</li>
      <li>Retrying non-idempotent methods blindly.</li>
      <li>Huge unbounded unary responses instead of pagination or streaming.</li>
      <li>Assuming browsers can call native gRPC directly.</li>
      <li>Leaking internal error strings as <code>INTERNAL</code> messages to untrusted clients.</li>
      <li>Confusing <strong>Protobuf package version</strong> (<code>v1</code>) with <strong>gRPC protocol version</strong>.</li>
    </ol>

    <h2 class="section-anchor" id="gr-protomap">How to read a gRPC API in ProtoMap</h2>
    <div class="step-cards">
      <div class="step-card"><div><h3>Open .proto files</h3><p>Multi-file is fine.</p></div></div>
      <div class="step-card"><div><h3>Switch to Services</h3><p>For each rpc: name, request, response, streaming?</p></div></div>
      <div class="step-card"><div><h3>Drill into messages</h3><p>Request/response and shared entities.</p></div></div>
      <div class="step-card"><div><h3>Map mentally</h3><p><code>rpc X</code> → server method → domain facade. Sketch happy path + one error path.</p></div></div>
    </div>
    <pre class="code">service → rpc list → request/response messages → shared entities → enums</pre>

    <h2 class="section-anchor" id="gr-ref">Quick reference &amp; glossary</h2>
    <pre class="code">syntax = "proto3";
package example.v1;

service ItemService {
  rpc GetItem(GetItemRequest) returns (GetItemResponse);           // unary
  rpc WatchItems(WatchRequest) returns (stream ItemEvent);         // server stream
}

message GetItemRequest { string id = 1; }
message GetItemResponse { Item item = 1; bool found = 2; }
message Item { string id = 1; string name = 2; }</pre>
    <div class="table-wrap"><table>
      <thead><tr><th>Term</th><th>One-liner</th></tr></thead>
      <tbody>
        <tr><td>Service</td><td>API surface grouping RPCs</td></tr>
        <tr><td>RPC</td><td>One remote method</td></tr>
        <tr><td>Stub</td><td>Generated client/server adapter</td></tr>
        <tr><td>Unary</td><td>One req → one resp</td></tr>
        <tr><td>Stream</td><td>Sequence of messages on one call</td></tr>
        <tr><td>Metadata</td><td>Headers for the call</td></tr>
        <tr><td>Status</td><td>Outcome code (+ optional details)</td></tr>
        <tr><td>Channel</td><td>Multiplexed connection abstraction</td></tr>
        <tr><td>Deadline</td><td>When the call must finish</td></tr>
      </tbody>
    </table></div>
    <details class="deep">
      <summary>Further reading</summary>
      <ul>
        <li><a href="https://grpc.io/docs/what-is-grpc/core-concepts/" target="_blank" rel="noopener">gRPC Core Concepts</a></li>
        <li><a href="https://grpc.github.io/grpc/core/md_doc_statuscodes.html" target="_blank" rel="noopener">gRPC Status Codes</a></li>
        <li><a href="#/learn/protobuf">ProtoMap Protobuf lesson</a></li>
        <li><a href="#/learn/http2">ProtoMap HTTP/2 lesson</a></li>
        <li><a href="https://grpc.io/docs/" target="_blank" rel="noopener">grpc.io docs</a></li>
      </ul>
    </details>
`),
  prev: { hash: "#/learn/protobuf", label: "Protobuf" },
  next: { hash: "#/learn/http2", label: "Next: HTTP/2" },
};
