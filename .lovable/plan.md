# Fix: make adding tables and importing guests obvious

## What's wrong

When you create a fresh plan, the planner opens on the **Seating** tab, which just shows "Add some tables first" with no button to do so. The tab bar is there but easy to miss, and the entry actions for guests/tables live inside other tabs. Result: it looks like there's nothing to do.

## Fix

1. **Smart default tab** — when a plan has 0 guests and 0 tables, open on a new **Get started** view (or default to Guests tab) instead of Seating.

2. **First-run "Get started" panel** — replaces the stats bar on an empty plan. Three big cards:
   - Import a guest spreadsheet (opens file picker directly, plus a "Download template" link)
   - Add guests one by one (jumps to Guests tab + opens the Add guest dialog)
   - Add tables (jumps to Tables tab + opens the Add table dialog, plus "Bulk add 10 round tables of 8" shortcut)
   
3. **Better empty states inside each tab** — every empty list now has a primary CTA button:
   - Seating tab empty → "Add tables" / "Add guests" buttons that switch tabs
   - Guests tab empty → already has Add/Import buttons; make them more prominent (large, centered card)
   - Tables tab empty → already has Add/Bulk buttons; same treatment
   - Unassigned panel empty (with no guests at all) → "Import guest list" CTA

4. **Make the tab bar more visible** — bump size, add subtle dividers, ensure it's clearly above the content on small viewports. Add a small badge/dot on tabs that have unfinished work (e.g. unassigned guests).

5. **Header hint** — show a short one-line helper under the plan name on first visit: "Start by importing your guest list or adding tables."

## Files to touch

- `src/pages/Planner.tsx` — smart default tab, get-started panel, helper text
- `src/components/planner/SeatingView.tsx` — empty-state CTAs that can switch tabs (lift tab control to parent or accept an `onSwitchTab` prop)
- `src/components/planner/GuestsTab.tsx` and `TablesTab.tsx` — accept an optional `autoOpen` prop so the parent can open the dialog after switching tabs
- New `src/components/planner/GetStarted.tsx` for the empty-plan onboarding card

No schema or backend changes needed.
