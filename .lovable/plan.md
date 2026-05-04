## Goals

Make the planner feel human. Five threads:
1. Smart dropdowns for repeated fields (party / meal / side)
2. Effortless save & return (no codes to memorize)
3. Friendly UX copy throughout — no engineer-speak
4. Surface Export so couples can find it
5. Drag-and-drop on the floor plan, not just the list

---

## 1. Smart "learn-as-you-go" fields

A reusable `<Combobox>` (Popover + Command, both already installed) that suggests existing values from the current guest list, with usage counts, and lets the couple pick or type a new one.

Apply to **GuestEditor** in `GuestsTab.tsx` for **Party / group**, **Meal**, and **Side** (RSVP stays a Select — already a dropdown).

Files: new `src/components/ui/combobox.tsx`; edit `src/components/planner/GuestsTab.tsx`.

---

## 2. Effortless save & return

We already store recents in `localStorage`; lean on it.

**Home (`src/pages/Index.tsx`):**
- If recents exist, show "Pick up where you left off" at the top of the right column with one-click open.
- Demote the "open by code" input to a small "have a code from your partner?" link that reveals the input.

**Planner header (`src/pages/Planner.tsx`):**
- Replace the lone "Share" button with a **Save & share** popover:
  - Reassurance line: "Saved automatically. Bookmark this page or send the link to yourself so you can pop back in anytime."
  - Copy link
  - Email link to me / partner (mailto with prefilled subject + body)

No backend changes. No accounts.

---

## 3. Friendly copy pass

Rewrites (sample, not exhaustive — done in one pass):

| Where | From | To |
|---|---|---|
| AutoAssignDialog | "Compute preview" | "Show me a preview" |
| AutoAssignDialog | "Groups guests by party, honors must / must-not constraints, and fills tables to capacity." | "We'll seat your attending guests together by group, respect any 'sit with / not with' rules you've set, and keep tables within capacity." |
| AutoAssignDialog | "Apply" | "Looks good — seat them" |
| AutoAssignDialog | "Keep existing assignments (only fill empty seats)" | "Keep the seats I've already arranged" |
| AutoAssignDialog | "Include 'maybe' RSVPs" | "Save a seat for 'maybe' guests too" |
| Planner header | "Auto-seat" | "Seat them for me" |
| TableCard | "Has conflicting guests" | "Two guests here shouldn't sit together" |
| TableCard | "empty" placeholder | "open seat" |
| StatsBar | (any "expected" / "eligible" wording) | "guests coming" |
| Onboarding | technical phrasing | warm, second-person voice |
| Empty states (FloorPlan, SeatingView, GuestsTab) | review for engineer-speak |

Files: `AutoAssignDialog.tsx`, `Planner.tsx`, `SeatingView.tsx`, `StatsBar.tsx`, `OnboardingFlow.tsx`, `FloorPlan.tsx`, `GuestsTab.tsx`, `TablesTab.tsx`.

---

## 4. Make Export discoverable

Today Export is buried in the "More" dropdown — invisible right when the couple is ready to print place cards.

- Add an **Export** button (icon + label) directly to the Planner header, next to "Seat them for me", visible whenever there's at least one assignment.
- Keep it in the "More" menu too as a fallback.
- Soften the ExportPanel headings ("Master seating chart" → "Big seating chart for the entrance", etc.).

Files: `Planner.tsx`, `ExportPanel.tsx`.

---

## 5. Drag-and-drop in the floor plan

Currently `FloorPlan.tsx` is pure SVG — it doesn't register as a dnd-kit droppable, and seats aren't drop targets, so dragging from the unassigned panel into the floor plan does nothing.

Plan:
- Wrap each table's `<g>` in a positioned HTML overlay (absolute-positioned div on top of the SVG) registered as a `useDroppable` with `id={table.id}` — same id space the list view uses, so the existing `onDragEnd` in `SeatingView` keeps working with zero changes.
- Add a hover/over highlight (ring + scale) when `isOver` is true.
- Allow dragging seated guests **off** a table in the floor plan: each occupied seat becomes a small `useDraggable` with `id={guest.id}`, mirroring the list-view GuestPill behavior. Dragging onto another table reassigns; dragging onto the unassigned panel removes them.
- Keep tooltips and the SVG visuals intact — overlays sit on top, transparent except on hover.

This means the same drag interactions work identically in both views.

Files: edit `src/components/planner/FloorPlan.tsx` (accept optional droppable/draggable wiring + an overlay layer); minor prop additions in `SeatingView.tsx` to pass through.

---

## Out of scope
- Accounts / login (would break the "no logins, no fuss" promise)
- Server-side "my plans" list
- Locking party / meal / side to fixed enums
- Re-arranging which seat a guest sits in within a table (still auto-ordered)

## Technical notes
- Combobox is built on existing `popover` + `command` shadcn primitives.
- Floor-plan dnd uses an HTML overlay rather than SVG droppables because dnd-kit's collision detection works on DOM rects — much more reliable than instrumenting `<g>` elements.
- All copy changes are presentation-only — no logic touched.
