## Goal

Take the room + tables experience from "three tabs with sliders and two AI inputs" to **one tab, one canvas, one verb (drag)** — matching the directness of Hitched's pattern in the screenshots.

The Seating tab keeps assigning guests; everything about building the venue collapses into a single new **Venue** tab.

---

## What the new Venue tab looks like

```text
┌─────────────────────────────────────────────────────────────┐
│  Venue                                                       │
├──────────────┬───────────────────────────────────────────────┤
│  Add table   │                                               │
│  ▭  ◼  ⬤    │                                               │
│  long sq rnd │              gridded canvas                   │
│              │           (the room itself)                   │
│  Add feature │                                               │
│  🍷 bar      │       ⬤      ⬤      ⬤                       │
│  🎧 dj       │                                               │
│  💃 dance    │       ⬤      ⬤      ⬤                       │
│  🚪 entry    │                                               │
│              │             ▣ dance floor                     │
│  ─────────── │                                               │
│  Describe    │                                               │
│  with AI…    │                                               │
│              │                                               │
└──────────────┴───────────────────────────────────────────────┘
```

### Left rail (compact, ~220px)

1. **Add table** — three icon buttons: long / square / round. Click → small modal (name + #chairs, matching Hitched) → table dropped at canvas center, ready to drag. Optional fourth icon "+ head table" for the rectangular head-table preset.
2. **Add feature** — vertical list of fixtures (bar, DJ, dance floor, entry, stage, photo booth). Click → fixture drops at canvas center.
3. **Describe with AI** (collapsed by default, single input) — "20×14m ballroom, 12 rounds of 8, dance floor by the bar." One call, fills the canvas in one shot. Replaces both existing AI inputs.

### Canvas (rest of the tab)

- Gridded background (the visual cue "this is the room").
- Tables and fixtures both live here. Drag to move. Selection shows a rotate handle + a small inline floating bar (rename, change capacity, delete) — no full inspector panel needed for the common case.
- Double-click a table → the existing Add/Edit modal opens for finer edits.
- Tiny chip bottom-left: room dimensions ("20m × 14m") + a pencil icon → opens dimensions popover. Default 20×14m. No dedicated tab or panel.
- Bottom-left: live counts ("12 tables · 96 seats · 4 features").
- Bottom-right: zoom + fit + auto-separate (only appears when overlaps exist).

### Mobile

Below `lg:`, the canvas is impossible to drag usefully. Show a flat list:
- "Tables (12)" section with tap-to-edit rows.
- "Features (4)" section with tap-to-edit rows.
- "Room dimensions" row.
- A primary "+ Add" button → action sheet with all the same options.

This matches our existing pattern in `RoomEditor`'s mobile gate but is now useful (the desktop canvas isn't blocked behind a "go to laptop" message — it's a real list).

---

## Why this is better than what's shipped today

| Today | New |
|---|---|
| Tables tab: card grid, no spatial control | Venue tab: drag on a canvas |
| Room tab: 4 sliders per fixture (X%, Y%, W%, H%) | Drag the fixture on the same canvas |
| Two AI inputs (one per tab) | One AI input |
| New tables default to (0,0) and pile up | New tables drop at canvas center, snapped |
| `RoomEditor.tsx` exists, unreachable | Becomes the foundation of `VenueCanvas` |
| Room dimensions in meters, decoupled from canvas | Dimensions edit the canvas you're looking at |

---

## Data model

No schema changes.

- `tables_def` (`x`, `y`, `rotation`) — unchanged.
- `plans.room_config` jsonb — keeps the existing `RoomConfig` shape from `src/lib/roomConfig.ts`. Drag updates `x_pct` / `y_pct` from pixel deltas (the existing `RoomMiniPreview` already does this — port the math).
- New tables default to `x = CANVAS_W/2`, `y = CANVAS_H/2`, snapped to grid, with a small jitter so 12 fresh tables don't stack.

---

## Routing & tab changes

`src/pages/Planner.tsx`

- Replace `II Tables` + `III Room` with single `II Venue`.
- Renumber to `I Guests`, `II Venue`, `III Rules`, `IV Seating`, `V Compare`, `VI Export`.
- Redirect old `?tab=tables` / `?tab=room` to `?tab=venue` so existing shared links keep working.
- Update `OnboardingFlow` CTAs ("Go to tables", "Go to room") to point at Venue.

---

## Files

**New**
- `src/components/planner/VenueTab.tsx` — top-level orchestrator (state, AI, save plumbing).
- `src/components/planner/venue/VenueCanvas.tsx` — the canvas. Tables + fixtures, drag, rotate, snap, overlap detect, auto-separate. Logic ported from `RoomEditor.tsx`.
- `src/components/planner/venue/AddRail.tsx` — the left rail (table shape icons, feature list, AI input).
- `src/components/planner/venue/AddTableModal.tsx` — small modal (name + capacity), Hitched-style.
- `src/components/planner/venue/SelectionBar.tsx` — the inline floating bar over a selected element.
- `src/components/planner/venue/MobileVenueList.tsx` — `lg:` fallback.
- `src/components/planner/venue/RoomDimsPopover.tsx` — pencil popover from the dimensions chip.

**Modified**
- `src/pages/Planner.tsx` — tab swap, query-param migration.
- `src/components/planner/OnboardingFlow.tsx` — retarget CTAs.
- `src/lib/aiParse.ts` + `supabase/functions/ai-parse/index.ts` — extend the "room" mode response to optionally include a `tables` array (`{ name, shape, capacity, x_pct, y_pct }`) so one AI call fills both. Can ship as a second PR after the visual UX lands.

**Deleted**
- `src/components/planner/RoomSetupPanel.tsx` (slider UI).
- `src/components/planner/TablesTab.tsx` (card grid CRUD — absorbed).
- `src/components/planner/SmartTableInput.tsx` (folded into the one AI input).
- `src/components/planner/RoomEditor.tsx` (logic ported to `VenueCanvas`).
- `src/components/planner/room/ToolPalette.tsx` + `room/PropertiesPanel.tsx` (wall-drawing UI, explicitly out of scope).

---

## Out of scope

- Wall / door / window drawing.
- Pinch-to-zoom on the venue canvas (wheel zoom is enough for desktop; mobile uses the list).
- Per-scenario fixtures (stays plan-level as today).
- Any database schema migration.
- Touching the Seating tab beyond verifying it still renders fixtures.

---

## Risks

- Anyone bookmarking `?tab=tables` or `?tab=room` lands on Venue — handled by query-param redirect, but worth flagging.
- New default table position (canvas center + jitter) is a behavior change for `OnboardingFlow` and auto-seat — verify both still feel right.
- `RoomEditor` has ~80 lines of in-progress-drag crash recovery via localStorage. Port that to `VenueCanvas` — dropping it would feel like a regression.
- The two-AI-into-one edge-function change is meaningful work; if we want to ship the visual UX first, the AI input can stay split-target (or get hidden) for one PR and unify in a follow-up.
