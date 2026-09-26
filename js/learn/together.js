const P = (s) => s.trim();
const toc = (items) => `
  <nav class="learn-toc" aria-label="On this page">
    <p class="learn-toc__title">On this page</p>
    ${items.map(([id, label]) => `<a href="#/learn/together" data-scroll="${id}">${label}</a>`).join("")}
  </nav>`;

export default {
  title: "How Protobuf, gRPC & HTTP/2 fit",
  kicker: "Synthesis · End-to-end vertical slice",
  lede: "One call from client code to your handler: gRPC decides the method, Protobuf shapes the bytes, HTTP/2 multiplexes the stream. This page stitches the three lessons into an operating model.",
  tocHtml: toc([
    ["tg-exec", "Executive summary"],
    ["tg-formula", "The formula"],
    ["tg-blocks", "Protobuf building blocks"],
    ["tg-owner", "Who owns what"],
    ["tg-slice", "Vertical slice"],
    ["tg-frames", "Bytes on the wire"],
    ["tg-failure", "Failure modes"],
    ["tg-decide", "Decision guide"],
    ["tg-path", "Your learning path"],
  ]),
  body: P(`
    <div class="summary-box" id="tg-exec">
      <h2>Executive summary</h2>
      <ol>
        <li><strong>Protobuf</strong> = contract + encoding of messages.</li>
        <li><strong>gRPC</strong> = RPC methods, stubs, deadlines, status, streaming.</li>
        <li><strong>HTTP/2</strong> = how those RPCs share connections as streams/frames.</li>
        <li>You design layers 1–2; frameworks mostly hide layer 3 — until trailers, proxies, or multiplexing bite.</li>
        <li>Open the <strong>Proto Viewer</strong> next and inspect real <code>service</code>/<code>message</code> graphs with this model in mind.</li>
      </ol>
    </div>

    <h2 class="section-anchor" id="tg-formula">One formula</h2>
    <div class="illus" aria-hidden="true">
      <svg viewBox="0 0 680 120" xmlns="http://www.w3.org/2000/svg" width="680" height="120">
        <rect width="680" height="120" fill="#fff"/>
        <rect x="16" y="28" width="140" height="64" fill="#1a73e8"/>
        <text x="86" y="58" text-anchor="middle" fill="#fff" font-family="IBM Plex Sans,sans-serif" font-size="13" font-weight="600">gRPC</text>
        <text x="86" y="76" text-anchor="middle" fill="#d7e9ff" font-family="IBM Plex Sans,sans-serif" font-size="10">RPC API</text>
        <text x="168" y="64" font-size="22" fill="#5f6368">+</text>
        <rect x="188" y="28" width="160" height="64" fill="#42338f"/>
        <text x="268" y="58" text-anchor="middle" fill="#fff" font-family="IBM Plex Sans,sans-serif" font-size="13" font-weight="600">Protobuf</text>
        <text x="268" y="76" text-anchor="middle" fill="#e5e5fc" font-family="IBM Plex Sans,sans-serif" font-size="10">payload</text>
        <text x="360" y="64" font-size="22" fill="#5f6368">+</text>
        <rect x="380" y="28" width="140" height="64" fill="#52b7dc"/>
        <text x="450" y="58" text-anchor="middle" fill="#fff" font-family="IBM Plex Sans,sans-serif" font-size="13" font-weight="600">HTTP/2</text>
        <text x="450" y="76" text-anchor="middle" fill="#d9ebf4" font-family="IBM Plex Sans,sans-serif" font-size="10">transport</text>
        <text x="532" y="64" font-size="22" fill="#5f6368">+</text>
        <rect x="552" y="28" width="112" height="64" fill="#fff6ef" stroke="#f4c4a6"/>
        <text x="608" y="58" text-anchor="middle" fill="#42338f" font-family="IBM Plex Sans,sans-serif" font-size="12" font-weight="600">tooling</text>
        <text x="608" y="76" text-anchor="middle" fill="#5f6368" font-family="IBM Plex Sans,sans-serif" font-size="10">protoc…</text>
      </svg>
    </div>

    <h2 class="section-anchor" id="tg-blocks">Protobuf building blocks (checklist)</h2>
    <p>Before an RPC makes sense, the payload contract must. Every <code>.proto</code> you open in ProtoMap is built from these — all covered in the <a href="#/learn/protobuf">Protobuf lesson</a>:</p>
    <div class="chip-row">
      <span class="chip">syntax</span>
      <span class="chip">package</span>
      <span class="chip">import</span>
      <span class="chip">option</span>
      <span class="chip">message</span>
      <span class="chip">field = N</span>
      <span class="chip">scalar</span>
      <span class="chip">enum</span>
      <span class="chip">repeated</span>
      <span class="chip">map</span>
      <span class="chip">oneof</span>
      <span class="chip">optional</span>
      <span class="chip">reserved</span>
      <span class="chip">service / rpc</span>
    </div>
    <div class="callout">If a lesson felt thin before, it isn’t anymore: Protobuf / gRPC / HTTP/2 lessons now mirror the full learning guides section-by-section, plus well-known types, Editions presence guidance, and official further reading.</div>

    <h2 class="section-anchor" id="tg-owner">Who owns what</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Layer</th><th>You design</th><th>Runtime / platform</th><th>Failure smells</th></tr></thead>
      <tbody>
        <tr><td>Protobuf</td><td>Messages, field numbers, enums, evolution</td><td>Encode/decode</td><td>Wrong defaults, reused tags, giant messages</td></tr>
        <tr><td>gRPC</td><td>Services, RPCs, status semantics, deadlines</td><td>Stubs, channels, retries</td><td>No deadlines, retrying non-idempotent calls</td></tr>
        <tr><td>HTTP/2</td><td>Usually none</td><td>Streams, HPACK, TLS, flow control</td><td>Proxies dropping trailers, h2 negotiation fail</td></tr>
      </tbody>
    </table></div>

    <h2 class="section-anchor" id="tg-slice">Vertical slice — one unary Remember</h2>
    <div class="step-cards">
      <div class="step-card"><div><h3>App calls stub</h3><p><code>stub.remember(cmd)</code> — feels local.</p></div></div>
      <div class="step-card"><div><h3>gRPC marshals</h3><p>Builds <code>RememberRequest</code> protobuf bytes; attaches metadata &amp; deadline.</p></div></div>
      <div class="step-card"><div><h3>HTTP/2 stream opens</h3><p><code>POST /ajara.context.v1.ContextService/Remember</code> on a multiplexed connection.</p></div></div>
      <div class="step-card"><div><h3>Server handler runs</h3><p>Your Quarkus/Java code → Hexis/domain → response message.</p></div></div>
      <div class="step-card"><div><h3>Trailers close the RPC</h3><p><code>grpc-status: 0</code> (OK) or an error code + message.</p></div></div>
    </div>
    <div class="fig">
      <div class="mermaid-wrap"><pre class="mermaid">
sequenceDiagram
  participant App as Client app
  participant Stub as gRPC stub
  participant PB as Protobuf
  participant H2 as HTTP/2
  participant Svc as Server handler
  App->>Stub: remember(cmd)
  Stub->>PB: Serialize RememberRequest
  Stub->>H2: New stream + headers + DATA
  H2->>Svc: Deliver RPC
  Svc->>Svc: Domain / store
  Svc->>PB: Serialize RememberResponse
  Svc->>H2: DATA + trailers status
  H2->>Stub: Frames
  Stub->>PB: Parse response
  Stub->>App: Memory / throw StatusRuntimeException
      </pre></div>
      <p class="fig-caption">Figure — All three components participate in a single successful call.</p>
    </div>

    <h2 class="section-anchor" id="tg-frames">Mental model of the bytes</h2>
    <div class="fig">
      <div class="mermaid-wrap"><pre class="mermaid">
flowchart TB
  subgraph AppLayer["Application"]
    M["RememberRequest message fields"]
  end
  subgraph PBLayer["Protobuf"]
    B["Binary tag-value records"]
  end
  subgraph GRPCLayer["gRPC framing"]
    L["5-byte length prefix + flags"]
  end
  subgraph H2Layer["HTTP/2"]
    F["DATA frames on stream N"]
  end
  M --> B --> L --> F
      </pre></div>
      <p class="fig-caption">Figure — Nesting of formats. Debugging: start at status → messages → only then frames.</p>
    </div>

    <h2 class="section-anchor" id="tg-failure">Cross-layer failure modes</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Symptom</th><th>Likely layer</th><th>First check</th></tr></thead>
      <tbody>
        <tr><td>Unexpected 0 / empty string</td><td>Protobuf presence</td><td><code>optional</code>? documented sentinels?</td></tr>
        <tr><td>Client sees HTTP 200 but error</td><td>gRPC status / trailers</td><td>Read <code>grpc-status</code></td></tr>
        <tr><td>DEADLINE_EXCEEDED</td><td>gRPC deadlines</td><td>Budget + server cancel path</td></tr>
        <tr><td>Works locally, fails via mesh</td><td>HTTP/2 proxy</td><td>Trailers, ALPN, max streams</td></tr>
        <tr><td>Old client breaks after “cleanup”</td><td>Protobuf ABI</td><td>Reused field numbers?</td></tr>
      </tbody>
    </table></div>

    <h2 class="section-anchor" id="tg-decide">When to use this stack</h2>
    <div class="do-dont">
      <div class="do">
        <h3>Prefer gRPC+Protobuf+h2</h3>
        <ul>
          <li>Internal microservice meshes</li>
          <li>Mobile / high QPS typed APIs</li>
          <li>Streaming subscriptions</li>
          <li>Polyglot teams sharing one contract</li>
        </ul>
      </div>
      <div class="dont">
        <h3>Prefer REST/JSON (or dual)</h3>
        <ul>
          <li>Public browser-first APIs</li>
          <li>Cacheable GETs / CDN-heavy reads</li>
          <li>Partners who only speak OpenAPI</li>
          <li>Ultra-simple scripting without stubs</li>
        </ul>
      </div>
    </div>

    <h2 class="section-anchor" id="tg-path">Recommended path from here</h2>
    <div class="fig">
      <div class="mermaid-wrap"><pre class="mermaid">
flowchart LR
  A["1 Protobuf"] --> B["2 gRPC"]
  B --> C["3 HTTP/2"]
  C --> D["4 Together"]
  D --> E["Proto Viewer"]
  E --> F["Your real .proto"]
      </pre></div>
      <p class="fig-caption">Figure — Learning loop: concepts → inspect live contracts in the Viewer.</p>
    </div>
    <p>In the Viewer: start at <strong>Services</strong>, open each RPC, drill into request/response messages, note field numbers and comments, then map RPCs to server classes in your head.</p>
    <p style="margin-top:1.5rem">
      <a class="cds-btn cds-btn--primary" href="#/viewer">Launch Proto Viewer</a>
      <a class="cds-btn cds-btn--tertiary" href="#/learn/protobuf">Replay Protobuf lesson</a>
    </p>
  `),
  prev: { hash: "#/learn/http2", label: "HTTP/2" },
  next: { hash: "#/viewer", label: "Open Viewer" },
};
