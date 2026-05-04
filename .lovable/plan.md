## Pattern: Browser-tab-style layout strip

Treat each layout as a first-class tab — like Google Sheets or browser tabs — sitting **directly above the seating canvas**. Couples instantly see "oh, I can have more than one of these."

### Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ [● Main plan ★] [ Plan B — long tables ] [ + New layout ]    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ( floor plan / seating canvas )                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- Active tab: filled background, primary color underline, name in bold, star if it's the default.
- Inactive tabs: muted, hover lifts them.
- Each tab has a tiny inline ⋯ menu on hover with: Rename, Duplicate, Make main, Delete (disabled if it's the only one).
- Trailing **"+ New layout"** is a real, visible affordance — not buried.
- When only one tab exists, render a **dashed ghost tab** next to it that says "+ Try a Plan B" — explicitly invites the second layout instead of waiting for the user to discover the +.
- Tabs scroll horizontally if there end up being many.

### Where it lives

- Move the strip out of the header dropdown and into a horizontal row **above the seating tabs** on the Seating page (and also above the canvas on the Tables page, since tables belong to a layout).
- Remove the `ScenarioSwitcher` button from the Planner header — it's now redundant.
- Remove the one-time "Not sure about the room setup?" hint banner — the ghost tab does that job inline.

### Behavior unchanged

- All the existing logic in `ScenarioSwitcher.tsx` (create / duplicate / rename / set default / delete, with table & assignment cloning) is preserved — it just gets a new shell.
- The "More → Compare layouts" entry stays for the side-by-side comparison view.

### Files

- new `src/components/planner/LayoutTabs.tsx` — the tab strip component (uses the same handlers from `ScenarioSwitcher`).
- edit `src/pages/Planner.tsx` — render `<LayoutTabs/>` above the Seating / Tables / Guests tabs (it visually belongs to seating + tables but is a plan-wide concept, so placing it just under the StatsBar makes it omnipresent without crowding the header). Remove the header `ScenarioSwitcher` and the layouts-hint banner.
- delete (or shrink) `src/components/planner/ScenarioSwitcher.tsx` — keep the logic by extracting the handlers into the new component, or import and reuse the dialog logic.

### UX copy

- Empty-second-tab ghost: **"+ Try a Plan B"** with subcopy on hover: "See your room a different way — keeps your guests."
- New-layout dialog title: **"Start another layout"**
- Duplicate dialog title: **"Copy this layout"** with body: "We'll copy your tables and seating so you can experiment without losing this one."

### Out of scope
- Side-by-side editing (the existing Compare view already covers that).
- Drag-to-reorder tabs.
- Renaming inline by double-clicking the tab (use the menu — keeps mobile predictable).
