# 4 · Pull the job

**Shape:** Heist — execute · ~10 min

> **Scene:** Two services, one contract. You need a namespace, thin envelopes, and a single call: *record this cargo*.

## Promise

You’ll wire **package + composition + unary RPC** so codegen has something to aim at—without drowning in streaming taxonomy.

## The job

```protobuf
syntax = "proto3";
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
}
```

### Watch these lines

- `package harbor.ledger.v1` — **your** API version (`v1`), not “protobuf version.” Dialect is `syntax = "proto3"`.
- `RecordRequest` / `RecordResponse` — thin on purpose; evolution stays cheap.
- `option java_package` — steers **codegen**, not wire stamps.
- Path on the truck (gRPC/HTTP/2): `/harbor.ledger.v1.Ledger/Record`.

```text
Client stub.Record(req)
   → protobuf bytes (stamped fields)
   → (usually) HTTP/2 stream
   → your handler
   ← RecordResponse + status
```

Streaming RPCs exist (`stream` on req/resp). Start unary. Add streams when the *interaction* is a stream—not for fashion.

> **Your move:** Should `Cargo` fields live only inside `RecordRequest` with no shared `Cargo` type? Argue for 30 seconds.

**Fork:** Shared `Cargo` wins when multiple RPCs speak the same entity. Inline wins for one-off shapes you’ll never reuse. Harbor reuses `Cargo`—so extract it.

## Reveal

> **The heist isn’t the RPC. The heist is a versioned package of stamped messages; the RPC is just the door you kick.**

## Transfer

Name `package your.org.thing.v1`, one entity message, one `*Request`/`*Response`, one `rpc`. No implementation code.

## Field card

| Piece | Role |
| --- | --- |
| `package` | Namespace + product version |
| `import` | Other `.proto` / well-known types |
| `option` | Language binding knobs |
| `service`/`rpc` | API surface (gRPC) |

## Bridge

You pulled the job once. Episode 5: escaping the building without setting the alarms—compatibility.
