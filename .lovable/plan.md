Two fixes, both rooted in the screenshot: the Venue rail is a text menu (not a visual catalog), and the Seating chart respects ad-hoc Venue positions and ends up lopsided.

## 1. Visual Venue rail (AddRail.tsx)

Replace the cramped 4-up icon grid + text list with a **catalog of visual cards**, like the Hitched reference:

- **Tables section**: 2-column grid of larger tiles (~100×120). Each tile renders a miniature SVG of the actual shape (circle / long rect with chairs / square / head table) drawn in ink-on-paper — same primitives as `PaperTable` but simplified. Label underneath in `font-display` 13px, capacity hint in mono ("Seats 8"). Hover lifts + terracotta border.
- **Features section**: same 2-column tile grid. Each fixture rendered as a small illustrative pictogram (dashed-outline rect with italic label for dance floor, ◉ for DJ, 🍷 bar, etc. — drawn in SVG, not emoji). Tile shows the icon big, name small.
- **AI input**: keep, but move to a slim footer band so the catalog dominates.
- Widen the rail from `240px` → `280px` in `VenueTab.tsx` grid to fit two columns comfortably.

The point: when you scan the rail, you *see* tables and features as objects, not as a list of words.

## 2. Auto-arranging Seating chart (FloorPlan.tsx)

Current behaviour: as soon as any table has `x>0` or `y>0`, FloorPlan switches to "custom positions" mode and renders each table at its stored coordinate. Since the new Venue editor saves positions on every drop, every table now has stored coords — and the Seating view inherits whatever cluster the user happened to drop them in (the right-hand pile in the screenshot).

Fix: **decouple Seating layout from Venue layout.** The Seating canvas always auto-grids tables inside the room rectangle, ignoring `tables_def.x/y`. Venue stays the place where positions matter (for export and the floor-plan PDF).

Concrete changes in `src/components/planner/FloorPlan.tsx`:

- Remove the `hasCustomPos` branch in the layout calculation (lines ~68–80, ~253–267). Always use the auto-grid path: cells = `roomW/cols × roomH/rows`, table centred in cell.
- Keep `arrangeMode` as the single explicit override — when on, live drags still work and writes still flow through `onTableMove`. When off (the default for Seating), positions are computed, not read.
- Choose `cols` based on table count *and* room aspect ratio so a wide room gets more columns (avoids the right-side pile): `cols = clamp(round(sqrt(n * roomW/roomH)), 1, 6)`.
- The PDF floor-plan export (`FloorPlanPDF.tsx`) uses the same FloorPlan props path; verify it still renders centred (it should — same code path).

The Venue canvas keeps doing what it does: stored positions are still respected *there*, because users want to arrange the room for the PDF print. Seating is purely about who-sits-where; the chart should just look tidy.

## Out of scope

- No schema changes. `tables_def.x/y` stay; they're just unused by FloorPlan in non-arrange mode.
- No change to the Venue canvas drag/snap behaviour.
- No change to the AI parsing pipeline.

## Files touched

- `src/components/planner/venue/AddRail.tsx` — rewrite the rail UI
- `src/components/planner/VenueTab.tsx` — bump rail column to 280px
- `src/components/planner/FloorPlan.tsx` — always auto-grid; aspect-aware column count

## Verification

- Open Seating: tables fill the room in a balanced grid, no right-side pile.
- Open Venue: rail shows visual tiles; clicking a table tile opens the existing AddTableModal; dragging on canvas still works.
- Toggle arrange-room in Seating: positions become draggable again; saved on release.
