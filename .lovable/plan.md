## Goal

Let users place each guest into a **specific seat** at a table — not just "at table 5". The current model already has `assignments.seat_index` in the database; it's just unused. We'll start writing it, render guests at their assigned seat, and make every seat a real drop target with swap-on-collision and a right-click menu.

## What changes

### 1. Seat-level drag & drop on the floor plan

In `src/components/planner/FloorPlan.tsx`:

- Each computed seat becomes its own `useDroppable` with id `seat:{tableId}:{seatIndex}`.
- The existing whole-table drop zone stays, with id `table:{tableId}` (auto-pick first empty seat) — so users can be precise *or* casual.
- Each occupied seat becomes a `useDraggable` with id `guest:{guestId}` (today the invisible handle is hard to grab — we'll make the seated chip itself the drag handle).
- Visual feedback while dragging:
  - Hovered empty seat → solid primary fill + ring.
  - Hovered occupied seat → amber ring with a small ⇄ icon (swap preview).
  - Hovered table background → soft primary tint (current behaviour).

### 2. Swap-on-collision logic

In `src/components/planner/SeatingView.tsx` `onDragEnd`:

- Parse the drop id: `seat:tid:idx` vs `table:tid` vs `__unassign__`.
- For a seat drop:
  - If the target seat is **empty** → upsert the dragged guest's assignment with `{ table_id: tid, seat_index: idx }`.
  - If the target seat is **occupied** → swap: write the dragged guest into `(tid, idx)` and move the displaced guest into the dragged guest's previous `(table_id, seat_index)`. If the dragged guest was unassigned, the displaced guest becomes unassigned (delete their row).
  - Both writes go through a single batched update so the UI doesn't flash an inconsistent state.
- For a table drop (no seat): find the lowest free `seat_index` in `[0, capacity)` and assign there. If full, fall back to `seat_index = null` (overflow, current behaviour).
- All writes set `seat_index` going forward.

### 3. Render guests at their assigned seat

Today `FloorPlan` zips `seated[i]` with `seats[i]` in arrival order. New rule:

- Build a `Map<seatIndex, Assignment>` per table.
- For each computed seat position `i`, look up `seatMap.get(i)`.
- Assignments with `seat_index = null` (legacy rows or overflow) are listed under the table as "unseated at this table" chips, and can be dragged onto a specific seat to claim it.
- One-time, lazy backfill: when the seating tab loads, any assignment with `seat_index = null` whose table still has an obvious free slot is silently assigned the lowest free index. Pure client-side, no migration needed.

### 4. Right-click / long-press seat menu

New tiny component `SeatMenu` (uses existing `DropdownMenu` from shadcn) wrapping each occupied seat:

- **Unassign** — delete the assignment row.
- **Pin / Unpin** — toggle `pinned`.
- **Move to…** — submenu listing other tables; choosing one moves the guest to that table's first free seat.
- **Swap with…** — submenu listing currently seated guests at the same table.

Long-press on touch devices opens the same menu.

### 5. List-view parity

In `SeatingView`'s list view, each `TableCard` already shows seated guests as a vertical list. We'll:

- Render exactly `capacity` rows in seat order (1…N), each row being either a guest pill or an empty `[ Seat n ]` slot.
- Each row is a droppable seat target (same `seat:tid:idx` id), so seat-level placement works in list view too.
- Drag handle on the pill works the same as on the canvas.

### 6. Out of scope

- No DB schema changes — `assignments.seat_index` already exists.
- No changes to auto-assign / constraints solver beyond making it write `seat_index` (lowest-free) when it places a guest. That's a 5-line tweak in `AutoAssignDialog` if needed; we'll confirm during implementation.
- Room editor and other tabs untouched.

## Files touched

- `src/components/planner/FloorPlan.tsx` — per-seat droppables, draggable seated chips, swap visuals.
- `src/components/planner/SeatingView.tsx` — drop-id parsing, swap logic, seat-level list view, lazy backfill.
- `src/components/planner/SeatMenu.tsx` — new, small wrapper around `DropdownMenu`.
- Possibly `src/components/planner/AutoAssignDialog.tsx` — write `seat_index` on insert (one-line).

## Technical notes

- Drop ids encode both table and seat to keep dnd-kit's flat id space happy: `seat:{tableId}:{idx}`, `table:{tableId}`, `__unassign__`.
- Swap is two writes; we issue them in parallel with `Promise.all` and then `refresh()` once. If either fails we toast an error and refetch to recover.
- `seat_index` is constrained to `[0, capacity)` at write time. If capacity later shrinks below an existing index, that guest renders as "unseated at this table" until moved.
- The current invisible `SeatDragHandle` is removed — the visible seat chip becomes the drag handle, which is what users expect and stops the "I can't grab the guest" issue.
