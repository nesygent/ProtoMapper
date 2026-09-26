# 1 · The night names vanished

**Shape:** Heist cold open · ~8 min

> **Scene:** Friday. A Go service wrote `importance`. A Java client read the same bytes and printed `0.0`. Both teams swear they “used the same field.” The packet capture shows no letters—only numbers.

## Promise

By the end you will stop thinking protobuf is “typed JSON.” You will treat it as a **numbered contract** that *codegen* turns into local types.

## The prize

Protobuf (proto3) is three things at once:

1. A language for declaring shapes (`.proto`)
2. A binary encoding where **field numbers** identify data
3. A toolchain (`protoc` / plugins) that emits stubs—not your business logic

It is **not** a network, not a server, and not locked to one language.

```text
Your head:   "importance"
The wire:    tag for field 4  +  float bits
Their head:  whatever their .proto named field 4
```

If both sides agree on **number + type**, renames are theater. If they disagree on the number, you have two different fields wearing similar costumes.

> **Your move:** Before reading on—would renaming `importance` → `priority` break old binaries *if the number stayed 4*?

**Answer:** No. The wire never carried the word.

## Lived micro-demo

```protobuf
syntax = "proto3";
package harbor.ledger.v1;

message Cargo {
  string id = 1;
  float weight_kg = 4;
}
```

Watch line `weight_kg = 4`: the human name is sticky notes; **`4` is the passport stamp.**

## Reveal

> **Names are for APIs you generate. Numbers are the treaty.**

gRPC will later ride these messages over HTTP/2. Kafka can store the same bytes with no RPC at all. Same cargo; different trucks.

## Transfer

Open any real `.proto`. Pick one field. Cover the name with your finger. What’s left that still identifies it?

## Field card

| Term         | Sticky bit                 |
| ------------ | -------------------------- |
| `.proto`     | Contract source            |
| Message      | Structured bag of fields   |
| Field number | Wire identity              |
| Codegen      | Adapters, not domain logic |

## Bridge

You’ve named the prize. Next: recruit the crew—what’s allowed *inside* a message.
