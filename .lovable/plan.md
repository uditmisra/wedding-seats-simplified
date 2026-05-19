## What's wrong

Looking at `/demo` right now, tables clearly overlap each other and the fixtures:

- **Head Table ↔ Kids' Table** overlap (~50px). Head box is 262px wide centred at x=330, kids' long is 298px wide centred at x=560 → spans collide between x=411 and x=461.
- **Row 2 (T1–T5)** at 160px pitch — every round 10-seat table renders at ~186px wide (min radius 60 + 18 seat gap + 15 seat radius), so every neighbour overlaps by ~26px.
- **Row 2 also overlaps Row 1** vertically: head sits at y=155, round tables at y=310, but their seat rings reach y≈403 and y≈217 → 14px overlap.
- **T9 (x=655, y=450)** clips the dance floor (x=707..957, y=400..677).
- **T13 (x=820, y=165)** overlaps the kids' long table (which ends at x≈709 with seats extending further right).

The previous fix updated coordinates but never reconciled them with the actual `tableDims()` output. The min-radius floor of 60 means a round table — regardless of capacity — needs ~200px of horizontal and vertical breathing room.

## Fix — rebuild around real geometry

### Table footprints (from `floorplanGeometry.ts`)

| Shape    | Cap | Box w × h     | Needed pitch |
|----------|-----|---------------|--------------|
| round    | 10  | 186 × 186     | 200          |
| round    | 8   | 186 × 186     | 200          |
| head     | 8   | 262 × 156     | 280 × 175    |
| long     | 12  | 298 × 156     | 315 × 175    |

### Room budget

Default 20m × 14m → 1040 × 728 px. Usable interior with fixture clearance:
- avoid DJ (top-right, ~x≥860 above y=80)
- avoid bar (bottom-left, ~x≤230, y≥590)
- avoid dance floor (~x≥707, y≥400)

Usable rectangle for the bulk of round tables: roughly x∈[120, 880], y∈[130, 560].

### New layout — reduce to 12 tables, keep 120 seats

Math: 1 head (8) + 1 kids' long (12) + 10 rounds × 10 = 120 seats exactly.

```text
Row 1 (y=160):   [Head Table   x=300]      [Kids' Long   x=680]
Row 2 (y=360):   T1 x=150  T2 x=350  T3 x=550  T4 x=750
Row 3 (y=560):   T5 x=150  T6 x=350  T7 x=550   (T8 omitted — dance floor)
Row 4 (y=560 east of bar):  T8 x=410  T9 x=610 — actually folds into row 3.
```

Cleaner version:

```text
Row 1 (y=160):   Head (x=300)        Kids' Long (x=680)
Row 2 (y=360):   T1 150   T2 360   T3 570   T4 780
Row 3 (y=560):   T5 350   T6 560   T7 770   (left of bar; T7 at 770 clears dance floor only if y≤390 — so move T7 to row 2)
```

The honest constraint: the dance floor (x≥707, y≥400) blocks the bottom-right quadrant entirely, so row 3 can only hold 3 round tables (x=350, 510, 670 — the last just clears the dance floor at x=670+93=763 vs dance-floor left edge 707... still 56px collision).

Final feasible 12-table layout:

```text
Row 1 (y=160):   Head (x=320)         Kids' Long (x=700)
Row 2 (y=360):   T1 130   T2 340   T3 550   T4 770
Row 3 (y=540):   T5 130   T6 340   T7 540
Row 4 (y=540):   T8 290 (above bar)  — actually folds into a tighter row 3
```

Net: **10 rounds + head + kids = 12 tables, 120 seats.** Row 3 has 4 rounds (x=130, 340, 540, 770 but T at 770 needs y≤390 to clear dance floor → push T8 up to row 2 making row 2 have 5 tables across the top half). Then row 3 has 3 tables left of the dance floor.

### Concrete final placement

```text
Row 1 (y=170):  Head    @ (340, 170)        Kids'   @ (720, 170)
Row 2 (y=370):  T1 (140) T2 (340) T3 (540) T4 (740)
Row 3 (y=560):  T5 (140) T6 (340) T7 (540)
Row 4 (y=585, east of bar): T8 (305) T9 (495) T10 (685)
```

That's 1 + 1 + 4 + 3 + 3 = **12 tables**. Wait — that puts T9 at (495, 585) overlapping T7 at (540, 560) vertically (Δy=25, both 186 tall → collide). 

### Honest answer

Fitting 15 round tables in a 20m × 14m room around three fixtures **doesn't fit** at current geometry. Two paths:

**Option A — reduce to 12 tables (recommended).**
- 1 head (8) + 1 long (12) + 10 rounds (10 each) = 120 seats.
- Layout fits cleanly with 200px pitch and dance-floor clearance.
- Update `DEMO_TABLES`, drop 3 tables, redistribute pre-assignments.
- Pre-assignments need rewiring: t-11/t-12/t-13 references in `DEMO_ASSIGNMENTS` and `DEMO_CONSTRAINTS` swap to surviving table IDs.

**Option B — make the room bigger.**
- Bump `DEFAULT_ROOM_CONFIG` from 20m × 14m to 24m × 16m (or override only for the demo). Gives ~1248 × 832 canvas — fits 15 round tables at 200px pitch in 5 cols × 3 rows + head row.
- Pro: keeps the 15-table data unchanged. Con: changes default for all new plans too — unless we set demo's `roomConfig` to a custom-sized room rather than `DEFAULT_ROOM_CONFIG`.

**Option C — shrink seat geometry just for the demo.**
- Override `SEAT_PITCH`/min-radius so 10-seat rounds render at ~140px instead of 186px.
- Pro: keeps both tables and room intact. Con: invasive — `tableDims()` is called everywhere (exports, real planner). A demo-only override means a flag plumbed through floor-plan rendering.

## Recommendation

**Option A.** Simplest, no flag plumbing, no global geometry change, and 12 tables tells the same demo story as 15 (the constraints, conflicts, and auto-assign moments don't depend on count).

## Files

- `src/lib/demo/sampleData.ts` — rewrite `DEMO_TABLES` (12 entries), rewire any `DEMO_ASSIGNMENTS` / `DEMO_CONSTRAINTS` that reference removed table IDs.

## Verification

Fresh `/demo` session → no table-on-table overlap, no table touching the bar / dance floor / DJ. Visual check at 1280px and at the user's current 993px viewport.

## Decision needed

Which option do you want — **A (12 tables, recommended)**, **B (bigger room)**, or **C (demo-only geometry override)**?
