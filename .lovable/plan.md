
## Problem

The `/demo` Seating canvas opens at ~30% zoom with tables shoved into the upper-left, leaving a large empty L-shape around the dance floor and bar. Three independent causes:

1. **Sample tables don't respect fixtures.** `DEMO_TABLES` is a regular 5-col grid hard-coded at y=130..610, x=180..900. The dance floor (bottom-right) and bar (bottom-left) are ignored — tables 11–14 and the kids' table sit *on top of / next to* the bar at y=610, while the middle-bottom of the room is left empty.
2. **Auto-fit zoom too small in demo.** `SeatingView` passes `chromeHeight={demoMode ? 320 : 240}`. That shrinks the viewport so `fit()` lands at ~0.3 even on a 1280px viewport. The canvas itself is also oversized (`PAD_TOP=90`, `PAD_BOTTOM=110`) which inflates `height` further and drags fit zoom down.
3. **No visual hierarchy at low zoom.** At 30% table names and seat dots collapse into tiny smudges, which is what makes the whole thing look "terrible" even though tables technically fit.

## Fix

### 1. Rebalance `DEMO_TABLES` to fit around fixtures

Default room is 20m × 14m → canvas ~1040 × 728 inside the room rect. Fixtures (in pct → px relative to room):
- Entry: top center
- DJ: top-right (~x 863..978, y 22..51)
- Bar: bottom-left (~x 21..229, y 597..648)
- Dance floor: bottom-right (~x 707..957, y 400..677)

Re-lay the 15 tables in a 4-row layout that **avoids the dance floor and bar**:

```text
Row 1 (head + back row, y=140):      [Head Table @ 520]
Row 2 (y=290): T1 T2 T3 T4 T5          (5 across, x=160,340,520,700,880)
Row 3 (y=440): T6 T7 T8 T9 T10         (5 across, same x)
Row 4 (y=580): T11 T12 T13 Kids        (4 across, x=300,470,640, Kids long @ 850 but
                                         only if it clears bar+floor — otherwise
                                         move Kids next to Head Table on row 1 right side)
```

Concretely:
- Drop the kids' long table onto **row 1** beside the head table (x=820, y=140) so it doesn't fight the dance floor.
- Bottom row becomes T11/T12/T13 only at y=560, x=200/380/560 — leaves the bar and dance floor with clean breathing room.
- All round tables get `~150px` horizontal pitch, `~150px` vertical pitch — already roughly what they are, just shifted up/left to clear bottom fixtures.

This is sample-data-only; no logic changes.

### 2. Loosen auto-fit so the demo opens at a readable zoom

In `src/components/planner/SeatingView.tsx`:
- Reduce `chromeHeight` in demo mode from `320` → `240` (the coach strip is ~80px, not 160px — current value over-counts).

In `src/components/planner/FloorPlan.tsx` `fit()`:
- Use `PAD_X` (70) on each side rather than the hard-coded `60` so we don't double-pad.
- Cap minimum auto-fit zoom on desktop at **0.5** (currently it just clamps to `MIN_ZOOM` 0.2), so a too-tall canvas can't render at 30%. If the user wants smaller they can zoom out manually.
- Center on the **tables' bounding box** (not the whole room rect) when `autoFit` is true — that way the empty dance-floor corner doesn't drag the fit zoom down.

### 3. (Bonus, cheap) Reduce vertical padding on the canvas

Drop `PAD_BOTTOM` from 110 → 70 and `PAD_TOP` from 90 → 60. The current values leave ~200px of dead space above/below the room outline that fit-to-viewport has to account for. This is a global change but it tightens every canvas, not just the demo.

## Files

- `src/lib/demo/sampleData.ts` — re-coord `DEMO_TABLES` (data only).
- `src/components/planner/SeatingView.tsx` — `chromeHeight={demoMode ? 240 : 240}` (effectively drop the demo override).
- `src/components/planner/FloorPlan.tsx` — tweak `fit()` math + lower `PAD_TOP`/`PAD_BOTTOM`.

## Out of scope

- The auto-arrange algorithm itself (already fixed in prior pass).
- Layout-balancer rewrite (the sample is hand-placed; auto-arrange already produces good output when triggered).
- Mobile demo canvas (separate pass).

## Verification

Open `/demo` fresh → canvas opens at ≥50% zoom; head + kids tables read clearly across the top; T1–T10 fill the middle two rows; T11–T13 sit between bar and dance floor with breathing room; no table overlaps a fixture.
