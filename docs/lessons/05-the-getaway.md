# 5 · The getaway

**Shape:** Heist — escape hatch · ~10 min

> **Scene:** Six months later. Mobile clients still on old stubs. You need a new field. Someone suggests “just renumber to clean up.” The alarm is that sentence.

## Promise

You’ll evolve proto3 **additively**, retire stamps safely, and stop confusing package `v1` with the protobuf language.

## Escape rules

**Safe**

- New field → **new unused number**
- New enum value (readers tolerate unknowns)
- New RPC on an existing service
- `reserved` numbers/names when removing
- New major package (`…v2`) only for intentional breaks; dual-run during migrate

**Deadly**

- Reuse a number for a new meaning
- Change a type incompatibly in place
- Renumber “for cleanliness”
- Delete without `reserved` while old binaries live

```protobuf
message Cargo {
  reserved 8;
  reserved "old_route";
  string id = 1;
  // ...
  string route_code = 9;  // new stamp — not 8
}
```

### Presence trap (callback to the stamp metaphor)

Without `optional`, a missing float and a true `0` look the same after open. Document sentinels **or** mark `optional`. Message fields (e.g. `google.protobuf.Timestamp`): omit the field for unset—don’t worship `seconds == 0` as null.

### Well-known shortcuts

Prefer `google.protobuf.Timestamp`, `Duration`, `FieldMask`, `Empty`, `Any` over inventing twins.

> **Your move:** Old clients don’t know stamp `9`. New servers set it. Do old clients crash?

**Answer:** No—they skip unknown fields. That’s the getaway car.

## Reveal

> **Compatibility is leaving empty pages in the passport for future stamps—and never forging an old number.**

## Transfer

List three changes you want on a real schema. Label each **safe** or **breaking**. For one deletion, write the `reserved` lines.

<details>
<summary>Easter skill</summary>

Design `Cargo` v1 → v2 break that *cannot* be additive. What’s the dual-run plan for two weeks?

</details>

## Field card

| Do | Don’t |
| --- | --- |
| Add numbers | Reuse numbers |
| Reserve deletions | Silent renumbers |
| `optional` when zero ≠ missing | Hope comments save PATCH |
| Package `v1` = product API | Think it means “protobuf v1” |

## Season close

You can walk a `.proto` the way a thief reads a blueprint: stamps first, names second, evolution always. Load `harbor.ledger.v1` ideas into ProtoMap—or your real schemas—and audit one service for reused numbers and missing `reserved`.

**Trailer for later seasons (not this file):** gRPC deadlines/status · HTTP/2 streams/trailers—as other trucks, same cargo.
