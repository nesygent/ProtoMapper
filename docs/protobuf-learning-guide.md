# Protocol Buffers — Complete Learning Guide

A practical guide for experienced IT professionals: architects, backend engineers, and platform developers who already know HTTP/JSON APIs, typed languages, and distributed systems — and want a crisp mental model of **Protocol Buffers (protobuf)** and how they relate to **gRPC**.

Use this alongside [ProtoMap](../README.md) (load real `.proto` files while you read).

**Related guides:** [gRPC](grpc-learning-guide.md) · [HTTP/2](http2-learning-guide.md)

---

## Table of contents

1. [What protobuf is (and is not)](#1-what-protobuf-is-and-is-not)
2. [The toolchain mental model](#2-the-toolchain-mental-model)
3. [Server vs client: what runs where](#3-server-vs-client-what-runs-where)
4. [proto2 vs proto3](#4-proto2-vs-proto3)
5. [Anatomy of a `.proto` file](#5-anatomy-of-a-proto-file)
6. [Messages — the core type](#6-messages--the-core-type)
7. [Fields, field numbers, and wire identity](#7-fields-field-numbers-and-wire-identity)
8. [Scalar types](#8-scalar-types)
9. [Enums](#9-enums)
10. [Nested messages and composition](#10-nested-messages-and-composition)
11. [Collections: `repeated` and `map`](#11-collections-repeated-and-map)
12. [`oneof` and mutually exclusive fields](#12-oneof-and-mutually-exclusive-fields)
13. [Default values and field presence (proto3)](#13-default-values-and-field-presence-proto3)
14. [Packages, imports, and naming](#14-packages-imports-and-naming)
15. [Options (language bindings)](#15-options-language-bindings)
16. [Services and RPCs (gRPC)](#16-services-and-rpcs-grpc)
17. [Streaming RPCs](#17-streaming-rpcs)
18. [JSON mapping](#18-json-mapping)
19. [Wire format (enough to reason about size and compatibility)](#19-wire-format-enough-to-reason-about-size-and-compatibility)
20. [API evolution and compatibility](#20-api-evolution-and-compatibility)
21. [Common pitfalls](#21-common-pitfalls)
22. [How to study a real schema in ProtoMap](#22-how-to-study-a-real-schema-in-protomap)
23. [Quick reference](#23-quick-reference)
24. [Further reading](#24-further-reading)

---

## 1. What protobuf is (and is not)

**Protocol Buffers** are:

1. An **IDL** (Interface Definition Language) — you declare data shapes and (optionally) RPC methods in `.proto` files.
2. A **binary serialization format** — compact, typed, version-tolerant encoding on the wire.
3. A **codegen ecosystem** — `protoc` (and plugins) emit language-specific classes, stubs, and helpers.

**Protobuf is not:**

- A transport by itself (TCP, HTTP/2, Unix sockets are separate).
- An application server (your code implements behavior).
- Locked to one language (same `.proto` → Java, Go, Python, TypeScript, Rust, …).

**gRPC** is the usual companion: an RPC framework that uses HTTP/2 and protobuf messages as the default payload format. You can use protobuf **without** gRPC (e.g. store blobs, Kafka payloads). You rarely use gRPC **without** some IDL; protobuf is the default.

| Concept you know         | Protobuf analogue                 |
| ------------------------ | --------------------------------- |
| OpenAPI / JSON Schema    | `.proto` messages + services      |
| DTO / record / struct    | `message`                         |
| REST resource + verbs    | `service` + `rpc` (usually gRPC)  |
| Jackson / serde JSON     | protobuf binary (or JSON mapping) |
| Swagger-generated client | `protoc`-generated client stub    |

---

## 2. The toolchain mental model

```text
┌─────────────────┐     protoc + plugins      ┌──────────────────────────┐
│  *.proto files  │ ───────────────────────►  │ Generated source code    │
│  (contract)     │                           │ messages + stubs         │
└─────────────────┘                           └────────────┬─────────────┘
                                                           │
                    ┌──────────────────────────────────────┼────────────────┐
                    ▼                                      ▼                ▼
             Your server                            Your client         Other langs
             implements                             calls stub          same .proto
             service API                            methods
```

**Steps in practice:**

1. Author / review `.proto` (source of truth for the public contract).
2. Run codegen (Maven/Gradle Quarkus gRPC, `buf`, `protoc`, etc.).
3. **Implement** server handlers in your language.
4. **Consume** client stubs in apps/SDKs (any language that can compile the same schema).

Generated code is **not** your business logic. It is the adapter between your types and the wire.

---

## 3. Server vs client: what runs where

### On the server

| Present                                       | Role                                 |
| --------------------------------------------- | ------------------------------------ |
| Application runtime (e.g. Quarkus, Go server) | Process that listens                 |
| **Your** service implementation               | Business logic                       |
| Generated **server** stubs / base classes     | Dispatch RPCs → your methods         |
| Generated **message** classes                 | Parse/serialize requests & responses |
| Datastores, queues, etc.                      | Persistence / side effects           |

### On the client machine

| Present                       | Role                                |
| ----------------------------- | ----------------------------------- |
| Client application            | Decides *when* to call              |
| Generated **client** stub     | Opens channel, marshals calls       |
| Generated **message** classes | Build requests / read responses     |
| **Not** required              | Server DB, server business packages |

**Rule:** Clients need the **schema** (or a published SDK built from it) and network access. They do not run your server codebase.

```text
Client                                      Server
──────                                      ──────
Build RememberRequest  ── gRPC / HTTP2 ──►  Your Handler
Parse RememberResponse ◄──────────────────  store / domain logic
```

---

## 4. proto2 vs proto3

|                         | **proto2**                         | **proto3** (current default)                                                             |
| ----------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------- |
| File marker             | `syntax = "proto2";`               | `syntax = "proto3";`                                                                     |
| `required` / `optional` | `required`, `optional`, `repeated` | No `required`; fields optional by nature; `optional` keyword restored later for presence |
| Defaults                | More explicit presence tracking    | Unset scalars → language zero values                                                     |
| Enums                   | First value need not be 0          | **Must** have zero-value (usually `*_UNSPECIFIED = 0`)                                   |
| Extensions              | Classic extensions                 | Prefer new fields / `Any` / evolving messages                                            |

**For new APIs, use proto3.** Most modern gRPC docs and tooling assume it. The rest of this guide focuses on **proto3**.

---

## 5. Anatomy of a `.proto` file

```protobuf
syntax = "proto3";                    // required in modern files

package acme.billing.v1;              // logical namespace (API version often here)

import "google/protobuf/timestamp.proto";

option java_package = "com.acme.billing.v1";
option java_multiple_files = true;
option go_package = "github.com/acme/billing/v1;billingv1";

// Types
enum InvoiceState { ... }
message Invoice { ... }
message GetInvoiceRequest { ... }
message GetInvoiceResponse { ... }

// RPCs (optional — only if this file defines a service)
service BillingService {
  rpc GetInvoice(GetInvoiceRequest) returns (GetInvoiceResponse);
}
```

**Order of concern when reading a file:**

1. `syntax` / `package` — dialect and namespace  
2. `import` — dependencies  
3. `option` — language mapping  
4. `enum` / `message` — data model  
5. `service` — operations  

---

## 6. Messages — the core type

A **message** is a **named structured type**: a bag of fields with stable wire IDs. Think *struct / record / DTO*, not a function.

```protobuf
message Memory {
  string id = 1;
  float importance = 4;
  int64 created_at_unix_ms = 9;
}
```

This declares:

- There is a type named `Memory`.
- Instances carry those fields.
- On the wire, fields are identified by **numbers** (`1`, `4`, `9`), not by names.

**Messages can contain:**

- Scalar fields  
- Enum fields  
- Other message fields  
- `repeated` / `map` / `oneof`  

**Messages are not:**

- Classes with behavior (codegen may produce builders/helpers, but the IDL has no methods on messages)
- Database tables (though people often map 1:1)

---

## 7. Fields, field numbers, and wire identity

```protobuf
string id = 1;
```

| Part     | Meaning                                           |
| -------- | ------------------------------------------------- |
| `string` | Field type                                        |
| `id`     | Name in the schema / generated API                |
| `= 1`    | **Field number** — permanent identity on the wire |

### Why field numbers matter more than names

- Renaming `id` → `memory_id` is a **source** change; with care, wire can stay compatible if the number stays `1`.
- Changing `= 1` to `= 2` is a **breaking** wire change for that field.
- Field numbers must be unique within a message.
- Reserve ranges you delete: `reserved 4, 8 to 10;` and `reserved "old_name";`

### Number allocation tips

| Range         | Use                                                           |
| ------------- | ------------------------------------------------------------- |
| `1–15`        | Frequently set fields (1-byte tag; slightly smaller encoding) |
| `16–2047`     | Normal fields                                                 |
| `19000–19999` | Reserved by protobuf implementation — do not use              |
| Very high     | Fine, but tags cost more varint bytes                         |

---

## 8. Scalar types

**Scalar** = a leaf primitive field type (not a message, not a map entry by itself).

Common proto3 scalars:

| Proto type                                   | Typical meaning | Notes                                                  |
| -------------------------------------------- | --------------- | ------------------------------------------------------ |
| `double`, `float`                            | IEEE floats     |                                                        |
| `int32`, `int64`                             | Signed ints     | Zigzag variants `sint32`/`sint64` better for negatives |
| `uint32`, `uint64`                           | Unsigned        |                                                        |
| `fixed32`, `fixed64`, `sfixed32`, `sfixed64` | Fixed-width     | Better when values are often large                     |
| `bool`                                       | Boolean         |                                                        |
| `string`                                     | UTF-8 text      |                                                        |
| `bytes`                                      | Opaque binary   |                                                        |

**Important proto3 behavior:** if a scalar is **unset**, readers see the **zero value** (`0`, `0.0`, `false`, `""`, empty bytes). Distinguishing “missing” vs “explicitly zero” requires `optional` (proto3 presence) or wrappers / sentinel conventions.

Example convention in APIs: `valid_until_unix_ms = 0` means “open-ended,” documented in comments — application semantics on top of the zero default.

---

## 9. Enums

```protobuf
enum MemoryType {
  MEMORY_TYPE_UNSPECIFIED = 0;  // required zero value in proto3
  MEMORY_TYPE_WORKING = 1;
  MEMORY_TYPE_SEMANTIC = 3;
}
```

Rules and habits:

- Always define `0` as “unspecified / unknown.”
- Prefix values with the enum name (avoids C++ namespace clashes; good style everywhere).
- Unknown enum values on the wire must be preserved by compliant runtimes (forward compatibility).
- Do **not** renumber published values.

Using an enum as a field:

```protobuf
message Memory {
  MemoryType type = 2;
}
```

---

## 10. Nested messages and composition

Messages nest by **field type**, not only by textual nesting:

```protobuf
message RememberResponse {
  Memory memory = 1;           // field whose type is another message
}

message RecallHit {
  string id = 1;
  float score = 2;
  Memory memory = 3;
}
```

You may also declare a message *inside* another (scoped name); prefer top-level messages for public API clarity unless the type is truly private.

**Composition pattern for RPCs:** separate `*Request` / `*Response` messages even if thin — keeps evolution flexible.

---

## 11. Collections: `repeated` and `map`

### `repeated` — list / array

```protobuf
repeated float embedding = 10;
repeated RecallHit hits = 1;
repeated MemoryType type_filters = 4;
```

- Order is preserved.
- Empty list vs unset is subtle in proto3 (often both look empty in APIs).
- In generated Java: typically `List<…>`.

### `map` — dictionary

```protobuf
map<string, string> arguments = 3;
```

- Keys: integral or `string` (not floating, not `bytes`).
- Values: almost any type except another `map`.
- Maps are unordered logically (do not rely on iteration order).
- Encoded as repeated entries of a synthetic message under the hood.

---

## 12. `oneof` and mutually exclusive fields

```protobuf
message Query {
  oneof criterion {
    string text = 1;
    bytes embedding = 2;
  }
}
```

At most one branch is set. Useful for unions / variant payloads. Generated APIs expose a “which case” discriminator.

Prefer `oneof` over parallel optional fields when exactly one variant should apply.

---

## 13. Default values and field presence (proto3)

### Default (zero) values

| Type               | Default if unset                                        |
| ------------------ | ------------------------------------------------------- |
| Numbers            | `0`                                                     |
| `bool`             | `false`                                                 |
| `string`           | `""`                                                    |
| `bytes`            | empty                                                   |
| enum               | value `0`                                               |
| message field      | no message / null-ish / not present (language-specific) |
| `repeated` / `map` | empty                                                   |

### Presence

Without `optional`, you often **cannot** tell “user sent `0`” from “user omitted the field.”

```protobuf
message PatchScore {
  optional float importance = 1;  // presence tracked
}
```

Use `optional` when PATCH-style semantics matter. Otherwise document sentinels (`≤ 0 means default`).

---

## 14. Packages, imports, and naming

### `package`

```protobuf
package ajara.context.v1;
```

- Logical namespace for types (`ajara.context.v1.Memory`).
- **API version** often lives here (`v1`, `v2`) — this is *your* product version, **not** “protobuf version.”
- Strongly related to how fully-qualified names appear in tooling.

### `import`

```protobuf
import "ajara/store/v1/store.proto";
import public "common/types.proto";  // re-export to importers
```

Split contracts by domain. Avoid circular imports.

### Naming conventions

| Kind     | Convention                                   |
| -------- | -------------------------------------------- |
| Files    | `lower_snake.proto` or path matching package |
| Messages | `UpperCamelCase`                             |
| Fields   | `lower_snake_case`                           |
| Enums    | `UpperCamelCase` type, `TYPE_VALUE` values   |
| Services | `UpperCamelCase` + `Service` suffix          |
| RPCs     | `UpperCamelCase` verbs                       |

---

## 15. Options (language bindings)

Options steer **codegen**, not wire layout of your fields:

```protobuf
option java_package = "ai.ajara.context.v1";
option java_multiple_files = true;
option java_outer_classname = "ContextProto";
option go_package = "…";
option csharp_namespace = "…";
```

| Option                | Effect                                            |
| --------------------- | ------------------------------------------------- |
| `java_package`        | Package of generated Java classes                 |
| `java_multiple_files` | One Java file per message (vs single outer class) |
| `go_package`          | Go import path / package name                     |

This is why you may `import ai.ajara.context.v1.AddEvidenceRequest` in Java even though you never hand-wrote that package under `src/main/java` — it was **generated** into `target/generated-sources/…`.

---

## 16. Services and RPCs (gRPC)

```protobuf
service ContextService {
  rpc Health(HealthRequest) returns (HealthResponse);
  rpc Remember(RememberRequest) returns (RememberResponse);
  rpc AddEvidence(AddEvidenceRequest) returns (AddEvidenceResponse);
}
```

| IDL piece                    | Meaning                                |
| ---------------------------- | -------------------------------------- |
| `service ContextService`     | Named API surface (→ interface / stub) |
| `rpc Remember(...)`          | One method                             |
| `(RememberRequest)`          | Input **message**                      |
| `returns (RememberResponse)` | Output **message**                     |

**Unary RPC** (above): one request, one response. This is the default and most common.

Codegen produces:

- **Server:** interface / base class you implement.
- **Client:** stub with methods like `remember(request)`.

Your server class might be named `ContextGrpcService` while the proto service is `ContextService` — that naming split is normal: **contract name** vs **implementation class name**.

---

## 17. Streaming RPCs

gRPC supports four interaction styles:

| Kind             | Signature sketch                            | Use when                       |
| ---------------- | ------------------------------------------- | ------------------------------ |
| Unary            | `rpc Foo(Req) returns (Resp)`               | Normal request/response        |
| Server streaming | `returns (stream Resp)`                     | Subscribe / large result sets  |
| Client streaming | `rpc Foo(stream Req) returns (Resp)`        | Upload many parts, one summary |
| Bidirectional    | `rpc Foo(stream Req) returns (stream Resp)` | Interactive duplex             |

Streaming is still message-oriented: each stream element is a protobuf message.

---

## 18. JSON mapping

Protobuf has a defined **JSON mapping** (useful for REST gateways, debugging, browsers):

- Field names often become **lowerCamelCase** in JSON (`created_at_unix_ms` → `createdAtUnixMs`), depending on options/tooling.
- `int64` may appear as **string** in JSON to avoid JavaScript precision loss.
- `bytes` become base64.
- Default/zero values may be omitted in JSON output.

Do not assume JSON field names equal proto field names without checking your gateway settings (`json_name` option can override).

---

## 19. Wire format (enough to reason about size and compatibility)

You rarely hand-decode protobuf, but these facts prevent bad designs:

1. **Tag = field number + wire type** (varint). Small field numbers → slightly smaller tags.
2. **Only set fields are encoded** (absent fields cost nothing) — unlike typical JSON that may send `"x":0` always.
3. **Names are not on the wire** — receivers need the schema (or an equivalent descriptor) to interpret tags.
4. **Order of fields on the wire is not a semantic contract**; field numbers are.
5. **Unknown fields** should be preserved by libraries when round-tripping (forward compatible proxies).

Binary protobuf is usually **smaller and faster** to parse than equivalent JSON, which is why it dominates internal RPC.

---

## 20. API evolution and compatibility

### Safe (non-breaking) changes

- Add a **new field** with a **new number**.
- Add a new RPC to a service (old clients ignore it).
- Add enum values (clients must tolerate unknowns).
- Deprecate fields via `[deprecated = true]` comments / options; keep numbers reserved if removing.

### Breaking changes

- Reuse a field number for a different meaning.
- Change a field’s type incompatibly.
- Renaming a package/service/RPC without dual-running.
- Removing a field without `reserved` and while old binaries still speak it.

### Versioning strategy

Common pattern:

- Package `…v1` for the stable surface.
- Introduce `…v2` for intentional breaks; run both during migration.
- Prefer additive evolution inside `v1` as long as possible.

---

## 21. Common pitfalls

1. **Confusing `v1` in the package with “protobuf v1.”**  
   `ajara.context.v1` is *your* API version; the language is proto3.

2. **Expecting generated classes under `src/main/java`.**  
   They live in build output (`target/generated-sources/…`).

3. **Using `0` and empty string without documented semantics.**  
   Zero defaults collide with real data; document or use `optional`.

4. **Renumbering fields during “cleanup.”**  
   Treat numbers as public ABI.

5. **God messages.**  
   Prefer request/response types and shared core entities (`Memory`) over one mega-struct.

6. **Assuming clients share your DB model.**  
   The `.proto` is the product boundary; internal tables can differ.

7. **Forgetting that enums need a zero value.**  
   Proto3 requires it; use `*_UNSPECIFIED = 0`.

8. **Putting business logic in `.proto` comments only.**  
   Comments help, but validation still belongs in server code.

---

## 22. How to study a real schema in ProtoMap

1. **Open** your `.proto` files (multi-file drop is fine).
2. Start at **Services** — list RPCs; each RPC tells you the entry points.
3. Click **Request/Response** messages — learn the payload shapes.
4. Follow type links into shared entities (e.g. `Memory`).
5. Check **field numbers** and comments for evolution hints (`≤ 0 → default`).
6. Use **JSON example** / grpcurl hints to imagine a concrete call.
7. Sketch the path: `RPC → handler class → domain facade` (in your server repo).

Suggested reading order for any unfamiliar API:

```text
service → rpc list → core entity messages → enums → satellite request/response types
```

---

## 23. Quick reference

```protobuf
syntax = "proto3";
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
  map<string, string> meta = 4;  // map
  double score = 5;
}

message GetItemRequest {
  string id = 1;
}

message GetItemResponse {
  Item item = 1;                 // nested message field
  bool found = 2;
}

service ItemService {
  rpc GetItem(GetItemRequest) returns (GetItemResponse);
}
```

**Glossary**

| Term         | One-liner                          |
| ------------ | ---------------------------------- |
| Message      | Structured type (struct/DTO)       |
| Field        | Named slot inside a message        |
| Field number | Wire identity (`= N`)              |
| Scalar       | Primitive field type               |
| Enum         | Named integer set with `0` default |
| Service      | RPC API surface                    |
| RPC          | One method: messages in/out        |
| Stub         | Generated client or server adapter |
| proto3       | Current IDL dialect                |

---

## 24. Further reading

- [Protocol Buffers Language Guide (proto3)](https://protobuf.dev/programming-guides/proto3/)
- [Protobuf Encoding](https://protobuf.dev/programming-guides/encoding/)
- [gRPC Concepts](https://grpc.io/docs/what-is-grpc/core-concepts/)
- [JSON Mapping](https://protobuf.dev/programming-guides/proto3/#json)
- Style: [Google Cloud AIP](https://google.aip.dev/) (API design patterns that pair well with protobuf)

---

*Written for ProtoMap — load a `.proto`, keep this guide open, and map each concept to a real type in the viewer.*
