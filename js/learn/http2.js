const P = (s) => s.trim();

const toc = (route, items) => `
  <nav class="learn-toc" aria-label="On this page">
    <p class="learn-toc__title">On this page</p>
    ${items.map(([id, label]) => `<a href="#/learn/${route}" data-scroll="${id}">${label}</a>`).join("")}
  </nav>`;

export default {
  title: "HTTP/2",
  kicker: "Component 3 of 3 · Transport under gRPC",
  lede: "Binary frames, streams, multiplexing, HPACK, flow control, TLS/ALPN, how gRPC maps onto streams and trailers — the full transport picture from the learning guide.",
  tocHtml: toc("http2", [
    ["h2-exec", "Executive summary"],
    ["h2-what", "What HTTP/2 is"],
    ["h2-why", "Why it exists"],
    ["h2-stack", "vs gRPC & Protobuf"],
    ["h2-binary", "Binary framing"],
    ["h2-mux", "Streams & multiplexing"],
    ["h2-life", "Messages & lifecycle"],
    ["h2-hpack", "HPACK"],
    ["h2-flow", "Flow control & priority"],
    ["h2-push", "Server push"],
    ["h2-tls", "TLS · ALPN · h2c"],
    ["h2-vers", "HTTP/1.1 · 2 · 3"],
    ["h2-grpc", "How gRPC uses it"],
    ["h2-debug", "Debugging"],
    ["h2-perf", "Performance model"],
    ["h2-pitfalls", "Pitfalls"],
    ["h2-ref", "Quick reference"]
  ]),
  body: P(`
    <div class="summary-box" id="h2-exec">
      <h2>Executive summary</h2>
      <ol>
        <li>HTTP/2 keeps HTTP <strong>semantics</strong> but changes the <strong>wire</strong>: binary frames, many streams on one connection, HPACK headers.</li>
        <li>gRPC’s default transport: one RPC ≈ one HTTP/2 stream; status often in <strong>trailers</strong> (<code>grpc-status</code>).</li>
        <li>Fixes HTTP-layer head-of-line blocking; TCP packet loss can still stall all streams (HTTP/3 motivation).</li>
        <li>Production: <strong>h2</strong> over TLS (ALPN). <code>h2c</code> = cleartext for lab/mesh only.</li>
        <li>Always check <strong>gRPC status</strong>, not only HTTP 200, when debugging RPCs.</li>
      </ol>
    </div>

    <h2 class="section-anchor" id="h2-what">What HTTP/2 is (and is not)</h2>
    <p><strong>HTTP/2</strong> is a major revision of the HTTP application protocol. It keeps methods, status codes, headers, and URLs — but changes how those semantics are carried on the wire.</p>
    <div class="tile-grid">
      <div class="cds-tile"><h3>Is not</h3><p>A replacement for TCP (still usually TCP + TLS; HTTP/3 → QUIC/UDP).</p></div>
      <div class="cds-tile"><h3>Is not</h3><p>The same thing as gRPC — gRPC <em>uses</em> HTTP/2; websites also use HTTP/2 for HTML/CSS/JS.</p></div>
      <div class="cds-tile"><h3>Is not</h3><p>A new resource model — you still have requests and responses.</p></div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Layer</th><th>Job</th></tr></thead>
      <tbody>
        <tr><td>HTTP semantics</td><td><code>GET</code>, <code>POST</code>, <code>:path</code>, status <code>200</code>, headers…</td></tr>
        <tr><td><strong>HTTP/2 framing</strong></td><td>How those are split into binary <strong>frames</strong> on <strong>streams</strong></td></tr>
        <tr><td>TLS / TCP</td><td>Secure byte pipe</td></tr>
      </tbody>
    </table></div>

    <h2 class="section-anchor" id="h2-why">Why HTTP/2 exists (HTTP/1.1 pain)</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Pain</th><th>Effect</th></tr></thead>
      <tbody>
        <tr><td><strong>Head-of-line blocking</strong> at HTTP layer</td><td>One slow response delays the next on the same connection</td></tr>
        <tr><td><strong>Many parallel connections</strong></td><td>Browsers opened 6+ TCP connections per host</td></tr>
        <tr><td><strong>Verbose repeated headers</strong></td><td>Cookies / User-Agent resent as text</td></tr>
        <tr><td><strong>Text protocol overhead</strong></td><td>Chatty; harder to multiplex cleanly</td></tr>
      </tbody>
    </table></div>
    <p>HTTP/2’s answer: <strong>one connection</strong>, <strong>many concurrent streams</strong>, <strong>binary frames</strong>, <strong>compressed headers</strong>.</p>

    <h2 class="section-anchor" id="h2-stack">Where HTTP/2 sits vs gRPC and Protobuf</h2>
    <pre class="code">gRPC RPC model          ← methods, status, deadlines
   ↓
Protobuf messages       ← request/response bytes
   ↓
HTTP/2 streams/frames   ← how bytes share one connection
   ↓
TLS / TCP</pre>
    <ul>
      <li><strong>Without gRPC:</strong> browsers load sites over HTTP/2 every day.</li>
      <li><strong>With gRPC:</strong> each RPC typically maps to <strong>one HTTP/2 stream</strong>, body = protobuf bytes, trailers carry <code>grpc-status</code>.</li>
    </ul>
    <p>Knowing HTTP/2 explains <strong>why</strong> gRPC multiplexes and streams efficiently — not how to define your API (that’s <code>.proto</code>).</p>

    <h2 class="section-anchor" id="h2-binary">Binary framing: the big shift</h2>
    <p>HTTP/1.1 is largely <strong>text</strong> (<code>GET /index.html HTTP/1.1</code>…). HTTP/2 speaks <strong>binary frames</strong>: typed frames (<code>HEADERS</code>, <code>DATA</code>, <code>SETTINGS</code>, <code>WINDOW_UPDATE</code>, <code>PING</code>, …).</p>
    <ul>
      <li>More efficient to parse</li>
      <li>Designed for multiplexing</li>
      <li>Harder to “telnet debug” — use Wireshark, <code>nghttp</code>, DevTools, or proxy logs</li>
    </ul>

    <h2 class="section-anchor" id="h2-mux">Streams and multiplexing</h2>
    <p>A <strong>stream</strong> is an independent bidirectional sequence of frames sharing one connection. Each stream has a numeric <strong>stream ID</strong>.</p>
    <p><strong>Multiplexing:</strong> many streams run at the same time on <strong>one</strong> TCP connection.</p>
    <div class="illus" aria-hidden="true">
      <svg viewBox="0 0 640 140" xmlns="http://www.w3.org/2000/svg" width="640" height="140">
        <rect width="640" height="140" fill="#f8f9fa"/>
        <text x="24" y="28" font-family="IBM Plex Sans,sans-serif" font-size="14" fill="#42338f" font-weight="600">One TCP+TLS connection</text>
        <rect x="24" y="44" width="592" height="80" fill="none" stroke="#cfd5dd"/>
        <rect x="40" y="64" width="160" height="28" fill="#e5e5fc" stroke="#42338f"/>
        <text x="120" y="83" text-anchor="middle" font-size="11" font-family="IBM Plex Sans,sans-serif" fill="#42338f">Stream 1 · HEADERS</text>
        <rect x="220" y="64" width="160" height="28" fill="#d9ebf4" stroke="#52b7dc"/>
        <text x="300" y="83" text-anchor="middle" font-size="11" font-family="IBM Plex Sans,sans-serif" fill="#007191">Stream 3 · DATA</text>
        <rect x="400" y="64" width="160" height="28" fill="#e5e5fc" stroke="#42338f"/>
        <text x="480" y="83" text-anchor="middle" font-size="11" font-family="IBM Plex Sans,sans-serif" fill="#42338f">Stream 5 · DATA</text>
      </svg>
    </div>
    <div class="callout"><strong>Why gRPC loves this:</strong> dozens of concurrent RPCs don’t need dozens of TCP handshakes.</div>
    <p><strong>Caveat:</strong> HTTP/2 fixes <em>HTTP-level</em> HOL blocking, but a lost TCP packet still stalls the whole connection. <strong>HTTP/3 / QUIC</strong> addresses that. For most gRPC in reliable DCs, HTTP/2 is still excellent.</p>

    <h2 class="section-anchor" id="h2-life">Messages, frames, and stream lifecycle</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Term</th><th>Meaning</th></tr></thead>
      <tbody>
        <tr><td><strong>Frame</strong></td><td>Smallest HTTP/2 unit on the wire</td></tr>
        <tr><td><strong>Message</strong></td><td>Logical HTTP request or response (headers + optional body), possibly split across frames</td></tr>
        <tr><td><strong>Stream</strong></td><td>Carrier for one request/response (or long-lived gRPC streaming)</td></tr>
      </tbody>
    </table></div>
    <p><strong>Typical unary flow:</strong> (1) client opens stream, sends <code>HEADERS</code> (+ maybe <code>DATA</code>) → (2) server responds <code>HEADERS</code> + <code>DATA</code> → (3) stream closes (<code>END_STREAM</code>). gRPC streaming RPCs keep the stream open and send multiple length-prefixed messages as <code>DATA</code>.</p>

    <h2 class="section-anchor" id="h2-hpack">HPACK header compression</h2>
    <p>HTTP/2 compresses headers with <strong>HPACK</strong>: static table of common names/values + dynamic table learned per connection — avoids resending bulky identical headers.</p>
    <div class="callout"><strong>Operational note:</strong> huge or highly variable headers reduce HPACK benefit and pressure memory. Keep metadata lean (same advice as gRPC metadata hygiene).</div>

    <h2 class="section-anchor" id="h2-flow">Priorities and flow control</h2>
    <p><strong>Flow control:</strong> per-stream and per-connection window sizes so a fast sender cannot overwhelm a slow receiver (<code>WINDOW_UPDATE</code>). You notice it when large uploads/downloads stall or windows are poorly tuned.</p>
    <p><strong>Priorities:</strong> original stream priority hints evolved over RFCs; as an API developer you rarely configure this for gRPC.</p>

    <h2 class="section-anchor" id="h2-push">Server push (and why you rarely care)</h2>
    <p><strong>Server push</strong> let servers preemptively send assets. Browsers and CDNs largely moved away from it. <strong>gRPC does not depend on server push</strong> — ignore push for RPC work.</p>

    <h2 class="section-anchor" id="h2-tls">TLS, ALPN, and cleartext (h2c)</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Mode</th><th>Meaning</th></tr></thead>
      <tbody>
        <tr><td><strong>h2</strong></td><td>HTTP/2 over <strong>TLS</strong> (normal production)</td></tr>
        <tr><td><strong>h2c</strong></td><td>HTTP/2 <strong>cleartext</strong> (lab, some mesh sidecars on trusted links)</td></tr>
      </tbody>
    </table></div>
    <p><strong>ALPN</strong> during TLS handshake selects <code>h2</code> vs <code>http/1.1</code>. Production gRPC nearly always uses <strong>TLS + h2</strong>.</p>

    <h2 class="section-anchor" id="h2-vers">HTTP/2 vs HTTP/1.1 vs HTTP/3</h2>
    <div class="table-wrap"><table>
      <thead><tr><th></th><th>HTTP/1.1</th><th>HTTP/2</th><th>HTTP/3</th></tr></thead>
      <tbody>
        <tr><td>Wire format</td><td>Text</td><td>Binary frames</td><td>Binary over <strong>QUIC</strong></td></tr>
        <tr><td>Multiplexing</td><td>Poor / many conns</td><td>Excellent on one TCP conn</td><td>Multiplexed without TCP HOL</td></tr>
        <tr><td>Transport</td><td>TCP</td><td>TCP</td><td>UDP (QUIC)</td></tr>
        <tr><td>gRPC</td><td>Not native default</td><td><strong>Default</strong></td><td>Emerging / limited by stack</td></tr>
      </tbody>
    </table></div>
    <p>For “how does my Quarkus gRPC service talk today?” → assume <strong>HTTP/2</strong>.</p>

    <h2 class="section-anchor" id="h2-grpc">How gRPC uses HTTP/2</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>gRPC idea</th><th>HTTP/2 idea</th></tr></thead>
      <tbody>
        <tr><td>One RPC call</td><td>One stream</td></tr>
        <tr><td>Method name</td><td><code>:path</code> like <code>/package.Service/Method</code></td></tr>
        <tr><td>Request protobuf</td><td><code>DATA</code> frames (with gRPC length prefix)</td></tr>
        <tr><td>Response protobuf</td><td><code>DATA</code> frames</td></tr>
        <tr><td>gRPC status</td><td>Often HTTP <strong>trailers</strong> (<code>grpc-status</code>, <code>grpc-message</code>)</td></tr>
        <tr><td>Metadata</td><td>Headers (and sometimes trailers)</td></tr>
        <tr><td>Streaming RPC</td><td>Multiple messages on the same stream</td></tr>
      </tbody>
    </table></div>
    <div class="callout"><strong>Important:</strong> HTTP status may be <code>200</code> even when gRPC status is <code>NOT_FOUND</code>. Always check <strong>gRPC status</strong>.</div>
    <pre class="code">HEADERS
  :method = POST
  :path   = /ajara.context.v1.ContextService/Remember
  content-type = application/grpc
DATA
  [compressed-flag][length][protobuf bytes]
…
HEADERS / trailers
  grpc-status = 0</pre>

    <h2 class="section-anchor" id="h2-debug">Debugging and observability</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Tool / approach</th><th>Use</th></tr></thead>
      <tbody>
        <tr><td>grpcurl</td><td>Exercise RPCs without caring about frames</td></tr>
        <tr><td>Server logs / metrics</td><td>Latency, status codes</td></tr>
        <tr><td>Proxy (Envoy) access logs</td><td>Path, upstream, codes</td></tr>
        <tr><td>Wireshark / <code>nghttp</code></td><td>Deep frame-level debugging</td></tr>
        <tr><td>TLS key log</td><td>Decrypt local captures (lab only)</td></tr>
      </tbody>
    </table></div>
    <p>For application work, stay at the <strong>gRPC layer</strong> unless you suspect connection/multiplexing issues.</p>

    <h2 class="section-anchor" id="h2-perf">Performance mental model</h2>
    <div class="do-dont">
      <div class="do">
        <h3>Wins</h3>
        <ul>
          <li>Fewer connections, less TLS handshake churn</li>
          <li>Concurrent RPCs on one channel</li>
          <li>Binary protocol + compressed headers</li>
          <li>Natural fit for streaming</li>
        </ul>
      </div>
      <div class="dont">
        <h3>Limits</h3>
        <ul>
          <li>One TCP connection can stall all streams on loss (HTTP/3 motivation)</li>
          <li>Huge messages still hurt — payload design matters more than HTTP version</li>
          <li>Thread/executor tuning often dominates frame micro-opts</li>
        </ul>
      </div>
    </div>
    <div class="callout"><strong>Rule:</strong> design efficient RPCs and payloads first; HTTP/2 is already a strong transport.</div>

    <h2 class="section-anchor" id="h2-pitfalls">Common pitfalls</h2>
    <ol>
      <li>Equating “uses HTTP/2” with “is gRPC.”</li>
      <li>Debugging gRPC failures using <strong>HTTP status alone</strong>.</li>
      <li>Opening many channels when one multiplexed channel would do.</li>
      <li>Expecting browser <code>fetch</code> to speak native gRPC/HTTP/2 framing.</li>
      <li>Forgetting flow control when blasting large streams.</li>
      <li>Assuming HTTP/2 magically makes a chatty N+1 API fast — it won’t.</li>
    </ol>

    <h2 class="section-anchor" id="h2-ref">Quick reference &amp; glossary</h2>
    <pre class="code">HTTP/1.1  many text requests, limited multiplexing
HTTP/2    binary frames, many streams × one connection, HPACK
HTTP/3    similar multiplexing ideas over QUIC (UDP)

gRPC default transport = HTTP/2
gRPC default payload   = Protobuf</pre>
    <div class="table-wrap"><table>
      <thead><tr><th>Term</th><th>One-liner</th></tr></thead>
      <tbody>
        <tr><td>Frame</td><td>Smallest HTTP/2 wire unit</td></tr>
        <tr><td>Stream</td><td>Independent conversation on a connection</td></tr>
        <tr><td>Multiplexing</td><td>Many streams sharing one connection</td></tr>
        <tr><td>HPACK</td><td>Header compression</td></tr>
        <tr><td>h2 / h2c</td><td>HTTP/2 over TLS / cleartext</td></tr>
        <tr><td>ALPN</td><td>Negotiates <code>h2</code> during TLS</td></tr>
        <tr><td>Trailers</td><td>Headers after the body (gRPC status often lives here)</td></tr>
      </tbody>
    </table></div>
    <details class="deep">
      <summary>Further reading</summary>
      <ul>
        <li><a href="https://www.rfc-editor.org/rfc/rfc9113" target="_blank" rel="noopener">HTTP/2 RFC 9113</a></li>
        <li><a href="https://www.rfc-editor.org/rfc/rfc7541" target="_blank" rel="noopener">HPACK RFC 7541</a></li>
        <li><a href="https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md" target="_blank" rel="noopener">gRPC over HTTP/2</a></li>
        <li><a href="#/learn/grpc">ProtoMap gRPC lesson</a></li>
        <li><a href="#/learn/protobuf">ProtoMap Protobuf lesson</a></li>
      </ul>
    </details>
`),
  prev: { hash: "#/learn/grpc", label: "gRPC" },
  next: { hash: "#/learn/together", label: "Next: All together" },
};
