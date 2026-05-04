## Goal

Make the seating "Floor plan" canvas (`src/components/planner/FloorPlan.tsx`) feel like a Miro board — a living, navigable surface — and fix the chair layout on long/rectangular tables so seats sit cleanly along both long sides.

## What changes

### 1. Miro-style canvas behavior

Replace the fixed `viewBox` SVG + grid layout with a pan/zoom workspace:

- Wrap the SVG in a transform layer (`translate(panX, panY) scale(zoom)`).
- **Pan**: middle-mouse drag, space-bar + drag, or two-finger trackpad drag.
- **Zoom**: ⌘/Ctrl + scroll, pinch, and on-screen `+ / − / Fit` buttons (bottom-right cluster, like Miro/Figma).
- **Background**: subtle dot-grid that scales with zoom (replaces the current radial wash) so motion is felt.
- **Fit-to-content** button frames all tables; **Reset view** returns to 100%.
- Persist `{ panX, panY, zoom }` per scenario in `localStorage` so the view survives refresh.
- Tables remain drag-and-drop targets for guests — drop math is updated to account for the pan/zoom transform.

### 2. Dynamic feel

- Soft entrance animation when tables mount (fade + slight scale, staggered).
- Hover lift on tables (subtle shadow + 1–2px rise).
- Smooth `transition` on pan/zoom when triggered by buttons (not while actively dragging).
- Tiny zoom-percentage chip in the corner.
- Cursor changes: `grab` over empty canvas, `grabbing` while panning.

Visual restraint preserved — no new colors, just motion and depth using existing tokens.

### 3. Chairs on both long sides

Rework `computeSeats` in `FloorPlan.tsx` for `rectangle`, `long`, and `head` shapes so that:

- Two end seats (head/foot) are reserved first when capacity ≥ 4.
- Remaining seats are split evenly between the top and bottom long sides (`Math.ceil` top, `Math.floor` bottom, or vice-versa) so neither side is starved.
- Seats are spaced uniformly along each side using the table's actual width.
- Odd capacities place the extra seat on the top side for consistency.

This guarantees long tables always show chairs on both sides at every capacity, including small ones (e.g. 6, 7, 9) where the current code can stack everything on one side.

### 4. Out of scope

- Room editor (`RoomEditor.tsx`) — left untouched unless you also want the Miro treatment there.
- No data-model changes, no new dependencies.

## Files touched

- `src/components/planner/FloorPlan.tsx` — pan/zoom wrapper, dot-grid, zoom controls, animations, updated `computeSeats`.

## Technical notes

- Pan/zoom implemented with a single CSS `transform` on a wrapper `<div>` that contains both the SVG and the drag-overlay layer, so guest drop coordinates stay aligned without extra math.
- Drop-zone hit-testing already uses percentage offsets relative to the wrapper, which keeps working under transform.
- Dot-grid drawn as a CSS `background-image: radial-gradient(...)` with `background-size` scaled by zoom — cheap and crisp at any level.
- Zoom range clamped 0.4×–2.5×; pan clamped so at least part of the content stays in view.
