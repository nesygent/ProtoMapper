# 3 · Whiteboard the job

**Shape:** Heist — plan on glass · ~12 min

> **Scene:** Customs needs a **state**, a list of **ports**, optional **meta**, and a scan that is *either* text **or** a barcode—never both.

## Promise

You’ll place `enum`, `repeated`, `map`, `oneof`, and `optional` as tools with jobs—not as a checklist to empty.

## The plan (one artifact)

```protobuf
syntax = "proto3";
package harbor.ledger.v1;

enum CargoState {
  CARGO_STATE_UNSPECIFIED = 0;  // always define zero
  CARGO_STATE_BONDED = 1;
  CARGO_STATE_CLEARED = 2;
}

message Cargo {
  string id = 1;
  CargoState state = 2;
  repeated string ports = 3;
  map<string, string> meta = 4;

  oneof scan {
    string text_code = 5;
    bytes barcode = 6;
  }

  optional float declared_value = 7;  // presence: set vs "0"
}
```

### What each hire does

| Hire       | Job                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------- |
| `enum`     | Closed set of ints; unknown values must survive round-trip; **never renumber published ones** |
| `repeated` | Ordered list                                                                                  |
| `map`      | Dict; keys = int or `string`; unordered; not nested maps                                      |
| `oneof`    | At most one branch; use when exclusivity is the point                                         |
| `optional` | On scalars, tracks “was set” (protobuf.dev recommends this; helps toward Editions)            |

**Message fields** already have presence—omit the submessage for unset. `repeated`/`map` don’t give you a clean “empty vs absent” story; don’t pretend they do.

> **Your move:** Finance sends `declared_value` only on audits. Without `optional`, can you tell “worth zero” from “not sent”?

**Answer:** Not reliably. Zeros and “missing” collapse.

## Reveal

> **Collections and unions are still just stamps. Exclusivity and presence are policies you declare—or you invent them badly in comments.**

## Transfer

Take last episode’s `Person`. Add an enum status, a `repeated` email list, and a `oneof` for `phone` vs `pager`. Mark one scalar `optional` that would break PATCH semantics if zero-defaulted.

## Field card

- Enum zero = unspecified  
- `oneof` = mutex  
- `optional` scalar = hazzer/clear in codegen  
- Maps ≠ ordered  

## Bridge

Crew’s hired. Episode 4: namespaces, request/response envelopes, and one RPC so the job actually runs.
