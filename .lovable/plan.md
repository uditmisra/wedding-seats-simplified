
# Calm the planner

The app today asks a stressed couple to scan a lot at once: 4 stat cards, 6 equal-weight tabs, 5 buttons in the header, two ways to add tables side by side, a list view that hides the prettier floor plan. None of these are *wrong*, but together they read as a tool, not a companion.

This plan removes weight without removing capability. Nothing is deleted — secondary surfaces just step back so the primary moment (seeing your guests land at tables) can breathe.

## Principles

- **One thing at a time.** Each screen should answer one question.
- **Quiet the happy path.** Warnings only appear when something is wrong.
- **Show the delight first.** The floor plan is the payoff; lead with it.
- **Restraint over rework.** Keep all features; only re-rank them.

## Changes

### 1. Planner header — softer, fewer chrome elements
- Remove the small `code: luna-meadow-4821` text (lives in the URL and in Share).
- Drop the standalone `Sparkles` mark; the wedding name *is* the brand here.
- Demote **Share** to a ghost button. Keep **Auto-seat** as the only filled CTA — it's the magic moment.
- Scenario switcher stays, but visually grouped with Share so it reads as "plan settings" rather than another action.

### 2. Tabs — 3 primary, the rest in a "More" menu
Today: `Seating · Guests · Tables · Compare · Constraints · Export` (all equal).
After: `Seating · Guests · Tables` + a `…` menu containing `Compare layouts`, `Constraints`, `Export & print`.
Counts move to a muted suffix (`Guests 84`) instead of parenthesized (`Guests (84)`) — less visual noise, same info.

### 3. Stats — one progress strip, not four cards
Replace the 4-card grid (Attending / Seated / Meals / Conflicts) with a single rounded strip:

```text
 62 of 84 guests seated  ████████████░░░░  74%        ⚠ 2 to review
```

- The headline number is the one that matters: *how close are we to done*.
- Meals move into the Export tab (where the caterer info lives anyway).
- Conflicts only render when > 0 — the happy path stays silent.
- When everything is seated and conflict-free, the right side shows a quiet `✓ All set`.

### 4. Seating — open straight to the floor plan
The floor plan is the most delightful surface in the app. Default the view to **Floor plan**; the List/Floor toggle stays for power users but becomes a subtle pill in the corner instead of competing for attention.

### 5. Guests tab — collapse the toolbar
- Hide the **RSVP filter** until the guest list has more than ~15 entries (early on it's just clutter).
- Move the **Template** download into the Import dialog as a small link ("Don't have a spreadsheet? Download our template") — it doesn't need top-level real estate.
- Keep **Search**, **Import**, **Add guest** visible. That's it.

### 6. Tables tab — one way in, manual as a fallback
Today shows both the AI smart input *and* "Or set up manually: Add table / Bulk add" right below.
After: lead with just the smart input. Below it, a single muted link: **"Prefer to add them manually?"** that reveals the Add / Bulk buttons inline. Same features, less to read on first glance.

### 7. Onboarding — trim copy, remove duplicate skip rails
- Each step keeps one short sentence (drop the second explainer line where present).
- Remove the redundant "Skip for now" / "Back" pair on every step; rely on the clickable progress pills at the top.
- Step 3 keeps the two delightful cards (Auto-assign / Open chart) — these are good as-is.

## Out of scope
- No data model changes.
- No copy rewrites beyond trimming.
- No new colors, fonts, or motion. The existing sage/aubergine palette and `--shadow-elegant` already feel warm; we're just letting them show.

## Files touched (presentation only)
- `src/pages/Planner.tsx` — header trim, tabs collapse + "More" menu
- `src/components/planner/StatsBar.tsx` — replace grid with single progress strip
- `src/components/planner/SeatingView.tsx` — default view = floor plan, quieter toggle
- `src/components/planner/GuestsTab.tsx` — conditional filter, fold Template into Import dialog
- `src/components/planner/TablesTab.tsx` — hide manual controls behind a disclosure
- `src/components/planner/OnboardingFlow.tsx` — copy + nav trim

No backend, no schema, no business logic. If something here lands wrong we can revert any single file without affecting the others.
