
# Demo: reflect new venue + open up the sandbox

Today `/demo` mounts only `SeatingView` over a frozen sample. None of the recent venue work (Venue tab, unique table names, balanced auto-arrange, movable/deletable fixtures) is reachable, and there's nothing to do beyond drag a guest and run auto-seat. This rebuild adds the new surfaces in a way that doesn't dump every control on the user at once.

## Goals

1. **Reflect the product** — the demo should show the Venue tab and the new behaviours we just shipped.
2. **More to play with** — visitors can add/rename/delete tables, move and delete fixtures, add a guest, run auto-arrange, run auto-seat.
3. **Progressive disclosure** — first impression stays a single focused canvas; advanced surfaces appear as the user signals intent.

## UX shape

```text
┌─ sample-data header (unchanged) ────────────────────────────┐
│                                                             │
│  Emma & James — a sample wedding                            │
│  [ Seating  ·  Venue  ·  Guests  ·  Rules ]   ← tab strip   │
│                                                             │
│  ┌─ Coach strip (dismissable, per-tab) ──────────────────┐  │
│  │ ✦ Try this: drag Linda off the head table, or hit    │  │
│  │   Auto-seat. Want to play more? Open Venue.          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  <active tab body>                                          │
│                                                             │
└─ conversion bar (unchanged) ────────────────────────────────┘
```

### Progressive-disclosure rules

- **First paint:** only Seating is visible. Other tabs render as "+ More" pill on the right of the tab strip; clicking expands the rest.  
  Rationale: returning visitors / those who came from a "see the room editor" link can jump straight in; first-timers aren't overwhelmed.
- **Coach strip** sits above the tab body, one per tab, dismissable (sessionStorage `demo:coach:{tab}:dismissed`). Copy is task-led, not feature-led:
  - Seating: "Drag Linda — she and Robert are flagged 'not near'. Or hit Auto-seat to watch it solve in 2s."
  - Venue: "Add a table from the rail, drag it anywhere, or hit Auto-arrange. Try deleting the bar."
  - Guests: "Add a guest, change an RSVP — they'll show up in the unassigned list on Seating."
  - Rules: "Add a 'not near' between any two guests — it'll flag the moment you seat them together."
- **Auto-expand** the full tab strip the first time the user interacts with anything (reuses existing `hasInteracted` flag), so power users see all surfaces after one drag.

### Per-tab body

| Tab | Component | Demo wiring |
|---|---|---|
| Seating | existing `SeatingView` | unchanged |
| Venue | `VenueTab` (lg) / `MobileVenueList` (below lg) | demo-mode handlers (see below) |
| Guests | `GuestsTab` | demo-mode handlers |
| Rules | `ConstraintsPanel` | demo-mode handlers, constraints become editable (currently locked) |

Below `lg:` the Venue tab already falls back to `MobileVenueList`, so this works on mobile without extra code.

## Demo state needs to grow

Today `demoStore` persists `{guests, tables, assignments, constraints}`. We need to also persist `roomConfig` (now mutable) and let constraints/guests change. Update `DemoState` and `loadDemoState`/`saveDemoState`/`resetDemoState` to:

- include `roomConfig: RoomConfig` (seeded from `DEMO_PLAN.room_config`)
- bump storage key to `demo:state:v2` (avoid crashing on stale v1 payloads — fall back to seed on parse mismatch)

`Demo.tsx` then holds `roomConfig` in state and passes a `setRoomConfig` everywhere the real Planner passes `onSavedRoom`.

## Demo-mode handlers

Components that today only know how to write to Supabase need a demo path. Two strategies, picked per component:

1. **Already supports `demoMode` prop** (`SeatingView`, `AutoAssignDialog`): keep using it.
2. **Doesn't** (`VenueTab`/`AddRail`/`VenueCanvas`/`MobileVenueList`, `GuestsTab`, `ConstraintsPanel`): wrap the Supabase client at the call sites by introducing a thin `demoMode` prop that gates the writes, mirroring the SeatingView pattern. Where adding a prop is invasive, an alternative is a `useDemoSupabase()` shim — but the prop is cleaner and matches the existing pattern, so prefer that.

State changes are mirrored into `setGuests` / `setTables` / `setAssignments` / `setConstraints` / `setRoomConfig` so the optimistic UI stays the source of truth, then `refresh` becomes a no-op.

## Reset button

`reset()` now also restores `roomConfig` and `constraints` from the seed, and clears coach-dismissed flags so the tour reappears on the fresh demo.

## SEO + analytics

- Title/description in `useSeoHead` updated: "Try Wedding Seater — drag guests, design the room, run auto-seat." (still <60 / <160 chars).
- JSON-LD description updated to mention room editing.
- Add an `analytics.track('demo_tab_change', { tab })` and `demo_coach_dismissed` for visibility into which surfaces get explored.

## Files

**Modified**
- `src/pages/Demo.tsx` — tab strip, progressive expand, coach strip, mount new tabs, pass demo handlers.
- `src/lib/demo/demoStore.ts` — add `roomConfig`, bump key to v2.
- `src/components/planner/venue/AddRail.tsx` — accept `demoMode` prop; gate `supabase.*` writes; call `onSavedRoom`/`refresh` consistently.
- `src/components/planner/venue/VenueCanvas.tsx` — same.
- `src/components/planner/venue/MobileVenueList.tsx` — same.
- `src/components/planner/VenueTab.tsx` — thread `demoMode` to children.
- `src/components/planner/GuestsTab.tsx` — accept `demoMode`; for the 5–8 supabase calls, gate behind it and call the existing `setGuests` prop (already plumbed) instead.
- `src/components/planner/ConstraintsPanel.tsx` — accept `demoMode` + `setConstraints`; mirror writes locally.

**New**
- `src/components/planner/demo/DemoCoach.tsx` — small dismissable strip with per-tab copy + sessionStorage keying.
- `src/components/planner/demo/DemoTabs.tsx` — the progressive-disclosure tab strip (collapsed → expanded), keeps Demo.tsx tidy.

**No deletes.**

## Out of scope

- Export/Compare tabs in the demo (require auth-style flows and PDF generation that's better kept out of the public sandbox).
- Persisting demo state across tabs/devices (still sessionStorage).
- Onboarding flow in demo (Empty-state already covers).
- Schema or RLS changes (none — demo never hits the DB).

## Verification

- Load `/demo` fresh: only Seating visible + coach strip. After one drag, full tab strip expands.
- Switch to Venue, add a table named "Table 2" → should auto-bump to "Table 2 (2)". Drag a fixture, delete the bar, hit Auto-arrange — tables should redistribute respecting the cleared fixture.
- Switch to Rules, add a NOT_WITH between any two guests, then seat them together on Seating tab — conflict ring appears.
- Refresh page → state persists (sessionStorage v2). Close tab + reopen → fresh seed.
- Reset button restores room, guests, tables, assignments, constraints, and re-shows coach strips.
- Mobile (<lg): Venue tab shows the existing MobileVenueList; tab strip collapses sanely.
