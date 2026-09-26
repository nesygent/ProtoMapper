# gRPC — Complete Learning Guide

A practical guide for experienced IT professionals who already know HTTP/JSON APIs, typed languages, and distributed systems — and want a crisp mental model of **gRPC** as an RPC framework.

**Stack reminder:**

```text
gRPC ≈ RPC API  +  Protobuf (default payload)  +  HTTP/2 (default transport)  +  tooling
```

Companion guides in this repo:

- [Protocol Buffers](protobuf-learning-guide.md) — messages, fields, codegen  
- [HTTP/2](http2-learning-guide.md) — the transport under classic gRPC  

Use [ProtoMap](../README.md) to explore real `.proto` `service` / `rpc` definitions while you read.

---

## Table of contents

1. [What gRPC is (and is not)](#1-what-grpc-is-and-is-not)
2. [Where it sits in the stack](#2-where-it-sits-in-the-stack)
3. [Brief history](#3-brief-history)
4. [Core concepts: service, RPC, stub](#4-core-concepts-service-rpc-stub)
5. [Server vs client responsibilities](#5-server-vs-client-responsibilities)
6. [The four RPC interaction styles](#6-the-four-rpc-interaction-styles)
7. [Deadlines, cancellation, and timeouts](#7-deadlines-cancellation-and-timeouts)
8. [Metadata (headers)](#8-metadata-headers)
9. [Status codes and errors](#9-status-codes-and-errors)
10. [Channels, connections, and load balancing](#10-channels-connections-and-load-balancing)
11. [Security (TLS and auth)](#11-security-tls-and-auth)
12. [Interceptors / middleware](#12-interceptors--middleware)
13. [gRPC vs REST (practical comparison)](#13-grpc-vs-rest-practical-comparison)
14. [gRPC-Web and browsers](#14-grpc-web-and-browsers)
15. [Tooling and workflows](#15-tooling-and-workflows)
16. [Design guidelines for public APIs](#16-design-guidelines-for-public-apis)
17. [Observability](#17-observability)
18. [Common pitfalls](#18-common-pitfalls)
19. [How to read a gRPC API in ProtoMap](#19-how-to-read-a-grpc-api-in-protomap)
20. [Quick reference](#20-quick-reference)
21. [Further reading](#21-further-reading)

---

## 1. What gRPC is (and is not)

**gRPC** is a **Remote Procedure Call (RPC) framework**. You declare methods on a service; clients call them like functions; the framework handles marshalling, transport, and status.

It is **not**:

- Only “HTTP/2” (HTTP/2 is the usual transport; gRPC adds RPC semantics on top)
- Only “Protobuf” (Protobuf is the default *payload*; the RPC model is separate)
- A replacement for every REST/JSON public API (great for service-to-service; browsers need gRPC-Web or a gateway)
- Your business logic (you still implement handlers)

| You already know | gRPC analogue |
|------------------|---------------|
| OpenAPI operation | `rpc` method |
| REST controller | Service implementation |
| Generated OpenAPI client | Generated **client stub** |
| HTTP status + problem+json | gRPC **status code** + optional error details |
| WebSocket stream | Server/client/bidi **streaming RPCs** |

---

## 2. Where it sits in the stack

```text
┌─────────────────────────────────────────────────────────┐
│  Your application (handlers / use-cases)                │
├─────────────────────────────────────────────────────────┤
│  gRPC stubs & runtime (deadlines, status, streaming)    │  ← RPC API
├─────────────────────────────────────────────────────────┤
│  Protobuf encode/decode (messages)                      │  ← Payload
├─────────────────────────────────────────────────────────┤
│  HTTP/2 (streams, multiplexing, headers/trailers)       │  ← Transport
├─────────────────────────────────────────────────────────┤
│  TCP / TLS                                              │
└─────────────────────────────────────────────────────────┘
```

**One call on the wire (unary):**

```text
Client stub.Remember(req)
  → HTTP/2 request stream
      path:   /package.Service/Method
      body:   length-prefixed protobuf bytes
  ← HTTP/2 response
      body:   protobuf bytes
      trailers: grpc-status, grpc-message
```

---

## 3. Brief history

- Google’s internal predecessor: **Stubby**
- **gRPC** open-sourced **2015** (CNCF later)
- Became the default choice for many polyglot microservice meshes, mobile backends, and cloud control planes

“Recent” relative to SOAP/REST; mature relative to most new frameworks.

---

## 4. Core concepts: service, RPC, stub

### Service and RPC (IDL)

```protobuf
service ContextService {
  rpc Health(HealthRequest) returns (HealthResponse);
  rpc Remember(RememberRequest) returns (RememberResponse);
}
```

| Term | Meaning |
|------|---------|
| **Service** | Named API surface (`ContextService`) |
| **RPC / method** | One callable operation (`Remember`) |
| **Request / response** | Protobuf **messages** (see protobuf guide) |

Fully-qualified method path (what HTTP/2 sees):

```text
/ajara.context.v1.ContextService/Remember
```

### Stub

**Stub** = generated adapter code.

| Side | Stub role |
|------|-----------|
| **Client stub** | Methods you call; opens channel, marshals request, waits for response |
| **Server stub / skeleton** | Interface or base class **you implement** |

Example naming split (common in Java/Quarkus):

- Contract: `ContextService` (from `.proto`)
- Implementation: `ContextGrpcService implements ContextService`

---

## 5. Server vs client responsibilities

### Server host runs

- Application process (e.g. Quarkus)
- Your service implementation
- Generated server bindings + message classes
- Downstream deps (DB, queues, other RPCs)

### Client machine runs

- Client app / agent / another microservice
- Generated **client** stub + message classes
- Network access to the server

Clients do **not** need your domain packages or database — only the schema (or a published SDK) and an endpoint.

---

## 6. The four RPC interaction styles

| Style | Signature | When to use |
|-------|-----------|-------------|
| **Unary** | `rpc Foo(Req) returns (Resp)` | Default request/response |
| **Server streaming** | `returns (stream Resp)` | Subscribe, feeds, large result pages as stream |
| **Client streaming** | `rpc Foo(stream Req) returns (Resp)` | Upload many parts → one summary |
| **Bidirectional** | `rpc Foo(stream Req) returns (stream Resp)` | Interactive duplex protocols |

Most product APIs start **unary**. Add streaming when the interaction *naturally* is a stream — not because it sounds modern.

Streaming still moves **messages**; each element is a protobuf message on an HTTP/2 stream.

---

## 7. Deadlines, cancellation, and timeouts

gRPC encourages **deadlines** (absolute time by which the call must finish), not only “socket timeout.”

| Concept | Meaning |
|---------|---------|
| **Deadline** | Propagated to the server; server should stop work when exceeded |
| **Cancellation** | Client aborts; server should observe and release resources |
| **Timeout** | Client-side bound that usually sets a deadline |

**Practice:** set deadlines on outbound calls; honor context cancellation in handlers (especially DB and nested RPCs).

---

## 8. Metadata (headers)

**Metadata** = key/value pairs sent with a call (like HTTP headers).

Typical uses:

- Auth tokens (`authorization`)
- Request IDs / trace context
- Tenant / locale hints
- Custom app headers (lowercase ASCII keys by convention)

Metadata is **not** a substitute for request fields that belong in the contract. Prefer protobuf fields for business data; metadata for cross-cutting transport concerns.

---

## 9. Status codes and errors

Every finished RPC has a **status**:

| Code (examples) | Rough meaning |
|-----------------|---------------|
| `OK` | Success |
| `INVALID_ARGUMENT` | Bad request shape/values |
| `NOT_FOUND` | Missing entity |
| `ALREADY_EXISTS` | Conflict on create |
| `PERMISSION_DENIED` / `UNAUTHENTICATED` | AuthZ / AuthN |
| `FAILED_PRECONDITION` | State not ready |
| `RESOURCE_EXHAUSTED` | Quota / rate limit |
| `UNAVAILABLE` | Transient; retry with care |
| `DEADLINE_EXCEEDED` | Too slow |
| `INTERNAL` | Bug / unexpected |

Optional **rich error details** (protobuf `Any` payloads, Google’s `error_details.proto` pattern) can attach structured machine-readable context.

**Do not** overload `OK` with “logical failure” flags unless the API deliberately models soft failures in the response message (e.g. `found = false`). Be consistent.

---

## 10. Channels, connections, and load balancing

| Concept | Role |
|---------|------|
| **Channel** | Long-lived virtual connection to a target; multiplexes many RPCs |
| **Subchannel / connection** | Actual HTTP/2 connection(s) under the channel |
| **Load balancing** | Client-side policies (pick_first, round_robin, …) or proxy (Envoy, service mesh) |
| **Name resolution** | DNS, xDS, custom resolvers → addresses |

Because HTTP/2 **multiplexes**, one connection carries many concurrent RPCs — unlike HTTP/1.1’s one-request-per-connection pattern.

---

## 11. Security (TLS and auth)

| Layer | Typical approach |
|-------|------------------|
| Transport | **TLS** (almost always in production) |
| Service identity | mTLS in meshes |
| User/app auth | Bearer tokens / JWT in metadata; SPIFFE; API keys |

Cleartext gRPC exists for local lab only. Treat public endpoints like any other privileged RPC surface.

---

## 12. Interceptors / middleware

Most stacks support **interceptors** (client and server):

- Logging / metrics
- Authn/Authz checks
- Deadline defaults
- Retries / hedged requests (with care — not all methods are idempotent)
- Validation

Prefer interceptors for cross-cutting concerns; keep handlers focused on domain logic.

---

## 13. gRPC vs REST (practical comparison)

| Concern | Typical REST/JSON | Typical gRPC |
|---------|-------------------|--------------|
| Contract | OpenAPI | `.proto` services |
| Payload | JSON text | Protobuf binary |
| Transport | HTTP/1.1 or HTTP/2 | HTTP/2 |
| Browser | Native `fetch` | Needs gRPC-Web or gateway |
| Streaming | SSE / WebSocket / chunked | First-class stream RPCs |
| Human debug | Easy in browser | Use grpcurl / reflection / ProtoMap |
| Codegen | Optional | Central |

**Use gRPC when:** polyglot internal APIs, strong typing, performance, streaming.  
**Use REST/JSON when:** public browser-first HTTP, cacheable GETs, widest tooling familiarity.

Many systems expose **both**: gRPC internally + HTTP/JSON gateway externally.

---

## 14. gRPC-Web and browsers

Browsers cannot speak full raw gRPC/HTTP/2 the same way native clients do in all environments.

**gRPC-Web** adapts the protocol for browser clients (often via Envoy or a dedicated proxy). Expect:

- Slightly different framing
- Often unary + server-streaming first; bidi support varies by stack
- A translation layer in front of your gRPC server

Alternatively: keep gRPC for backends; expose REST/JSON via grpc-gateway / Connect / custom façade for browsers.

---

## 15. Tooling and workflows

| Tool | Purpose |
|------|---------|
| `protoc` + plugins | Generate stubs |
| Buf | Lint, breaking-change detection, module registry |
| grpcurl | CLI calls (like curl for gRPC) |
| Server reflection | Discover services at runtime for tooling |
| ProtoMap | Explore `.proto` contracts visually |
| Quarkus gRPC / grpc-java / grpc-go | Language runtimes |

**Recommended workflow:**

1. Design `.proto` (review messages + RPCs)  
2. Lint / breaking-change check  
3. Generate & implement server  
4. Exercise with grpcurl / tests  
5. Publish SDK or schema for clients  

---

## 16. Design guidelines for public APIs

1. **One service per domain boundary** (avoid mega-services).
2. **Separate Request/Response messages** even when thin.
3. Prefer **noun resources + clear verbs** in RPC names (`GetMemory`, `ListTurns`).
4. Use standard status codes; document soft-failure fields if used.
5. Version via package (`…v1`) and additive evolution inside a major version.
6. Keep **idempotency** explicit for retries (`UNAVAILABLE` + client retry).
7. Don’t put large opaque blobs in metadata; use message fields or streaming.
8. Document deadline expectations for slow RPCs (hydrate, search).

---

## 17. Observability

Instrument:

- **Latency** per method (p50/p95/p99)
- **Status code** rates
- **Request size** / response size
- Trace propagation (W3C / gRPC metadata)

Distributed tracing pairs well with gRPC because method names are stable and typed.

---

## 18. Common pitfalls

1. Treating gRPC as “just faster REST” without designing RPCs and errors carefully.
2. Missing deadlines → hung resource chains.
3. Retrying non-idempotent methods blindly.
4. Huge unbounded unary responses instead of pagination or streaming.
5. Assuming browsers can call native gRPC directly.
6. Leaking internal error strings as `INTERNAL` messages to untrusted clients.
7. Confusing **Protobuf package version** (`v1`) with **gRPC protocol version**.

---

## 19. How to read a gRPC API in ProtoMap

1. Open the `.proto` files.  
2. Switch to **Services**.  
3. For each `rpc`, note: name, request type, response type, streaming?  
4. Drill into request/response messages (and shared entities).  
5. Mentally map: `rpc X` → server method → domain facade.  
6. Sketch one unary happy path and one error path (`NOT_FOUND`, `INVALID_ARGUMENT`).

Reading order:

```text
service → rpc list → request/response messages → shared entities → enums
```

---

## 20. Quick reference

```protobuf
syntax = "proto3";
package example.v1;

service ItemService {
  rpc GetItem(GetItemRequest) returns (GetItemResponse);           // unary
  rpc WatchItems(WatchRequest) returns (stream ItemEvent);         // server stream
}

message GetItemRequest { string id = 1; }
message GetItemResponse { Item item = 1; bool found = 2; }
message Item { string id = 1; string name = 2; }
```

| Term | One-liner |
|------|-----------|
| Service | API surface grouping RPCs |
| RPC | One remote method |
| Stub | Generated client/server adapter |
| Unary | One req → one resp |
| Stream | Sequence of messages on one call |
| Metadata | Headers for the call |
| Status | Outcome code (+ optional details) |
| Channel | Multiplexed connection abstraction |
| Deadline | When the call must finish |

---

## 21. Further reading

- [gRPC Core Concepts](https://grpc.io/docs/what-is-grpc/core-concepts/)
- [gRPC Status Codes](https://grpc.github.io/grpc/core/md_doc_statuscodes.html)
- [ProtoMap Protobuf guide](protobuf-learning-guide.md)
- [ProtoMap HTTP/2 guide](http2-learning-guide.md)
- Language guides: [grpc.io docs](https://grpc.io/docs/)

---

*Written for ProtoMap — pair this with the Protobuf and HTTP/2 guides for the full stack picture.*
