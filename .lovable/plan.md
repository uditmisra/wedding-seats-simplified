## What the demo is for

`/demo` exists to give a stressed couple a 30-second "this could actually work for us" moment, then convert. The desktop demo does that with three affordances: pan/drag a tiny chart, try a specific head-table conflict, and hit auto-seat. On a 390px phone, **two of those three don't really work**:

- Long-pressing a tiny guest pill in a drawer, then dragging it across a cramped floor plan onto a 12px seat dot, is fiddly enough that most users abandon.
- "Try the conflict at the head table" requires zooming in, finding Linda and Robert, and dragging them — none of which is obvious. The instruction is a desktop instruction.
- Auto-seat works perfectly on mobile — it's a single tap and the wow lands in 2 seconds. But it's hidden as an icon-only secondary button, while the visual hierarchy points at the broken drag flow.

The mobile demo today *teaches users they can't use the product*. That's the actual problem; visual cramping is a symptom.

## Reframe: auto-seat is the hero on mobile

On desktop, drag-and-drop is the magic. On mobile, **auto-seat is the magic**, and we should design the whole demo around making it the inevitable next action.

## Changes

### 1. Rewrite the demo guidance for mobile — `src/pages/Demo.tsx`
Replace the body copy below `sm:` with a single, mobile-specific instruction:
> "Tap **Auto-seat** to watch it solve a 120-guest chart in 2 seconds. Pinch to zoom in."

Keep the desktop "Drag a guest… try the conflict at the head table…" copy at `sm:` and up. Stop telling phone users to do something they can't comfortably do.

### 2. Promote Auto-seat to a labeled primary action on mobile — `src/components/planner/SeatingView.tsx`
- Below `sm:`, render the Auto-seat button as a full-width labeled primary pill (`bg-ink text-paper`, 44px tall, with the wand icon + "Auto-seat all 120 guests" label) under the view-toggle row.
- Above `sm:`, keep the existing icon-pill in the top-right (desktop layout unchanged).
- After auto-seat runs once on mobile, demote the button to a small "Reshuffle" pill in the same slot — the user has seen the magic; don't keep shouting.

### 3. Auto-fit to a *tappable* zoom, not a "fits-everything" zoom — `src/components/planner/FloorPlan.tsx`
Current `fit()` shrinks the canvas until everything is visible, which on 390px produces tables so small the seats are not tap targets. New behaviour on viewports under 640px:
- Compute the zoom that makes the average table ~80px wide (a real tap target).
- Center on the room's center of mass.
- Allow user to pan/pinch from there — the whole chart isn't visible at once, and that's fine. A scrollable, legible chart beats a "complete" chart you can't touch.
- Lower `MIN_ZOOM` to `0.2` so this computed zoom isn't clamped away on very small phones (no-op for desktop, where users wheel-zoom into the same range).

### 4. Make the conversion bar honest — `src/pages/Demo.tsx`
The bar currently claims "You sorted Emma & James's wedding" the second the page loads. Track a single boolean (`hasInteracted`) flipped on first assignment change, table move, or auto-seat. Until then the copy reads:
> "Get a feel for it. When you're ready, start your own."

After interaction, swap to the existing celebratory copy. This costs ~10 lines and removes a small but real credibility hit.

### 5. Dedupe the top CTA on mobile — `src/pages/Demo.tsx`
Hide the header "Start your chart" pill below `sm:`. The sticky bottom bar already carries it, and on mobile two competing primaries above and below the chart make the chart itself feel like an interstitial. Keep Reset and the wordmark.

### 6. Slim the chrome so the chart gets the room — `src/pages/Demo.tsx`
- Drop `<h1>` to `text-[22px]` below `sm:`.
- Reduce `<main>` padding from `py-6` to `py-3 sm:py-6`.
- ConversionBar: `h-14 sm:h-16` + `pb-[env(safe-area-inset-bottom)]` on the wrapper, smaller CTA padding on mobile.
- Update the "Guests to seat" FAB offset to `bottom: calc(64px + env(safe-area-inset-bottom, 0px))` to match the slimmer bar (`lg:hidden`, so desktop unaffected).

### 7. Soften the "Guests to seat" drawer's purpose on mobile
The drawer's drag flow stays — power users can still drag — but its label changes from "Guests to seat" to "**95** still to seat — drag or tap". This sets expectation that taps are valid (groundwork for a future tap-to-seat mode; not built in this plan).

## Out of scope (intentional)
- **Tap-to-seat placement mode** (tap guest → tap seat). Biggest unlocked UX win, but requires real changes to `SeatingView` + `FloorPlan` interaction model + visual placing state. Worth its own plan.
- Redesigning the Plan/Grouped/List toggle.
- Onboarding/dashboard/planner pages — covered by their own mobile passes.
- Pinch-to-zoom — already wired in `FloorPlan.tsx`.

## Risk
Low. Changes 1, 2, 4, 5, 6, 7 are mobile-gated by breakpoint. Change 3 alters the `fit()` heuristic and lowers `MIN_ZOOM`, which affects the demo route's first paint and the wheel-zoom floor on desktop — both verifiable in one preview pass.
