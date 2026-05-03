## Goal

Cut the friction. Today every flow asks for too much (column mapping, shape pickers, capacity inputs, RSVP enums, conflict UIs). Replace these with **one smart text box** powered by Lovable AI, plus collapsed "advanced" details. Keep all existing UI as fallback.

## The four AI moments

### 1. Smart Add Guests (replaces manual form + bulk paste)

A single textarea on the Guests tab and Get Started card:

> "Paste or type anything — names, a copy from your wedding website, an email thread, a WhatsApp list. We'll figure it out."

Examples that should work:
- `John & Sarah Smith +2 kids (vegetarian)`
- `Mom, Dad, Aunt May (wheelchair), Uncle Bob — bride side`
- A pasted chunk of an RSVP email

AI returns a structured list of guests (name, party, side, meal, is_kid, accessibility, notes) which we preview in a confirm-table before insert. User can edit inline, then **Add all**.

### 2. Smart Spreadsheet Import (kills the column-mapping step)

Today: upload → manual dropdown for every column.
New: upload → AI gets the headers + 3 sample rows → returns the mapping + RSVP/kid normalization rules → we go straight to the preview table. Manual mapping stays as a "Adjust mapping" link for edge cases.

### 3. Smart Table Setup (replaces Add Table + Bulk Add dialogs)

One input:
> "Describe your room — e.g. *10 round tables of 8, a head table for 6, two long tables of 12 by the window*"

AI returns a list of `{name, shape, capacity}` rows shown as chips you can tweak/remove before creating. The existing manual + bulk dialogs stay accessible under "Manual setup".

### 4. Slimmer Guest form

The "Add guest" dialog currently shows 8 fields. Reduce to:
- **Name** (only required field visible)
- **+ Add details** disclosure → party, side, RSVP, meal, kid, accessibility, notes

Same data model, less visual noise.

## Technical details

- **Edge function `ai-parse`** with three modes: `guests`, `tables`, `mapping`. Calls Lovable AI Gateway (`google/gemini-3-flash-preview`) using **tool-calling for structured output** (per AI Gateway guidance). Handles 429/402 with toast messages.
- Schemas:
  - `guests`: `{ guests: [{ name, party?, side?, rsvp?, meal?, is_kid?, accessibility?, notes? }] }`
  - `tables`: `{ tables: [{ name, shape: "round|rectangle|square|long|head", capacity }] }`
  - `mapping`: `{ mapping: { [header]: field|null }, rsvp_synonyms?: {attending:[], declined:[], maybe:[]} }`
- New components:
  - `SmartGuestInput.tsx` — textarea + preview table + Add all
  - `SmartTableInput.tsx` — textarea + chips + Create
  - `GuestPreviewTable.tsx` (shared by smart-add + import)
- Edits:
  - `GuestsTab.tsx`: add Smart Add as primary CTA; collapse advanced fields in `GuestEditor`
  - `TablesTab.tsx`: add Smart Setup as primary CTA
  - `GetStarted.tsx`: replace 3 cards with one big "Describe your guests / Describe your tables" pair, keep import + manual as secondary links
  - Spreadsheet import: call `ai-parse` mode `mapping` after parsing the file; skip manual dialog when confident, still allow override
- No DB schema changes.
- Keep all current dialogs/buttons reachable so power users aren't blocked.

## Out of scope (call out for follow-up)

- AI-explained seating suggestions ("seated Aunt May at T3 because…") — separate pass on auto-assign.
- Voice input.
