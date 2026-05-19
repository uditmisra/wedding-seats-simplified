## What's wrong

Last pass I added a "prefer cells farthest from fixtures" sort to the auto-arrange. With a room that has the DJ at the top and the bar / dance floor at the bottom, the cells with maximum distance to any fixture are all in the **middle horizontal band** — so the optimiser collapsed 9 tables into a single row across the middle, ignoring the perfectly usable top and bottom space. That's the row you're seeing.

The DJ-overlap fix (bumping `FIXTURE_CLEARANCE` from 16 → 36px) was correct. The "farthest cell" ranking was the wrong solution and needs to go.

## Plan

One file: `src/components/planner/FloorPlan.tsx`.

1. **Drop the "farthest from fixtures" ranking.** Go back to scan order (top→bottom, left→right) over the candidate cells. With the clearance now at 36px, DJ-style narrow fixtures get a real keep-out zone without warping the whole grid.

2. **Pick the grid shape that actually fills the room.** Instead of `baseCols = round(sqrt(n * aspect))` and only growing `cols` when there aren't enough free cells, evaluate every `(cols, rows)` pair from `1×n` to `n×1` (capped at 8 cols, 8 rows). Score each by:
   - free-cell count ≥ table count (hard requirement)
   - cell aspect ratio closest to 1 (square-ish cells → balanced layout)
   - prefer the option whose used cells span both axes (avoid the degenerate "one row" outcome when a wider grid would also fit).

   Pick the best-scoring shape, then assign tables to its free cells in scan order.

3. **Keep the clearance at 36px** so the DJ booth and other narrow fixtures still push tables away.

4. **No other changes.** Fixture-overlap detection, arrange-mode drag, fixture move/delete, unique table names — all untouched.

## Verification

- Default room with bar + dance floor + DJ + 9 tables: tables distribute across multiple rows, none overlap fixtures, none crammed against the DJ.
- Remove the bar and dance floor: tables redistribute and use the freed bottom space.
- Crowded room (4 fixtures + 14 tables): still fits, may bump to 4 rows; no overlaps.
- Arrange mode toggle still respects stored positions; turning it off snaps back to the new auto-grid.
