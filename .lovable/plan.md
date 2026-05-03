# Wedding Seating Chart Planner — Plan

A shared, link-based planner where you import guests from a spreadsheet, define tables of any size and shape, and assign guests via either a visual floor plan or a list view.

## Core concepts

- **Plan** — one shared seating plan, accessible to anyone with the link (no login). A plan code in the URL identifies it.
- **Guests** — imported from CSV/XLSX, individually editable.
- **Parties/Groups** — a set of guests who arrived together (family, couple, friend group). Used for keeping people seated together.
- **Tables** — you define each table: name, capacity, shape (round / rectangle / square / head table), and position on the floor plan.
- **Seats** — each table has N seats; a guest occupies one seat.
- **Constraints** — "must sit with" and "must NOT sit with" between guests.

## Pages & UX

```text
/                      Landing — "Create a new plan" or "Open with code"
/plan/:code            The planner (single page with tabs)
   ├── Guests          Import, edit, RSVP, meals, relationships
   ├── Tables          Define tables (name, capacity, shape)
   ├── Floor plan      Drag tables on canvas, drag guests onto seats
   ├── List view       Tables as cards with guest slots, click to assign
   └── Print/Export    Master chart + per-table place cards (PDF)
```

A persistent header shows: plan name, share link (copy button), and live stats (assigned / total, RSVP'd, unassigned).

## Spreadsheet import

- Accepts `.csv`, `.xlsx`, `.xls`.
- Step 1: upload → preview first 10 rows.
- Step 2: **column mapping** UI (their headers → our fields). Auto-guesses from common names.
- Step 3: confirm import; duplicates by name are flagged for merge/skip.

Supported fields:

| Field | Notes |
|---|---|
| Name | required |
| Party / group | guests with same value get grouped |
| RSVP status | attending / declined / pending / maybe |
| Meal choice | free text (chicken, fish, veg, kids, etc.) |
| Must sit with | comma-separated names |
| Must not sit with | comma-separated names |
| Side | optional (e.g. bride / groom) — useful for auto-assign balance |

A downloadable **template CSV** is provided so the user has a clean starting point.

## Tables

- Add table: name, capacity (1–20), shape (round / rectangle / square / long banquet / head table).
- Bulk add: "Add 10 round tables of 8" shortcut.
- Each table shows fill state: e.g. `6 / 8`.
- Reorder, rename, delete (with warning if guests are seated).

## Floor plan view

- Free canvas with pan/zoom.
- Drag tables to position them; tables snap to a light grid.
- Click a table to open a seat ring; drag guests from a side panel onto specific seats.
- Tables show name + meal-mix dots (small colored dots per meal type).
- Unassigned guests panel is filterable (by group, RSVP, meal, search).
- Visual cues: table turns amber when over-capacity attempted, red when a "must not sit with" conflict exists at the table.

## List view

- Tables shown as cards in a responsive grid.
- Each card lists seated guests (with meal/RSVP badges) + open slots.
- Click an empty slot → searchable picker of unassigned guests.
- Drag-and-drop between cards also works.
- Same conflict highlighting as the floor plan.

## Auto-assign / suggestions

A "Suggest seating" action runs a constraint solver:

1. Only seats guests with RSVP `attending` (and `maybe` if you opt in).
2. Hard constraints: capacity, "must not sit with".
3. Soft preferences (scored): keep parties together, honor "must sit with", balance sides, group similar meal choices, fill smaller tables first.
4. Presents the result as a **preview diff** — accept, reshuffle, or reject. Never silently overwrites manual placements unless you choose "Reassign all".

Locking: any seat can be **pinned** so auto-assign won't move it.

## Search & filter

Global search bar (⌘K) finds any guest and jumps to their seat (or shows "unassigned"). Filters: RSVP, meal, group, side, assigned/unassigned, has conflict.

## Stats dashboard

Top-of-page strip + dedicated tab:

- Total invited / attending / declined / pending
- Assigned vs unassigned (attending only)
- Meal totals (for catering)
- Tables: count, total capacity, current fill %
- Conflict count (constraints currently violated)
- Kids count, accessibility-flagged guests

## Print / PDF export

- **Master seating chart** — alphabetical "Guest → Table" list (the typical entry-table sign).
- **By-table list** — each table on its own page with its guests.
- **Place cards** — printable cards with name + table number, 8 or 10 per A4/Letter sheet.
- **Floor plan snapshot** — current canvas as PDF.
- **CSV export** of final assignments for caterer / venue.

## Sharing model (no login)

- Creating a plan generates a random URL like `/plan/luna-river-4821`.
- Anyone with the URL can view and edit (write it down — no recovery).
- Optional **edit lock**: set a 4-digit PIN required to edit; viewers without the PIN see read-only.
- Last-writer-wins on conflicts; recent activity stamp shown ("edited 2 min ago").

## Things you may not have considered

- **Plus-ones / unnamed guests** — placeholders like "Sarah's +1" that can be renamed later.
- **Children at the table** — kids count toward capacity but get a "kid" badge; useful for venues with high chairs.
- **Accessibility seating** — flag wheelchair access / hearing-side, keep them at edge seats near aisles.
- **Head table / sweetheart table** — special table type, not part of auto-assign by default.
- **Vendor / supplier seats** — DJ, photographer meals tracked separately so caterer counts are right.
- **Family politics constraints** — "must NOT sit with" is as important as "must sit with" (divorces, feuds).
- **Late RSVPs** — easy to add a guest after import without redoing the whole layout.
- **Undo / version history** — at minimum undo last action; ideally named snapshots ("before mom's changes").
- **Mobile usability** — list view must be fully usable on phone for last-minute edits at the venue.
- **Caterer handoff** — meal totals and dietary notes export.
- **Empty-seat handling** — distinguish "intentionally empty" from "unfilled".

## Technical details

- Stack: existing React 18 + Vite + Tailwind + shadcn. Add `react-dnd` (or `dnd-kit`) for drag-and-drop, `xlsx` for spreadsheet parsing, `jspdf` + `html2canvas` for PDF, `zustand` for in-app state.
- Backend: enable **Lovable Cloud**. Tables:
  - `plans (id, code, name, pin_hash nullable, created_at, updated_at)`
  - `guests (id, plan_id, name, party, rsvp, meal, side, is_kid, accessibility, notes)`
  - `tables (id, plan_id, name, capacity, shape, x, y, rotation)`
  - `assignments (id, plan_id, guest_id unique, table_id, seat_index, pinned)`
  - `constraints (id, plan_id, guest_a, guest_b, kind: 'with' | 'not_with')`
- RLS: open read/write for rows whose `plan_id.code` matches the request (single shared-plan model). PIN check enforced via an edge function for write operations when a PIN is set.
- Realtime: subscribe to `assignments` changes so two browsers on the same plan stay in sync.
- Auto-assign solver: greedy with backtracking, runs client-side; ~hundreds of guests handled instantly.
- Design: warm, editorial wedding aesthetic — ivory background, deep aubergine accent, serif display font (e.g. Fraunces) paired with a clean sans (e.g. Inter), soft shadows, generous spacing. All tokens defined in `index.css`.

## Build order

1. Cloud setup + schema + plan creation/landing page.
2. Guests tab: manual add + spreadsheet import with column mapping.
3. Tables tab: define tables.
4. List view assignment + conflict detection.
5. Floor plan canvas + drag-and-drop.
6. Stats strip + filters + global search.
7. Auto-assign with preview.
8. Print/PDF exports.
9. Optional PIN lock + realtime sync polish.
