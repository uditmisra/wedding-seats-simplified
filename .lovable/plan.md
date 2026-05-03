## Goal

Two related needs:
1. **Multiple seating charts** — manage many weddings (or many drafts of one) from the home page.
2. **Alternate table configs / scenarios** — within a single wedding, compare side-by-side variants of tables + assignments without losing the current arrangement.

## Approach

Introduce a **Scenarios** concept *inside* a plan. Each plan keeps its shared guest list (the people coming don't change between drafts), but **tables and assignments belong to a scenario**. This gives:

- "Plan A: round tables, family style" vs "Plan B: long tables, mingle"
- Quick **duplicate** to fork the current arrangement and tweak.
- A **compare view** to see two floor plans side-by-side.

Multiple charts across weddings is already covered by plan codes — we'll polish the home page so users can see/manage their recently opened plans (stored in localStorage, no auth).

## Scope

### Data model
- New table `scenarios { id, plan_id, name, is_default, created_at }`.
- Add `scenario_id uuid` to `tables_def` and `assignments` (FK to scenarios; for backward compat we backfill one default scenario per existing plan and move existing rows under it).
- Constraints stay on the plan (people-level rules, not scenario-level).
- Realtime continues to work; hooks subscribe to current scenario.

### UI
- **Scenario switcher** in the planner header: dropdown showing all scenarios for this plan + actions: New, Duplicate current, Rename, Delete, Set default. Switching scenario reloads tables/assignments for that scenario.
- **Compare mode**: toggle in Seating tab to show two floor plans side-by-side (left = current scenario, right = chosen comparison scenario). Read-only on right. Stats bar shows deltas (seated count, conflicts).
- **Home page**: list "Recent plans" from localStorage with name, code, last opened, quick "Open" link. Keep the existing "Open by code" and "New plan" flows.

### Out of scope
- Cross-scenario merge/diff of individual assignments (call out as follow-up).
- Sharing scenarios with separate links (share link still scopes to plan; the URL gets `?scenario=<id>` for deep-linking).

## Technical details

- **Migration**:
  - `CREATE TABLE scenarios (...)`, public RLS like other tables.
  - Add nullable `scenario_id` columns to `tables_def`, `assignments`.
  - Backfill: for each distinct `plan_id`, insert a `Default` scenario and `UPDATE` rows to that id, then `ALTER COLUMN ... SET NOT NULL`.
  - Index on `(plan_id)` and `(scenario_id)` for both tables.
- **`usePlanData` hook**: takes optional `scenarioId`; fetches scenarios list + scoped tables/assignments. Default to plan's `is_default` scenario; sync `?scenario=` query param.
- **New components**:
  - `ScenarioSwitcher.tsx` (header dropdown)
  - `CompareScenarios.tsx` (two `FloorPlan`s side-by-side with a scenario picker on the right)
  - `RecentPlans.tsx` (home-page list reading `localStorage["lovable-seats-recent"]`)
- **Edge cases**: deleting current scenario falls back to default; can't delete the last scenario; duplicating clones tables and assignments with new ids.
- **No breaking change to AI flows** — Smart inputs already pass `planId`; we'll extend them to also pass the active `scenarioId`.

## Migration ordering

1. Migration (schema + backfill).
2. Update types, hook, and all insert sites to include `scenario_id`.
3. Add Scenario switcher to planner header.
4. Add Compare view inside Seating tab.
5. Home page recent-plans list.
