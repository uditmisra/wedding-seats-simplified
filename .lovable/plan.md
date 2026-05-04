# Premium polish pass — Airbnb-inspired warm minimal

Refine the whole app with a quieter, more confident look: dialed-down warm palette, tighter typography, more breathing room, and visuals carrying meaning that copy used to. Nothing rebuilt — just restraint applied across every surface.

## Direction in one line

Keep the aubergine-and-ivory soul, but turn the volume down. Let whitespace, type, and a single accent do the talking.

## 1. Design system foundation (`index.css`, `tailwind.config.ts`)

Tone the palette without changing identity:
- Background shifts from warm ivory → near-white ivory (lighter, calmer canvas).
- Borders & muted surfaces: lower saturation, tighter contrast steps so panels recede.
- Primary stays aubergine, but the rose `--primary-glow` moves from headline gradient to accent-only.
- Soften `--shadow-soft` / `--shadow-elegant` (smaller blur, lower opacity) — premium = quieter shadows.
- Replace `--gradient-soft` page background with flat ivory + a single subtle radial wash on landing only.

Type & spacing tokens:
- Body type `Inter` with `cv11`, display stays `Fraunces`.
- Add a small set of semantic tokens: `--surface`, `--surface-hover`, `--text-soft`, `--hairline` for consistent recessive UI.
- Tighten container max width on planner to `1280px` and standardize section gap to `gap-8` desktop / `gap-5` mobile.

## 2. Landing page (`Index.tsx`)

Currently busy: two cards stacked, helper paragraphs, feature row.
- Hero collapses to a single editorial column on mobile, asymmetric two-column at `md+` with **one** primary CTA card.
- Replace the three-icon "feature row" with a quiet visual: a stylized seating chart vignette (SVG, monochrome) — "show, don't tell".
- Recents move from full card to a soft horizontal list under the CTA, with a thin avatar-dot for each plan.
- Trim helper sentences ("A private link, just for the two of you…") — keep one tagline only.
- Typographic ratio: H1 6xl → 7xl on `xl`, tighter leading, italic accent stays.

## 3. Planner header / shell (`Planner.tsx`)

- Header height drops to 56px, hairline border (1px at low opacity), no backdrop blur color shift.
- Plan name editable on click stays — but use a faint pencil glyph on hover instead of underline.
- Right-side actions become an icon-first cluster: `Save & share`, `Export`, then primary "Seat them for me" as the only filled button. Tooltips replace inline labels at `<lg`.
- "Seat them for me" copy becomes "Auto-seat" — shorter, less precious.
- Add a thin status chip slot in the header (collapses to a dot on mobile) — the only place conflicts surface globally.

## 4. Stats + tabs (`StatsBar.tsx`, layout/main tabs)

- StatsBar: remove the rounded card chrome, become a single full-width bar with: big seated count (display font), thin progress rule, right-aligned conflict chip. No background. Adds calm.
- Layout tabs: lose the "shadow-inset on active" trick — replace with a 2px primary underline only. Inactive tabs lose their background entirely.
- Main tabs (Seating/Guests/Tables): same treatment — underline tabs, no pill background, count badges become small dot+number.
- "More" menu loses its rounded-button container — becomes a text link "More options".

## 5. Seating view (`SeatingView.tsx`, `FloorPlan.tsx`)

- View toggle moves into the top-right of the workspace as a segmented icon control (no labels — list & grid icons only, with tooltip).
- Unassigned panel: drop the all-caps "UNASSIGNED" label, replace with display-font "Guests to seat" + count, hairline divider underneath. Search becomes borderless with an icon prefix.
- Guest pills: lose the colored border on hover, use background-tint instead. Meal chip becomes a colored dot (mapped to meal type) — visual key shown once at the top of the panel.
- Table cards (list mode): cleaner — name as display font, capacity as a tiny circular fill indicator (e.g. `7/8` becomes a 7/8 dot ring) instead of "7/8 · round".
- FloorPlan: legend pill becomes an unobtrusive bottom-left key; remove parquet pattern (visual noise) — replace with a single radial center wash.

## 6. Room editor (`RoomEditor.tsx`)

- Toolbar reorganizes: left = title + overlap status (icon-first), right = Snap / Grid / Add. Toggles become icon-only with tooltips.
- Inspector sidebar gets sectioned with hairline dividers and tighter labels (`Name`, `Seats`, `Shape` lose the colon-style heaviness).
- Position/rotation inputs grouped in a compact 3-up row with a subtle "px / °" suffix instead of separate labels.
- Replace "Drag to move · hold Shift…" instructional copy with a small `?` icon → tooltip.
- Overlap warning pill shrinks to a red dot + count; full label only on hover.

## 7. Compare view (`CompareScenarios.tsx`)

- Header row simplifies to two layout name pills with a swap arrow between (Airbnb-style).
- Diff rows: remove "Identical" rows entirely (collapse under a "N matching tables" footer expander). Show only what changed.
- Action arrows become circular icon buttons with no text — tooltips explain direction.
- Color-only legend (small dots), no label noise.

## 8. Dialogs & onboarding

- All dialogs: increase outer padding (`p-7`), reduce visual chrome (no second border), titles in display font with one short subtitle max.
- Onboarding flow: trim step copy by ~40%, lean on iconography for each step; finish CTA becomes the only filled button per screen.
- Auto-assign / Smart input dialogs: remove the redundant explanatory paragraphs above inputs; promote the input itself to be the visual hero.

## 9. Micro-interactions & motion

- Standardize transitions to 150–200ms ease-out across hover / active states.
- Add a single subtle entry transition on tab content (8px translate + fade).
- Buttons: remove gradient shimmer, rely on flat fill + soft shadow on primary only.

## 10. Responsive breakpoints

- Audit all `lg:grid-cols-[280px_1fr]` etc. — many panels currently break at the same `lg`, making mid-widths cramped. Introduce intermediate `md` layouts:
  - Seating view: side panel goes inline above grid at `<lg`, but compresses to a horizontal scrollable strip at `md`.
  - Compare view: stacks at `<xl` (currently `<lg`), making side-by-side genuinely usable.
  - Room editor inspector: drawer on `<lg` instead of squeezed sidebar.
- Header collapses non-primary actions into an overflow menu at `<md`.
- Standard breakpoints used: `sm 640`, `md 768`, `lg 1024`, `xl 1280`. Add a `2xl: 1400` content cap.

## Out of scope

- No new features, no schema changes, no library swaps.
- Keep all existing copy that conveys *unique* meaning (RSVP states, conflict explanations).
- Animations stay subtle; no hero illustrations beyond the landing vignette.

## Technical notes

- All color changes flow through `index.css` HSL tokens; no component-level hex values.
- New semantic tokens added to both `:root` and `tailwind.config.ts` extend.
- Class refactors prefer composability (replace one-off shadow strings with a `shadow-elegant` token utility).
- Components touched (no new files, no deletions):
  `index.css`, `tailwind.config.ts`,
  `pages/Index.tsx`, `pages/Planner.tsx`,
  `components/planner/StatsBar.tsx`, `LayoutTabs.tsx`, `SeatingView.tsx`, `FloorPlan.tsx`, `RoomEditor.tsx`, `CompareScenarios.tsx`, `OnboardingFlow.tsx`, `AutoAssignDialog.tsx`, `ExportPanel.tsx`, `GuestsTab.tsx`, `TablesTab.tsx`.
- Verify after: landing at 375 / 768 / 1280, planner workspace at 768 / 1024 / 1440, room editor at 1024 / 1440.
