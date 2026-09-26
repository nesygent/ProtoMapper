# Harbor Heist — Protocol Buffers 3

**How this season moves:** a heist. You steal *durable contracts*—messages that still make sense when names never travel with the bytes.

| | |
| --- | --- |
| **You are** | An engineer shipping a tiny cargo API other teams will compile against |
| **Prize** | A proto3 schema that survives strangers’ code for years |
| **Metaphor** | **Passport stamps** — the stamp number is identity; the printed word is only for humans |
| **Throughline** | `harbor.ledger.v1` — `Cargo` entries, one unary `Record` RPC |

### Watch order

1. [The night names vanished](01-the-night-names-vanished.md) — what protobuf *is*
2. [Recruit the crew](02-recruit-the-crew.md) — message, scalars, field numbers
3. [Whiteboard the job](03-whiteboard-the-job.md) — enum, repeated, map, oneof, optional
4. [Pull the job](04-pull-the-job.md) — package, composition, service/rpc
5. [The getaway](05-the-getaway.md) — evolution, reserved, presence traps

**After the season you can:** read any `.proto`, design additive changes, and stop treating field *names* as the wire contract.

Open ProtoMap (or any schema viewer) when an episode says **Your move**—optional, not required.
