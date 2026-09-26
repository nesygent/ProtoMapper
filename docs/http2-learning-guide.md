# HTTP/2 — Complete Learning Guide

A practical guide for experienced IT professionals who already know HTTP/1.1, TCP, TLS, and APIs — and want a crisp mental model of **HTTP/2**, especially as the **default transport under gRPC**.

Companion guides in this repo:

- [Protocol Buffers](protobuf-learning-guide.md) — payload / IDL  
- [gRPC](grpc-learning-guide.md) — RPC framework that usually rides on HTTP/2  

---

## Table of contents

1. [What HTTP/2 is (and is not)](#1-what-http2-is-and-is-not)
2. [Why HTTP/2 exists (HTTP/1.1 pain)](#2-why-http2-exists-http11-pain)
3. [Where HTTP/2 sits vs gRPC and Protobuf](#3-where-http2-sits-vs-grpc-and-protobuf)
4. [Binary framing: the big shift](#4-binary-framing-the-big-shift)
5. [Streams and multiplexing](#5-streams-and-multiplexing)
6. [Messages, frames, and stream lifecycle](#6-messages-frames-and-stream-lifecycle)
7. [HPACK header compression](#7-hpack-header-compression)
8. [Priorities and flow control (enough to know)](#8-priorities-and-flow-control-enough-to-know)
9. [Server push (and why you rarely care now)](#9-server-push-and-why-you-rarely-care-now)
10. [TLS, ALPN, and cleartext (h2c)](#10-tls-alpn-and-cleartext-h2c)
11. [HTTP/2 vs HTTP/1.1 vs HTTP/3](#11-http2-vs-http11-vs-http3)
12. [How gRPC uses HTTP/2](#12-how-grpc-uses-http2)
13. [Debugging and observability](#13-debugging-and-observability)
14. [Performance mental model](#14-performance-mental-model)
15. [Common pitfalls](#15-common-pitfalls)
16. [Quick reference](#16-quick-reference)
17. [Further reading](#17-further-reading)

---

## 1. What HTTP/2 is (and is not)

**HTTP/2** is a major revision of the **HTTP application protocol**. It keeps HTTP’s semantics (methods, status codes, headers, URLs) but **changes how those semantics are carried on the wire**.

It is **not**:

- A replacement for TCP (still usually TCP + TLS; HTTP/3 moves to QUIC/UDP)
- The same thing as **gRPC** (gRPC *uses* HTTP/2; websites also use HTTP/2 for HTML/CSS/JS)
- A new resource model (you still have requests and responses; gRPC maps RPCs onto them)

| Layer | Job |
|-------|-----|
| HTTP semantics | `GET`, `POST`, `:path`, status `200`, headers… |
| **HTTP/2 framing** | How those are split into binary **frames** on **streams** |
| TLS / TCP | Secure byte pipe |

---

## 2. Why HTTP/2 exists (HTTP/1.1 pain)

HTTP/1.1 problems that motivated HTTP/2:

| Pain | Effect |
|------|--------|
| **Head-of-line blocking** at HTTP layer | One slow response delays the next on the same connection (pipelining was fragile) |
| **Many parallel connections** | Browsers opened 6+ TCP connections per host to fake parallelism |
| **Verbose repeated headers** | Cookies / User-Agent sent over and over as text |
| **Text protocol overhead** | Human-readable, but chatty and harder to multiplex cleanly |

HTTP/2’s answer: **one connection**, **many concurrent streams**, **binary frames**, **compressed headers**.

---

## 3. Where HTTP/2 sits vs gRPC and Protobuf

```text
gRPC RPC model          ← methods, status, deadlines
   ↓
Protobuf messages       ← request/response bytes
   ↓
HTTP/2 streams/frames   ← how bytes share one connection
   ↓
TLS / TCP
```

- **Without gRPC:** browsers load sites over HTTP/2 every day.  
- **With gRPC:** each RPC typically maps to **one HTTP/2 stream**, body = protobuf bytes, trailers carry `grpc-status`.

Knowing HTTP/2 helps you understand **why gRPC can multiplex and stream efficiently** — not how to define your API (that’s `.proto`).

---

## 4. Binary framing: the big shift

HTTP/1.1 is largely **text**:

```text
GET /index.html HTTP/1.1
Host: example.com
...
```

HTTP/2 speaks **binary frames**. Clients and servers exchange typed frames (`HEADERS`, `DATA`, `SETTINGS`, `WINDOW_UPDATE`, `PING`, …) rather than raw ASCII request lines.

Implications:

- More efficient to parse  
- Designed for multiplexing  
- Harder to “telnet debug” — use Wireshark, `nghttp`, browser DevTools, or proxy logs  

---

## 5. Streams and multiplexing

### Stream

A **stream** is an independent bidirectional sequence of frames sharing one connection. Each stream has a numeric **stream ID**.

### Multiplexing

Many streams run **at the same time** on **one** TCP connection:

```text
Connection (TCP + TLS)
├── Stream 1  (RPC or page asset A)
├── Stream 3  (RPC or page asset B)
├── Stream 5  (RPC or page asset C)
└── …
```

**Why gRPC loves this:** dozens of concurrent RPCs don’t need dozens of TCP handshakes.

### Caveat: TCP head-of-line blocking

HTTP/2 fixes **HTTP-level** HOL blocking, but a lost TCP packet still stalls the whole connection (all streams). **HTTP/3 / QUIC** addresses that at the transport layer. For most gRPC deployments on reliable DCs, HTTP/2 is still excellent.

---

## 6. Messages, frames, and stream lifecycle

Rough vocabulary:

| Term | Meaning |
|------|---------|
| **Frame** | Smallest HTTP/2 unit on the wire |
| **Message** | Logical HTTP request or response (headers + optional body), possibly split across frames |
| **Stream** | Carrier for one request/response exchange (or long-lived stream of messages in protocols like gRPC streaming) |

Typical unary flow:

1. Client opens stream, sends `HEADERS` (+ maybe `DATA`)  
2. Server responds `HEADERS` + `DATA`  
3. Stream closes (END_STREAM flags)  

gRPC **streaming RPCs** keep the stream open longer and send multiple length-prefixed messages as `DATA`.

---

## 7. HPACK header compression

HTTP/2 compresses headers with **HPACK**:

- Static table of common header names/values  
- Dynamic table learned per connection  
- Avoids resending bulky identical headers every request  

**Operational note:** huge or highly variable headers reduce HPACK benefit and can pressure memory (dynamic table). Keep metadata lean (same advice as gRPC metadata hygiene).

---

## 8. Priorities and flow control (enough to know)

### Flow control

HTTP/2 has **per-stream and per-connection window** sizes so a fast sender cannot overwhelm a slow receiver (`WINDOW_UPDATE` frames).

gRPC / HTTP/2 stacks manage this; you notice it when:

- Large uploads/downloads stall  
- Window sizes are poorly tuned under extreme load  

### Priorities

HTTP/2 originally had stream priority hints (browsers: HTML before images). Priority signaling evolved over RFCs; as an API developer you rarely configure this for gRPC.

---

## 9. Server push (and why you rarely care now)

**Server push** let servers preemptively send assets the client might need. Browsers and CDNs largely moved away from it (cache issues, wasted bandwidth). **gRPC does not depend on server push.** You can ignore push for RPC work.

---

## 10. TLS, ALPN, and cleartext (h2c)

| Mode | Meaning |
|------|---------|
| **h2** | HTTP/2 over **TLS** (normal production) |
| **h2c** | HTTP/2 **cleartext** (lab, some mesh sidecars on trusted links) |

**ALPN** (Application-Layer Protocol Negotiation) during TLS handshake selects `h2` vs `http/1.1`.

Production gRPC nearly always uses **TLS + h2**. Local Quarkus/dev setups may use plaintext for convenience — don’t copy that to the public internet.

---

## 11. HTTP/2 vs HTTP/1.1 vs HTTP/3

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|--|----------|--------|--------|
| Wire format | Text | Binary frames | Binary over **QUIC** |
| Multiplexing | Poor / many conns | Excellent on one TCP conn | Multiplexed without TCP HOL |
| Transport | TCP | TCP | UDP (QUIC) |
| gRPC | Not native default | **Default** | Emerging / limited support by stack |

For “how does my Quarkus gRPC service talk today?” → assume **HTTP/2**.

---

## 12. How gRPC uses HTTP/2

Mapping (simplified):

| gRPC idea | HTTP/2 idea |
|-----------|-------------|
| One RPC call | One stream |
| Method name | `:path` like `/package.Service/Method` |
| Request protobuf | `DATA` frames (with gRPC length prefix) |
| Response protobuf | `DATA` frames |
| gRPC status | Often HTTP **trailers** (`grpc-status`, `grpc-message`) |
| Metadata | Headers (and sometimes trailers) |
| Streaming RPC | Multiple messages on the same stream |

**Important:** HTTP status may be `200` even when gRPC status is `NOT_FOUND`. Always check **gRPC status**, not only HTTP status, when debugging RPC failures.

Pseudo-view of a unary call:

```text
HEADERS
  :method = POST
  :path   = /ajara.context.v1.ContextService/Remember
  content-type = application/grpc
DATA
  [compressed-flag][length][protobuf bytes]
...
HEADERS / trailers
  grpc-status = 0
```

Details vary by implementation; the mental model above is enough for most engineers.

---

## 13. Debugging and observability

| Tool / approach | Use |
|-----------------|-----|
| grpcurl | Exercise RPCs without caring about frames |
| Server logs / metrics | Latency, status codes |
| Proxy (Envoy) access logs | Path, upstream, codes |
| Wireshark / `nghttp` | Deep frame-level debugging |
| TLS key log | Decrypt local captures (lab only) |

For application work, stay at the **gRPC layer** unless you suspect connection/multiplexing issues.

---

## 14. Performance mental model

**Wins:**

- Fewer connections, less TLS handshake churn  
- Concurrent RPCs on one channel  
- Binary protocol + compressed headers  
- Natural fit for streaming

**Limits:**

- Single TCP connection can become a bottleneck if one lossy path stalls all streams (HTTP/3 motivation)  
- Huge messages still hurt (payload design / streaming / pagination matter more than HTTP version)  
- Thread/executor tuning on servers often dominates micro-optimizations of frames  

**Rule:** design efficient RPCs and payloads first; HTTP/2 is already a strong transport.

---

## 15. Common pitfalls

1. Equating “uses HTTP/2” with “is gRPC.”  
2. Debugging gRPC failures using **HTTP status alone**.  
3. Opening many channels when one multiplexed channel would do.  
4. Expecting browser `fetch` to speak native gRPC/HTTP/2 framing.  
5. Forgetting flow control when blasting large streams.  
6. Assuming HTTP/2 magically makes a chatty N+1 API fast — it won’t.

---

## 16. Quick reference

```text
HTTP/1.1  many text requests, limited multiplexing
HTTP/2    binary frames, many streams × one connection, HPACK
HTTP/3    similar multiplexing ideas over QUIC (UDP)

gRPC default transport = HTTP/2
gRPC default payload   = Protobuf
```

| Term | One-liner |
|------|-----------|
| Frame | Smallest HTTP/2 wire unit |
| Stream | Independent conversation on a connection |
| Multiplexing | Many streams sharing one connection |
| HPACK | Header compression |
| h2 / h2c | HTTP/2 over TLS / cleartext |
| ALPN | Negotiates `h2` during TLS |
| Trailers | Headers after the body (gRPC status lives here often) |

---

## 17. Further reading

- [HTTP/2 RFC 9113](https://www.rfc-editor.org/rfc/rfc9113)  
- [HPACK RFC 7541](https://www.rfc-editor.org/rfc/rfc7541)  
- [gRPC over HTTP/2](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md)  
- [ProtoMap gRPC guide](grpc-learning-guide.md)  
- [ProtoMap Protobuf guide](protobuf-learning-guide.md)  

---

*Written for ProtoMap — HTTP/2 is the road; gRPC is the vehicle; Protobuf is the cargo.*
