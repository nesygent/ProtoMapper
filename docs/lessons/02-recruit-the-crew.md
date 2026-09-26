# 2 · Recruit the crew

**Shape:** Heist — assemble specialists · ~10 min

> **Scene:** Same `Cargo` job. Legal wants an id, ops wants weight, finance wants a note. You need a crew that fits in one sealed envelope.

## Promise

You’ll build a proto3 **message** from **scalars** and place **stamps** (field numbers) like a professional—not like someone numbering lines in a notebook.

## Lived example

```protobuf
syntax = "proto3";
package harbor.ledger.v1;

message Cargo {
  string id = 1;           // stamp 1 — hot path, keep small numbers
  string note = 2;
  bool hazmat = 3;
  float weight_kg = 4;
  bytes seal_hash = 5;
  int64 recorded_unix_ms = 6;
}
```

**Crew roles (scalars):** `string`, `bytes`, `bool`, floats, ints (`int32`/`int64`, `uint*`, `sint*` for zig-zag negatives, `fixed*` when values run large).

**Rule:** Unset scalars read as zeros (`""`, `0`, `false`, empty `bytes`). The stamp either appears on the passport or it doesn’t—there is no “null string” on the wire without extra machinery (episode 3).

## Mechanism — stamp discipline

| Stamps      | Use                                      |
| ----------- | ---------------------------------------- |
| 1–15        | Fields you set constantly (cheaper tags) |
| 16–2047     | Normal                                   |
| 19000–19999 | Forbidden (implementation reserved)      |

Never reuse a stamp for a new meaning. Retire with `reserved`.

```protobuf
message Cargo {
  reserved 7, 9 to 11;
  reserved "legacy_code";
  string id = 1;
}
```

> **Your move:** You delete `note`. What two `reserved` lines should you add before anyone else ships?

<details>
<summary>Show</summary>

`reserved 2;` and `reserved "note";` (number and old name).

</details>

## Misconception duel

**Naive:** “Field order in the file is the wire order.”  
**Reality:** Order on the wire is not a contract. **Numbers** are.

## Reveal

> **A message is a briefcase. Scalars are the objects. Stamps are the only IDs customs will honor.**

## Transfer

Sketch five fields for a `Person` at your job. Assign stamps 1–5 with the hottest data in 1–15. Don’t write JSON.

## Field card

- `message` = struct/DTO  
- scalar = leaf type  
- `= N` = ABI  
- `reserved` = retired stamps/names  

## Bridge

Scalars alone won’t model status codes, lists, or “text *or* barcode.” Episode 3 whiteboards the rest of the crew.
