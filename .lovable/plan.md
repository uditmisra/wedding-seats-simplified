## What's there now

- Empty seats on the floor plan are drop targets only. Clicking does nothing — you can drag a guest from the unassigned panel onto a seat, but you can't tap a seat to pick a person.
- Right-click on an *occupied* seat opens a menu (pin, move, swap, remove). Empty seats have no menu at all.
- The unassigned panel lives off to the side, which is fine for sweeping work but slow when you've zoomed into one table.

## What we'll build

A click-to-assign popover anchored to any empty seat. Tapping the numbered seat opens a compact card that shows recommended guests first, a search box, and a couple of useful filters. Picking someone seats them in that exact seat (with the same swap/move plumbing the drag flow already uses).

### The card

```text
┌─ Seat 3 · T2 · College ──────────── ✕ ┐
│ [🔍 Search guests…                 ]  │
│                                       │
│ Filters: [All] [Bride] [Groom] [Kids] │
│          [V] [GF] [Accessibility]     │
│                                       │
│ RECOMMENDED                           │
│ ● Gabriela Reyes      College · Bride │
│   ↳ must sit with Benjamin (here)     │
│ ● Felix Andersson     College · Groom │
│   ↳ same party as 3 others here       │
│                                       │
│ ALL UNASSIGNED (12)                   │
│ ○ Camila Vargas       Work · Groom GF │
│ ○ Hiroki Tanaka       Work · Bride    │
│ … scrollable                          │
│                                       │
│ ⚠ Felix can't sit with Hiroki (here)  │
└───────────────────────────────────────┘
```

### Recommendation logic (in priority order)

1. **Must-sit-with** a guest already at this table (`constraints.kind = "with"`).
2. **Same party** as the majority of guests already at this table.
3. **Same side** (bride/groom) as the table's lean.
4. **Kids** if the table already has a kid.
5. Everyone else, alphabetised — but anyone with a `not_with` conflict against someone seated here is **dimmed and shows a warning chip**, not hidden (user can override).

Capacity full → card opens in "swap" mode: the recommended list shows current seat occupants you'd be replacing.

### Filters

Compact chip row with single-select category + multi-select tags:
- **Side**: All · Bride · Groom · Either
- **Group**: Adults · Kids
- **Diet**: V · GF · Accessibility (any)
- **Party**: free text already covered by search

### Search

Matches name, party, and notes. Debounced 80ms. Up arrow / down arrow to move through the list, Enter to seat the highlighted guest.

### Interaction

- **Single click on empty seat** → opens the popover (Radix Popover anchored to the seat).
- **Drag still works** — popover only opens on a clean click, not a drag start.
- **Right-click on empty seat** → same popover (kept consistent with occupied-seat menu).
- **Click on occupied seat** → keep current behavior (drag to move). Right-click still opens the existing edit menu.
- **Mobile**: popover becomes a bottom sheet using the existing `Drawer` component, same content.
- **Esc** closes; clicking outside closes; selecting a guest closes and toasts "Maya seated at T1 · Family · Seat 3".

### Edge cases

- **No unassigned guests left** → popover shows "Everyone's seated" with a button to swap from another table.
- **Already-seated guest picked** → reuses `placeGuestAtSeat` (already handles swap with the previous occupant).
- **Read-only mode** (`canEdit = false`) → popover doesn't open; empty seat shows tooltip "Read-only".
- **Constraint conflict on pick** → still allows it but toasts a warning.

## Files affected

- `src/components/planner/SeatPicker.tsx` (new) — the popover/sheet UI, search, filters, recommendation list, keyboard nav.
- `src/lib/seatRecommend.ts` (new) — pure ranking function `rankCandidates(seat, table, tableSeated, allUnassigned, allSeated, constraints) → RankedGuest[]`.
- `src/components/planner/FloorPlan.tsx` — wrap empty-seat node in the new picker; thread `onAssign(guestId, tableId, seatIndex)` and the relevant data props down from `SeatingView`.
- `src/components/planner/SeatingView.tsx` — pass `unassigned`, `assignments`, `constraints`, `guestById`, `onAssign={placeGuestAtSeat}` into `FloorPlan`.
- No DB changes. Reuses the existing `placeGuestAtSeat` flow, so swap, pin, and constraint logic stay in one place.

## Out of scope (call out if you want them)

- AI-assisted "auto-fill this table" suggestion in the same popover.
- Multi-select to seat several guests across consecutive seats in one go.
- Persisted per-user filter preferences.