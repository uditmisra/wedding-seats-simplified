Two changes, both on the Seating canvas (`FloorPlan.tsx`) and the surrounding wiring.

## 1. Auto-arrange respects fixtures

Today the grid maths is purely `roomW × roomH` divided into `cols × rows` cells. It ignores the bar, DJ booth, dance floor, stage, etc., so tables land on top of them.

Fix inside `FloorPlan.tsx` layout pass:

- Build the list of "forbidden rectangles" from `cfg.fixtures.filter(visible && !point)` — that's bar, dance floor, dj, stage, catering, photo booth, bathroom, coat check, entry. Compass and annotation are skipped.
- Generate a pool of candidate centres by sampling each grid cell, then for each cell test whether the table's bounding box (from `tableDims`) collides with any forbidden rect plus a small clearance (~16px).
- If too many cells are blocked, refine the grid: increase `cols` until the count of free cells ≥ `tables.length`, capped at 8.
- Assign tables to free cells in scan order. If a table still doesn't fit (huge table + crowded room), nudge it along the gradient away from the nearest fixture until it's clear, then clamp inside `roomW/roomH`.
- Stored positions in `tables_def.x/y` are still ignored in non-arrange mode (already done last pass). Arrange mode keeps using stored coords.

## 2. Fixtures are movable + deletable

Fixtures are currently rendered inside `RoomGeometry` as one SVG `<g pointerEvents="none">` — they can't be selected or touched on the Seating canvas. The Venue canvas handles this, but a user looking at the Seating chart can't fix a misplaced dance floor without bouncing to another tab.

Changes:

- `FloorPlan.tsx`: take two new optional props `onFixtureMove(id, x_pct, y_pct)` and `onFixtureDelete(id)`. When `arrangeMode` is on and these are provided, render fixtures as positioned `<div>` overlays (parallel to the existing arrange-mode table drag handles) on top of the SVG geometry. Each fixture overlay:
  - Click selects (state `selectedFixtureId`).
  - Drag updates a `liveFixturePos` map (same pattern as `livePos` for tables); release calls `onFixtureMove`.
  - Selected fixture shows a small floating delete button (trash icon) near its top-right corner; click calls `onFixtureDelete`.
- `SeatingView.tsx`: implement the two handlers — update `room_config` via supabase `update plans` and pass back through `onSavedRoom`. (`SeatingView` already receives `roomConfig` and a setter through Planner.)
- `Planner.tsx`: pass `onSavedRoom` to `SeatingView` (currently only `roomConfig` is passed). The setter already exists on `VenueTab`; mirror it.

Out of scope: rotation/resize of fixtures (Venue tab still owns the heavier editing). No schema change. No change to the legend / arrange hint banner copy beyond "Drag tables or features".

## Files

- `src/components/planner/FloorPlan.tsx` — fixture-aware grid + draggable/deletable fixture overlays in arrange mode
- `src/components/planner/SeatingView.tsx` — wire `handleFixtureMove` / `handleFixtureDelete`, pass to FloorPlan
- `src/pages/Planner.tsx` — pass `onSavedRoom` through to SeatingView

## Verification

- Open Seating with default fixtures: tables fill the room without overlapping the dance floor / bar / DJ booth.
- Click "Arrange room": fixtures gain a dashed selection halo on hover, drag to reposition, trash button to delete. Release persists. Toggle off arrange: fixtures revert to non-interactive geometry.
- Venue tab still behaves the same.
