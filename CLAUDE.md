# Wedding Seater — CLAUDE.md

This file is the working PRD for ongoing Claude sessions. It captures product
context, the full design surface inventory, per-surface specs, and the gap
between what's shipped and what needs to be built. Use this as the single
source of truth before touching any surface.

---

## Product

**Wedding Seater** is a wedding seating planner. Couples drag guests onto tables,
resolve who can't sit near whom, and share a link with whoever's helping.

**Audience**: stressed-out couples actively planning a wedding. Copy needs to
be specific, recognise their pain (divorced parents, the cousins who don't
speak), promise time-relief, and stay editorial without becoming twee.

**Stack**: Vite + React 18 + TypeScript + Tailwind + shadcn/ui + Supabase
(Postgres + RLS + Auth). PDF via `jspdf` and `html2canvas`. Drag-and-drop via
`@dnd-kit/core`. Vaul for mobile drawers.

**Routes**: `/` (landing), `/auth`, `/reset-password`, `/dashboard` (planned),
`/plan/:code`.

**Auth model**: signed-in plan owners (`plan_owners` table, supports
collaborators). Anonymous viewing via shareable URL. Owner gates editing on
the Planner. RLS preserves the link-shareable promise.

---

## Visual identity — "Atelier"

Cream paper, deep ink, terracotta accent, olive secondary. Newsreader (display)
+ Inter Tight (body) + Geist Mono (labels/numbers). Tokens in
[src/index.css](src/index.css) and [tailwind.config.ts](tailwind.config.ts).

Key utilities:
- `font-display` (Newsreader 400) and `font-display-italic`.
- `label-mono` (Geist Mono, uppercase, letter-spacing `0.14em`, color `ink-3`,
  font-size `10.5px`). The design's `.label` is technically `11px` /
  `0.12em` — minor delta we accept.
- `paper-grain`, `paper-grain-strong` background utilities.
- Color names: `paper`, `paper-2`, `paper-3`, `ink`, `ink-2`, `ink-3`,
  `ink-4`, `olive`, `olive-2`, `terracotta`, `terracotta-2`, `rose`, `butter`,
  `hairline`, `hairline-2`.

The design canvas is laid out at **1280px** width per artboard. The app is
responsive — at the `lg:` breakpoint we should match the design 1:1; at
smaller breakpoints we adapt gracefully.

---

## Surface inventory

Last audited: 2026-05-07. ✅ = pixel-faithful shipped. ⚠ = minor gaps remain. ❌ = missing.

| Surface | Design source | Implementation status | Remaining work |
|---|---|---|---|
| Landing | `landing.jsx#LandingA` | ⚠ | Hero grid ratio, plan card bg-white/40, h2 font-size |
| Sign in | `auth.jsx#AuthSignInA` | ⚠ | Minor card sizing; editorial column hidden on mobile ✓ |
| Link sent | `auth.jsx#AuthLinkSentA` | ✅ | `LinkSentPage` in Auth.tsx — full-page two-column |
| Claim plan | `auth.jsx#AuthClaimPlanA` | ✅ | `ClaimPlanModal.tsx` — centered modal, wired in Planner |
| Dashboard | `auth.jsx#AuthDashboardA` | ✅ | `/dashboard` route, UserMenu link, plan grid |
| In-app nudge | `auth.jsx#AuthNudgeA` | ✅ | Top-of-content banner, terracotta left border, dismissible |
| Reset password | (not designed) | ✅ | Atelier-styled standalone |
| Planner shell | `planner.jsx#PlannerGuestsA` | ✅ | Header has plan avatar, saved indicator, tab strip |
| Tab strip | `planner.jsx#PlannerGuestsA` | ✅ | Active weight, bg, progress bar all present |
| Onboarding | `onboarding.jsx#OnboardingA` | ✅ | Full-page two-column with SamplePreviewCard |
| Empty state (Seating) | `atelier-extra.jsx#EmptyStateA` | ✅ | Copy matches design, ghost tables, correct CTAs |
| Floor plan | `canvas.jsx#SeatingCanvasA` | ✅ | Room outline, fixtures, compass, annotation, legend |
| Grouped clusters | `canvas-v2.jsx#SeatingCanvasA2` | ✅ | `GroupedClusters.tsx` wired into SeatingView toggle |
| Guests tab | `planner.jsx#PlannerGuestsA` | ✅ | Mobile card layout, "The guest list" heading, columns |
| Tables tab | `atelier-extra.jsx#TablesA` | ✅ | — |
| Constraints | `atelier-extra.jsx#ConstraintsA` | ✅ | Delete always visible on mobile |
| Compare | `atelier-extra.jsx#CompareA` | ✅ | — |
| Room editor | `atelier-extra.jsx#RoomEditorA` | ✅ | Three-column layout, ToolPalette, PropertiesPanel, table drag |
| Export workspace | `exports.jsx#ExportWorkspaceA` | ✅ | Two-column, format/paper/options picker, dark proof stage |
| Floor plan PDF | `exports.jsx#FloorPlanPDF` | ✅ | `FloorPlanPDF.tsx` — 305 lines |
| Alphabetical index PDF | `exports.jsx#AlphabeticalIndex` | ✅ | `AlphabeticalIndex.tsx` — 232 lines |
| Per-table card PDF | `exports.jsx#PerTableCard` | ✅ | `PerTableCard.tsx` — 225 lines, adaptive density |
| Place card PDF | `exports.jsx#PlaceCard` | ✅ | `PlaceCard.tsx` — 178 lines, fold geometry |
| Mobile canvas | `mobile.jsx#MobileCanvasA` | ✅ | Vaul drawer, pinch zoom, FAB with safe-area offset |
| Mobile guests | `mobile.jsx#MobileGuestsA` | ✅ | Card-row layout, filters drawer |
| Mobile dialog | `mobile.jsx#MobileDialogA` | ✅ | Constraints stacked grid, always-visible delete |
| Mobile onboarding | `mobile.jsx#MobileOnboardingA` | ✅ | Responsive stacking |
| Mobile tables | `mobile.jsx#MobileTablesA` | ✅ | Responsive |
| Mobile sign in | `mobile.jsx#AuthMobileA` | ✅ | Editorial column hidden on mobile, bottom tab nav |
| Style cards | `style-cards.jsx#StyleCardA` | ✅ | Tokens fully implemented (no runtime surface) |

---

## Per-surface specs

### Landing — `LandingA` (1280×1700)

- **Nav** (28×56px padding inline): Wedding Seater wordmark display 22 + 5×5
  terracotta dot (translateY -2). Right cluster: ghost text links + ghost
  "Open a plan" pill (8×16 padding, 13px) + UserMenu.
- **Hero** (40px top padding, grid `1.1fr 1fr` with 64px gap):
  - Left: `.label` "— A wedding seating planner" (mb 28). h1 Newsreader 92,
    line-height 0.98, letter-spacing -0.03em ("Your seating chart, *without*
    the spreadsheet."). Body 19/1.55 ink-2 max-width 480 (margin top 32,
    margin bottom 40). CTA cluster: pill ink button "Start your seating
    chart →" (15px, padding 15×26) + ghost "See an example" + mono dot ·
    "Free. Save it once — pick it up on your phone in bed.".
  - Right: rotated paper vignette (`-1.2deg`), paper-grain-strong, 540px
    height, room outline, ~7 PaperTable instances, dance floor stripes,
    italic terracotta annotation. Caption tag at `bottom: -10`.
- **Promise section** (mt 140, padding 0×56): hairline-t border, three columns
  (`gap: 56`). Per item: mono 11/0.12em terracotta `01` (mb 18), Newsreader
  28 / 1.15 title (mb 12), 15/1.6 ink-2 body.
- **Recently opened** (mt 110, padding 0×56): h2 Newsreader 36 ("Recently
  *opened*") + label "n plans on this device". Three-column card grid (gap
  24): hairline border radius `r-lg`, padding 22, `rgba(255,255,255,0.4)`
  background. Per card: label (mb 14) for code, Newsreader 22 / 1.1 title
  (mb 6), 13 ink-3 date (mb 22), bottom row with 13 guest count + 90×4
  paper-3 progress bar with olive fill.

### Sign in — `AuthSignInA` (1280×820)

- Two-column grid `1fr 1fr`. Left padding `60×64`, right padding `60×64`.
- **Left**: `.label` 11/0.12em terracotta "Welcome back" (or "Sign in"), h1
  Newsreader 64 / -0.025em "Save your plans to *your* corner.", body 17/1.55
  ink-2 (max-width 480), 3 bullets (each: 1.5px terracotta dot + Inter Tight
  14 ink-2).
- **Right (sign-in card)**: `paper` background, ink border 1px, padding 40,
  border-radius 18, shadow-elegant. h2 Newsreader 34 "Sign in", body 13
  ink-3. Google button `.btn .btn-ghost`, padding 14×16, border-radius 10,
  background paper, "Continue with Google" + Google glyph. Divider with
  mono 10 / 0.15em "or". Tabs row "Sign in" / "Create account" — pill
  segmented control (paper-2 bg, paper on active, shadow-soft on active).
  Form: Field components — label uppercase mono 10/0.14em ink-3, input
  underline-only 1px ink, height 44, padding 12×14, italic placeholder.
  Password hint mono 11 ink-3. Primary submit "Sign in →" (rounded full).

### Link sent — `AuthLinkSentA` (1280×820)

- **Same two-column grid**. Left column unchanged.
- **Right column** swaps to envelope illustration on `paper-2` bg with
  pulsing terracotta dot (animation `pulse 1.6s ease-in-out infinite`).
  Headline Newsreader 34 "Check your *inbox.*", body "We sent a link to
  alex@example.com" (with explicit email), "Use a different email" ghost
  link.

### Claim plan modal — `AuthClaimPlanA`

- Centered modal, **560px wide**, padding `40×44`, paper bg, 1px ink border,
  shadow-elegant, border-radius 18. Backdrop blur.
- Top: `.label` "Claim plan" + `Newsreader 32` "Make this plan *yours.*".
- Plan summary mini-card: hairline border, padding 14×18, paper-2 bg.
  Newsreader 17 plan name, mono 10 plan code, mono 11 "Created today by
  guest".
- Body: 14/1.55 ink-2 explanation paragraph.
- Action row: ghost "Not now" (left) + primary "Claim it" (right).
- Footnote mono 11 ink-4: "Anyone with the link can still view the plan."

### Dashboard — `AuthDashboardA` (1280×820)

- Top nav (28×56): Wedding Seater wordmark + UserMenu avatar.
- Hero (40×56 padding): h1 Newsreader 56 "Your *plans.*" + 17 ink-2 body
  ("Pick up where you left off, or start something new.").
- Plan grid (gap 24, 3 columns): same `<PlanCard>` pattern as the landing's
  recents grid.
- "Start a new plan" affordance: dashed-border 12-radius card matching grid,
  mono 10 label "Start fresh →", Newsreader 22 "New plan".

### In-app nudge — `AuthNudgeA`

- Non-blocking banner at top of planner content area (below header).
- 1px hairline border + **3px terracotta left border** + paper bg, padding
  16×20, border-radius 12.
- Sparkle icon (terracotta) + body "Like what you're building? Save it to
  your account." + dismissable X.
- Actions: ghost "Not now" + primary "Sign in".

### Planner shell + tabs — `PlannerGuestsA` (1280×820)

- **Header** padding 18×32: left cluster — Wedding Seater display 18 + 4×4
  terracotta dot, 1px×20 hairline divider, plan name display 17 / 1 +
  mono 10 ink-3 "14.09.2026 · PLM-2840". Right cluster — mono 11 ink-3
  "Saved · just now", ghost "Share link ↗" pill (7×14 padding, 12px), 28×28
  olive avatar with white initials at 11 weight 500. Bottom hairline border.
- **Tab row** (padding 0×32, hairline-b, `rgba(255,255,255,0.3)` bg):
  - 6 tabs in a row with 28px gap. Per tab: padding 16 vertical, display-italic
    13 numeral (terracotta on active, ink-3 inactive), 14px label (ink on
    active, ink-2 inactive, weight 500 active).
  - Active tab: 1px ink border-bottom (negative margin to absorb the row's
    hairline-b).
  - Right side of tab row: mono 10 ink-3 "117 / 142 SEATED" + 90×3 paper-3
    progress bar with olive fill (rounded full).
- **Tab order**: I Guests · II Tables · III Seating · IV Constraints · V Room
  · VI Compare. (Implementation has VII Export from a separate dropdown — the
  design's tab strip ends at VI; Export is launched from a header action.)

### Guests tab body — `PlannerGuestsA`

- Three-column grid `260px / 1fr / 280px`.
- **Left filters** (border-r hairline, padding 24×24, gap 24):
  - "RSVP" `.label` (mb 12) → list of `{Coming 117 olive, Maybe 12 butter,
    Not coming 8 ink-4, No reply 5 rose}`. Per row: 8×8 colored dot + 13 ink-2
    label + mono 11 ink-3 count, justify-between.
  - "PARTY" `.label` (mb 12) → list of party labels (13 ink-2, padding 4×0).
  - "DIETARY" `.label` (mb 12) → flex-wrap row of pills (4×9 padding, 999
    radius, mono 11, hairline border).
- **Center list** (padding 20×24, gap 14, overflow hidden):
  - Top row: h2 Newsreader 28 "The *guest list*" + right cluster (search pill
    180px wide + ink primary "+ Add guests" pill).
  - Header row (`.label` style): NAME / PARTY / RSVP / DIET / TABLE — grid
    columns `1.2fr 1.4fr 90px 60px 70px`, padding 8×12, hairline-b 1px.
  - Row: same grid columns, padding 14×12, fontSize 14, hairline-b
    `--hairline-2`. Selected row: `rgba(182,90,54,0.05)` (terracotta 5%) bg.
  - Per-row first cell: 26×26 colored avatar (cycle olive/terracotta/sage/
    rose/butter) with mono 10 weight 500 white initials + name.
  - RSVP cell: pill 11 mono, padding 3×9, conditional bg/fg per state
    (olive `rgba(74,82,50,0.12)/olive`, butter `rgba(232,210,146,0.4)/ink-2`,
    ink-4 ink/05 / ink-3, rose ink-3).
- **Right detail** (border-l hairline, padding 24, `rgba(255,255,255,0.3)` bg):
  `.label` "SELECTED · 1 GUEST" (mb 18), Newsreader 26 / 1.1 name, 13 ink-3
  party (mb 24). Key/value rows (gap 14, 13fs): each row "RSVP / +1 / Dietary
  / Table / Notes" with key 12 ink-3 + value (13, terracotta + mono if accent).
  Then border-t hairline + `.label` "CONSTRAINTS" (mb 12) + chip rows: hairline
  border, padding 10, radius 8, fontSize 12, dot + "must sit with **Maya**"
  / "keep apart from **Felix L.**".

### Tables tab — `TablesA`

- **View toggle** (top right): pill segmented "Arrange room / Quick setup".
  Implementation choice; design only shows the "Quick setup" view content.
- **Totals strip** (4 columns): mono labels (`TABLES n / SEATS n / SEATED n /
  OPEN n`), display 24 numbers tabular-nums.
- **Main grid** (1fr left + 320px right rail):
  - Left: h2 Newsreader 28 "Set the *room.*" + actions (Bulk add ghost, +
    Add table primary). Below — 3-col card grid with `<TableCard>`s.
  - Per card: 180px min-height, hairline border, paper bg, padding 16. Top
    row: name display 20 + mini `<PaperTable>` 56px right-aligned with capacity
    accent (terracotta if over, olive if full, terracotta default). Bottom
    row: mono 11 capacity ratio + capacity bar (paper-3 with olive fill,
    terracotta if over). Edit/delete icons opacity 0 → group-hover.
- **Right rail**: paper-2/40 bg, 5 padding, "Smart bulk add" `<SmartTableInput>`.

### Constraints panel — `ConstraintsA`

- Two columns: 1fr main + 320px right rail.
- **Main**: h2 "The *non-negotiables.*" + body "Tell Wedding Seater who must sit
  together..." + two sections.
- Section: hairline border, paper bg, header row with colored dot + display
  20 "Must sit / Keep" + italic emphasis. "+ Add rule" ghost pill (right).
- Constraint row: avatar + name + italic colored connector ("with" /
  "not near", olive/terracotta) + avatar + name + trash on hover.
- **Right rail**: paper-2/40 bg. `.label` "Auto-assign" + Newsreader-italic
  body explaining + 14×4 olive/paper-3 toggle for keep-pinned + primary
  button "Run auto-assign". Border-t + `.label` "Last run" + italic body
  showing seated/total + conflicts (with terracotta if any).

### Compare scenarios — `CompareA`

- h2 Newsreader 28 "A/B *scenarios.*" + body.
- Two-column grid (lg+) of `<ScenarioPanel>`s. Each panel: top row with
  LIVE/DRAFT badge (mono 10/0.12em, olive bg for LIVE, paper-2 bg for DRAFT)
  + display-italic 18 scenario name + metrics row (`Tables n / Seated n /
  Conflicts n` if present, terracotta for conflicts). Below — `<FloorPlan>`
  thumbnail with diff highlights.
- Below the two panels: editorial diff strip — paper-2/40 rounded card with
  "What changed" label + chips (`+n added` olive, `n changed` terracotta,
  `-n removed` ink-4 dashed) + italic 16 ink-2 observation.
- Below diff strip: "Table-by-table diff" expander with per-table copy/promote
  rows.

### Room editor — `RoomEditorA` (1280×820)

- Three-column layout: 230px tools | 1fr canvas | 280px props.
- **Left tool palette** (border-r hairline, padding 20):
  - `.label` "Draw" (mb 14).
  - 8 tool buttons stacked (gap 6). Per tool: padding 9, border-radius 8,
    flex with 10 gap. Cells: 22×22 icon (Newsreader 15 ink), 13fs name, mono
    10/uppercase ink-3 shortcut right-aligned. Active tool: paper bg + 1px
    hairline border. Tools:
    - Wall ╱ W (default active)
    - Door ◳ D
    - Window ◇ I
    - Stage ▭ S
    - Dance floor ▣ F
    - DJ booth ◉ J
    - Bar 🍷 B
    - Text label T L
  - Below tools (mt 24): `.label` "Snap" (mb 12). 4 toggle rows: "Grid (50cm)
    on", "Edges on", "90° angles on", "Other walls off". Toggle: 26×14 pill
    with 10×10 white dot, olive on / paper-3 off.
- **Canvas** (1fr, paper-grain bg, position relative, overflow hidden):
  - SVG grid pattern: 20×20 circle dots, ink-3 opacity 0.35.
  - Walls: closed paths, fill `rgba(255,255,255,0.4)`, stroke ink, 2px
    stroke-width.
  - Doors: rect with white fill, 80×16, label "ENTRY" mono 9 centered.
  - Side exit: dashed line 3,3 dash, rotated text label "SIDE EXIT".
  - Fixtures with dashed outlines + italic Newsreader labels (terracotta
    for accents).
  - In-progress wall: terracotta dashed line + circle endpoints + dimension
    label "3.0 m" (mono 10 terracotta).
  - Dimension lines: 0.5 ink-3 stroke, tick marks, mono 10 dim labels.
  - Status bar (bottom-left, paper-2/90 bg, 6×14 padding, 999 radius):
    mono 11 "x: 280 / y: 240" + " · " + terracotta dot + "drawing wall" +
    ink-3 "press ESC to cancel".
  - Zoom controls (bottom-right): paper-2/90 bg, gap 4, padding 4×6, 999
    radius. ─ button (26×26 circular) + mono 11 "1:50" (38px min-width) +
    + button.
- **Right properties panel** (border-l hairline, padding 20,
  `rgba(255,255,255,0.3)` bg):
  - `.label` "Wall · selected" (mb 14).
  - h2 Newsreader 22 / 1.05 "North wall *in progress*" (terracotta italic).
  - Property rows (gap 14, 13fs): key 12 ink-3, value 13 ink, padding-bottom
    10, border-bottom hairline-2. Properties: Length 3.0 m, Thickness 20 cm,
    Material Drywall, Snap Grid (50cm) (muted).
  - Border-t + `.label` "Needs" (mt 24, mb 10). Italic Newsreader checklist
    (12 line-height 1.7): · DJ within 6m of dance floor ✓ (olive), · Bar
    near entry ✓ (olive), · Two exits ? (terracotta).
  - Primary button "Done · save room →" full-width (mt 24).

### Floor plan canvas — `SeatingCanvasA` (1280×820)

- Two-column grid: 270px left rail + 1fr canvas.
- **Left rail**: "Still to seat" card (paper-2/40 bg, hairline border, 16
  padding). Display 36 count + body. Search input + guest pills (drag
  sources).
- **Canvas** (paper-grain bg):
  - SVG room outline (rough hand-drawn feel, 1.2px stroke ink, opacity 0.6).
    Bounds: `(60, 50, 890, 580)`.
  - Dance floor: dashed terracotta rect (3,3) `(820, 360, 120, 220)`, italic
    Newsreader 13 caption "*dance floor*" terracotta.
  - DJ booth: filled rect `(870, 80, 70, 40)`, mono 9 "DJ" caption.
  - Bar: rect `(180, 410, 100, 22)` paper-2 bg + ink stroke + italic
    Newsreader 12 "*bar*" caption.
  - Entry door: rect `(120, 42, 100, 16)` paper bg + ink stroke + mono 9
    "ENTRY" caption.
  - Hand-written annotation: italic Newsreader 14 ink-3, rotated `-2deg`,
    max-width 130, copy "*let's keep the college tables close to the bar*".
    Position: top-right area, with a small terracotta arrow path pointing
    toward the College table.
  - Tables: render via `<PaperTable>` components, sized by `tableGeom`,
    with seat dots filled when occupied. Italic Newsreader 11 caption below
    each.
  - **Compass** at top-right: 16r ring + arrow path + mono 9 "N" label.
- **Bottom controls**:
  - Bottom-right zoom + view: paper/90 bg, hairline border, 1×1 padding, 999
    radius. ─ button + mono 11 zoom % + + button + 1×4 hairline divider +
    fit/reset buttons.
  - Bottom-left legend: paper/85 bg, 999 radius, hairline border, padding
    1.5×3, gap 3. Mono 10/0.12em ink-3 row: ● seated (olive) / ● empty
    (ink-4) / ● conflict (rose). (Implementation should also show "open" if
    that state matters in the seating UX.)

### Grouped clusters — `SeatingCanvasA2` (1280×820)

- Two-column grid: 270px left rail + 1fr canvas.
- **Left rail**: "By group" with progress bars per party/group (e.g. Family
  · Bride: 24/24, College: 16/18). Per-group color matches the cluster.
- **Canvas**: paper-grain bg with cluster cards laid out:
  - Each cluster: 220×160px, rounded 14, dashed border (1.5px) in the
    group's color, label top-left (color-matched, mono 10/0.16em), body
    inside shows tables that hold guests from that party.
  - Tables inside cluster: smaller `<PaperTableMini>` (size 70).
- **Top-right view toggle**: pill segmented "Plan / Grouped (active) / List".
- **Below canvas**: suggestions panel — paper-2/60 bg, italic Newsreader
  "*Try this: move College table next to Friends — fewer cross-party
  conflicts.*" + Apply (primary) / Dismiss (ghost).

### Onboarding — `OnboardingA` (1280×820)

- Two-column grid `1fr 1fr`. Left padding `70×64`, right padding `70×64`.
- **Left column** (form):
  - Top: "STEP 0n — OF 03" `.label` 11/0.12em ink-3 (mb 28).
  - h2 Newsreader 56 / 1.02 with italic emphasis word.
  - 24 ink-2 / 16 body line introducing the step.
  - Form (gap 20):
    - Field component: label uppercase mono 10/0.14em ink-3 + input/value
      22 display Newsreader, underline-only `1px solid var(--ink)` (no full
      border), padding 12×0, italic placeholder for empty state. Optional
      hint mono 10 ink-3 below.
    - Pill button row (e.g. "Expected guests" — 50 / 100 / 142 / 200 / 250 / Other).
      Each pill 14fs, padding 8×16, 999 radius, paper-2 bg inactive, ink bg
      active, paper text active.
  - Footer (mt 56, justify-between):
    - "← Back" ghost (13fs ink-3) on left.
    - Centered: 8×8 progress dots (filled ink for active, paper-3 inactive,
      hairline 1px).
    - "Continue →" primary on right.
  - Below footer: 4×24 horizontal step bars (one per step, 22×2px) — filled
    ink for current+past, paper-3 future. (NOTE: this conflicts with the
    pill rail we ship today — the step bars *replace* it.)
- **Right column** (illustrative card):
  - Tilted (`-1.5deg`), rounded 16, hairline border, paper-2/40 bg, padding
    32. Shadow-elegant.
  - Inside: small Newsreader masthead "Maya & Jordan" (italic `&`) + mono 10
    "14 SEPTEMBER 2026" + 2×2 grid of `<PaperTable>` (4 tables, varying seat
    counts and partial occupancy) seeded as a sample seating chart.
- Step copy:
  - Step 1 "Who's *coming?*" — Field for couple name + Field for paste
    guests + import button.
  - Step 2 "Set up your *room.*" — Field for parser + Field for theme.
  - Step 3 "*Ready.*" — two CTA cards (Do a first pass for me / I'll do it
    myself).

### Empty state (Seating canvas) — `EmptyStateA` (1280×820)

- Paper-grain bg with an SVG dashed rectangle outlining the would-be room.
- 14 ghost circles in a grid (use `<PaperTable ghost>`), opacity 0.18.
- Center prompt:
  - `.label` 18/0.32em terracotta "BLANK PLAN · LET'S BEGIN".
  - h2 Newsreader 56 / 1, "An empty room, ready for *everyone.*" (italic on
    `everyone`).
  - 16/1.55 ink-2 body: "Start by adding guests — paste from a spreadsheet,
    type a few names, or drop a list and we'll figure it out."
  - Two CTAs: primary "+ Add guests" + ghost "Use a sample plan" (wires to
    `loadOrCreateSamplePlan`).
  - Bottom whisper (Newsreader italic 14 ink-3, absolute bottom 28):
    "*There's no wrong way to start. Most couples begin with parents.*"

### Mobile bespoke

Each mobile artboard is **376×756** (the design's mobile width).

- **Mobile canvas**: phone-frame layout. Header row (back chevron, title +
  count, ⋯ menu). Canvas takes full content area; partial guests are
  layered behind a bottom-sheet drawer. Drawer header has rounded-top 20
  + drag handle + "Still to seat · n" + close. Drawer content: search +
  draggable guest pills.
- **Mobile guests**: stacked layout. Top: title + add. Filter chips. List
  rows (single-column grid, 14px tap target). Tapping a row opens a Vaul
  drawer with the SelectedGuestPanel content.
- **Mobile dialog (constraint add)**: full-width Vaul drawer with the
  Combobox + Combobox + radio toggle + save action.
- **Mobile onboarding**: progress bar at top (full-width 4px hairline with
  filled segments), single-column layout, step content stacks; CTAs stack.
- **Mobile tables**: card list rather than grid, single column. Each card
  has the same `<TableCard>` content with smaller `<PaperTable>` preview.
- **Mobile sign in**: stacked, full-width card, all auth elements visible
  without scrolling on a 6.5" device.
- **Mobile tab bar** (across all planner surfaces at <sm): fixed bottom,
  paper bg, hairline-t border, 6 tabs (chapter numerals + label, italic
  terracotta numerals on active). Replaces the desktop top tab strip on
  mobile.

### Style cards — `StyleCardA`

Reference card. Tokens, scales, primitives. Not a runtime surface — already
implemented as Tailwind utilities. Documented here for traceability:
- 8 swatches: paper, ink, olive, terracotta, rose, sage, butter, hairline.
- Display: Newsreader weights 300 / 400 / 400 italic / 500.
- Text: Inter Tight weights 300 / 400 / 500 / 600.
- Mono: Geist Mono 400 / 500.

---

## Exports v2 (full spec)

The export bundle is the largest single piece of new design — see the
detailed spec below. Pixel-perfect React components serve as both the
on-screen workspace previews **and** the source of truth for PDF rendering
via `html2canvas → jsPDF.addImage`.

### The four print-ready artifacts

Every artifact uses **Newsreader on cream paper**, with cut marks and bleeds
where they apply. All artifacts render on a **4 px baseline grid** for
consistent vertical rhythm.

#### 1. Floor plan (A2 landscape · `1100 × 780` px)

The hero export — wall chart for the venue.

- Printer's frame: 1px ink border at `inset 28`, 0.5px ink-3 inner border at `inset 36`.
- **Masthead** (top center, ~`top: 64`): `SEATING CHART` label (terracotta,
  letter-spacing `0.32em`, fontSize 11) → couple display name (Newsreader 64,
  italic `&` in terracotta) → date in mono 10 / 0.32em.
  **No venue line** (per user decision).
- **Room canvas**: `900 × 430` rect at `(100, 210)` filled with a 14×14 dot
  pattern (`circle r=0.6` at opacity 0.22).
- **Fixtures**: dance floor (dashed terracotta box, italic Newsreader 12
  caption, fill `rgba(182,90,54,0.05)`), bar (paper-2 box, italic 12
  caption), entry (paper box, mono "ENTRY" 8px).
- **Tables**: each renders as a circle at `r = geom.radius * 0.62` filled
  paper with 0.9 ink stroke; seats dots arrayed at `r = geom.radius * 0.85`,
  filled ink when occupied, paper when empty, 0.6 ink stroke. Italic
  Newsreader numeral `geom.numFs` inside the circle. Newsreader 11 name
  caption at `radius + 22` below.
- **Compass** at `(950, 250)` — a 16r ring with a north arrow.
- **Footer** (mono 9, ink-3, letter-spacing `0.2em`):
  `FIG · 01 — FLOOR PLAN — 1:50` / `92 GUESTS · 10 TABLES` / `WEDDING SEATER.APP / PLM-2840`.

#### 2. Alphabetical index (A4 portrait · `480 × 680` px)

- 0.5px ink border at `inset 24`.
- **Header**: terracotta `FIND YOUR NAME` label / 0.32em / 9px, Newsreader 32
  couple name (italic `&`), mono 8 / 0.28em date. 1px ink rule below.
- **Two columns** at `top: 188`, with 32px gap.
  - Column header: `NAME` / `TABLE` mono 7, ink-3, 0.25em letter-spacing,
    0.5px ink-2 underline (paddingBottom 8).
  - Each row 20px tall. Even-row separator: 0.4px dotted hairline.
  - Name in Newsreader 11, ink. Table number in italic Newsreader 13,
    terracotta, right-aligned, `min-width: 20`.
- **Footer**: mono 7, 0.25em letter-spacing: `WEDDING SEATER · {NAMES}` / `PG nn / mm` / `WEDDING SEATER.APP / {CODE}`.
- **Pagination**: when guests exceed the per-page capacity (~68), additional
  pages render the same component with `pageIndex` / `pageCount` props.
  Pages 2+ skip the masthead.

#### 3. Per-table card (A5 portrait · `380 × 540` px)

One per table. **Must scale 3 → 30 seats** without overlap.

- Header (top: 60–220 reserved):
  - `TABLE` label, terracotta, mono, 0.36em letter-spacing, **mb: 28**
    (this 28px breathing-room above the numeral was a specific user note).
  - **Numeral**: italic Newsreader **110px**, line-height 0.85, letter-spacing -0.02em.
  - **Table name**: Newsreader 16, ink-2, mt-16.
- **Divider** at `top: 296`: hairline + italic Newsreader 12 "seated here" + hairline.
- **Seat list region**: `top: 332 → bottom: 64` (148px tall). Adaptive:

  | seats   | cols | lineH | fontSize | layout      |
  |---------|------|-------|----------|-------------|
  | 1–6     | 1    | 22px  | 13       | centered    |
  | 7–12    | 1    | 18px  | 13       | centered    |
  | 13–18   | 2    | 17px  | 12       | right/left  |
  | 19–22   | 2    | 14px  | 10       | right/left  |
  | 23–24   | 3    | 14px  | 10       | center      |
  | 25–30   | 3    | 13px  | 10       | center      |

  Multi-column rows have a 0.4px dotted hairline divider between cols.

- **Footer**: mono 8, 0.32em letter-spacing, centered: `MAYA & JORDAN · 14 · 09 · 2026`.
- **Critical**: dates are **numeric `14 · 09 · 2026`**, never Roman numerals.

#### 4. Place card (folded tent · `600 × 200` px flat, 85×55 mm folded)

Printed flat, then folded along the horizontal centerline.

- 0.5px dashed ink-3 fold line at `top: H/2`. Mono "FOLD" tick at left edge.
- **Top half** (back face when folded): `transform: rotate(180deg)`.
  Inside: name in Newsreader 22 + 0.5×24 ink-3 vertical rule + (TABLE label
  terracotta + italic Newsreader 22 numeral).
- **Bottom half** (front face): upright. `· welcome ·` label (terracotta,
  mono 7 / 0.32em) → name in Newsreader 26 centered → 32×0.5 terracotta
  hairline → mono 7 "TABLE {n} · {MEAL}" / 0.3em letter-spacing.

### Export workspace UI (`1280 × 1020` px)

Two-column layout: **320px left chooser** + **`1fr` right preview stage**.

#### Left panel

1. Heading block: `EXPORT` label → `Newsreader 32` "Print the *chart*"
   (italic on "chart") → 12 ink-3 description "Four print-ready artifacts.
   Newsreader on cream paper. Cut marks and bleeds included."
2. **FORMAT** picker: 4 radio cards. Active: paper bg + ink border. Inactive:
   transparent + hairline border. Per card: 12px circle radio + format name
   + size descriptor mono 9 ink-3 right-aligned + Newsreader 11 description
   below (padding-left 24).
3. **PAPER** picker: 4 swatches inline — `Cream` (active), `Bone #ece5d3`,
   `Ivory #f6f0df`, `Recycled #ebe2cd`. Active: 1.5px ink border.
4. **OPTIONS** toggles: `Show meal choice`, `Cut marks & bleeds`,
   `Greyscale`. Pill switch — olive on / paper-3 off.
5. **Action row** (mt-auto): ghost "Print" + primary "Download PDF ↓" (full
   width).

#### Right preview stage

- Dark gradient: `linear-gradient(180deg, #2b2820 0%, #181610 100%)`.
- Vignette overlay: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)`.
- Centered preview: `<Scaled>` to fit (floor plan 0.62, alpha 1.05, table
  1.32, place 1.2).
- Top-left mono caption: `PROOF · PREVIEW`, opacity 0.6, 0.25em.
- Bottom-right mono caption: paper size of the selected artifact.

---

## Cross-cutting constraints (baked in by user iterations)

- **Per-table cards must scale 3–30 seats** without overflow (verified at 4 / 8 / 16 / 28).
- **Dates always numeric** — `14 SEPTEMBER 2026` (long) or `14 · 09 · 2026` (footer). **Never Roman numerals**, ever.
- **Premium spacing** — generous breathing room around hero numerals, headlines, dividers. The 28px gap above the per-table numeral was specifically called out.
- **Place card fold orientation** — top half rotated 180° (back face), bottom upright (front face). Both halves carry the name.
- **Floor plan masthead omits the venue line** (user decision; schema doesn't have a venue field, won't add one in this pass).
- **Customer language over editorial cleverness** — copy talks to stressed couples in their words ("divorced parents", "your maid-of-honor", "cousins who don't speak"). Not "every awkward pairing" / "guest at this plan" / "the way back is short".
- **Auth is required to create plans, optional to view them** — link-shareable promise preserved via RLS.
- **Anonymous plans must keep working** — `plan_owners` table with `plan_has_any_owner` RPC drives the claim flow.

---

## Implementation strategy notes

### Render-once-use-twice (exports)

Each export artifact is a single React component used for **both** the
on-screen preview (in the workspace) and the PDF generation
(`html2canvas → jsPDF.addImage(scale: 2)`). Trade-off: raster PDFs, not
searchable. Acceptable for one-shot wedding printables.

### Responsive vs design canvas

The design lives at 1280px per artboard. The app must:
- Match the design 1:1 at the `lg:` breakpoint and above.
- Adapt gracefully below `lg:` (mobile drawers, stacked grids, bottom tab bar).
- Never sacrifice content fidelity for responsive convenience.

### Room geometry persistence

Phase 6 ships with **localStorage** for wall/fixture state. A future schema
migration adding a `room_geometry` jsonb column to `plans` is the persistent
home; this pass is visual-frame + drawing tools only.

---

## File map

### Existing
- `src/index.css` — token layer, paper-grain, label-mono utilities
- `tailwind.config.ts` — color and font-family aliases
- `src/components/PaperTable.tsx` — shared SVG primitive
- `src/lib/seating.ts` — `tableConflicts`, `unmetMustWith`
- `src/lib/floorplanGeometry.ts` — `tableDims`, `computeSeats`
- `src/hooks/useAuth.tsx` — auth provider
- `src/hooks/usePlanData.ts` — realtime plan data
- `src/hooks/use-mobile.tsx` — `useIsMobile`, `useBelowLg`

### Per phase

**Phase 1 (tactical):**
- modify: `src/pages/Index.tsx` (1A), `src/pages/Planner.tsx` (1B),
  `src/components/planner/FloorPlan.tsx` (1C),
  `src/components/planner/GuestsTab.tsx` (1D),
  `src/components/planner/EmptyCanvas.tsx` (1E), `src/pages/Auth.tsx` (1F)

**Phase 2 (Onboarding):**
- new: `src/components/planner/onboarding/Field.tsx`,
  `src/components/planner/onboarding/SamplePreviewCard.tsx`
- modify: `src/components/planner/OnboardingFlow.tsx` (full rewrite)

**Phase 3 (Grouped clusters):**
- new: `src/components/planner/GroupedClusters.tsx`
- modify: `src/components/planner/SeatingView.tsx`

**Phase 4 (Auth):**
- new: `src/components/ClaimPlanModal.tsx`, `src/pages/Dashboard.tsx`
- modify: `src/pages/Auth.tsx` (4A), `src/pages/Planner.tsx` (4B/4D),
  `src/App.tsx` (4C), `src/components/UserMenu.tsx` (4C)
- delete: `src/components/SignInNudge.tsx` (replaced by in-content banner)

**Phase 5 (Mobile):**
- new: `src/components/planner/MobileFrame.tsx`
- modify: `src/components/planner/SeatingView.tsx`, `src/pages/Planner.tsx`,
  `src/components/planner/GuestsTab.tsx`

**Phase 6 (Room editor):**
- new: `src/components/planner/room/ToolPalette.tsx`,
  `src/components/planner/room/RoomCanvas.tsx`,
  `src/components/planner/room/PropertiesPanel.tsx`,
  `src/lib/room/geometry.ts`, `src/lib/room/constraints.ts`
- modify: `src/components/planner/RoomEditor.tsx` (full rewrite)

**Phase 7 (Exports):**
- new: `src/components/exports/PaperSheet.tsx`,
  `src/components/exports/Scaled.tsx`,
  `src/components/exports/FloorPlanPDF.tsx`,
  `src/components/exports/AlphabeticalIndex.tsx`,
  `src/components/exports/PerTableCard.tsx`,
  `src/components/exports/PlaceCard.tsx`,
  `src/lib/exports/tableGeom.ts`, `src/lib/exports/paperSizes.ts`,
  `src/lib/exports/renderToPdf.ts`,
  `src/lib/exports/exportFloorPlan.ts`,
  `src/lib/exports/exportAlphabeticalIndex.ts`,
  `src/lib/exports/exportPerTableCards.ts`,
  `src/lib/exports/exportPlaceCards.ts`,
  `src/lib/exports/csv.ts`
- modify: `src/components/planner/ExportPanel.tsx` (full rewrite)
- delete: `src/lib/export/seatingChart.ts`, `byTable.ts`, `placeCards.ts`,
  `alphabeticalChart.ts`, `pdfTheme.ts`

---

## Out of scope (this whole pass)

- Export gallery view (`1280×1700` dark showcase) — marketing artboard.
- Searchable text in PDFs (raster pipeline).
- Schema migration for `room_geometry` (Phase 6 = localStorage).
- Native print-shop submission.
- Vector-PDF fallback with embedded Newsreader font.
- Venue field on plans (user opted out).

---

## Mobile optimisation plan

**Target viewport:** 390×844px (iPhone SE / 12 mini) in portrait. Landscape at
`844×390` is a secondary target handled in Phase 3.

**Approach:** Responsive-first — same routes, same data model, no separate mobile
app. Desktop layout at `lg:` breakpoint matches the design canvas exactly; below
`lg:` we adapt gracefully. Three phases in strict priority order.

### Audit findings (May 2026)

Five problem categories identified from a full codebase audit:

**Outright breakages** — unusable at 390px:
- `GuestsTab` 5-column table grid `[1.2fr_1.4fr_90px_60px_70px]` causes horizontal
  scroll; table is unreadable
- `SeatingView` unassigned FAB at `fixed bottom-5` (20px) overlaps the planner's
  own bottom tab bar at `fixed bottom-0` (56px tall) — two fixed elements fight
- `FloorPlan` `MIN_ZOOM=0.4` scales tables to ~12px; seats are physically
  untappable at minimum zoom
- `RoomEditor` `CANVAS_W=1400` hardcoded; entire canvas overflows on 390px
- `Index.tsx` hero right column (`md:h-[560px]`) collapses to zero height on
  mobile — flagship visual disappears entirely

**Tap target violations** (below 44px minimum):
- FloorPlan zoom buttons: `w-7 h-7` = 28px
- Unassigned guests search in SeatingView: `h-8` = 32px
- Several action buttons in GuestsTab header row

**Layout degradation** (not broken, but cramped):
- `SmartGuestInput` / `SmartTableInput` 12-column parsed-results grids too narrow
  at 390px
- Index.tsx `height: 260` fixed-height demo cards don't reflow on small screens
- `Planner.tsx` header: plan name input + action buttons in one row gets cramped

**Missing mobile-only patterns** (desktop layout force-collapsed, needs bespoke):
- `GuestsTab` detail panel: desktop shows 300px right rail; mobile shows nothing
- `ConstraintsTab`: hover-reveal edit/delete never shows on touch
- `ExportPanel`: two-column chooser + proof stage overflows at 390px
- Auth: editorial left column takes full viewport before the form even appears

**Platform gaps** (iOS/Android-specific):
- No safe-area-inset padding on bottom tab bar (cut off by home indicator)
- Pinch-to-zoom not wired on FloorPlan canvas (pinch does nothing)
- No `inputMode` hints on drag targets (keyboard pops on long-press)

---

### Phase M1 — Stop the bleeding (breakages only)

Each item is an independent commit. Deliver in order; every item leaves the app
in a strictly better state than before.

#### M1A · GuestsTab — mobile guest list
**File:** `src/components/planner/GuestsTab.tsx`

Replace the 5-column table with a card-row layout below `lg:`. Each guest row:
`avatar + name (flex-1, truncated) + RSVP pill`. Tapping opens the existing
detail drawer. The 5-column header row is hidden on mobile. The existing
`hidden lg:block` right rail already handles the detail panel.

Mobile columns: `grid-cols-[1fr_auto]` (name + RSVP pill).
Desktop columns: `grid-cols-[1.2fr_1.4fr_90px_60px_70px]` (lg: breakpoint, unchanged).

#### M1B · SeatingView — fix FAB / bottom-nav overlap
**File:** `src/components/planner/SeatingView.tsx`

The unassigned FAB is `fixed bottom-5` (20px). Planner bottom tab nav is
`fixed bottom-0` at ~56px. Fix: `bottom-[72px]` on mobile. Also raise FAB
to minimum 44px height (`h-11`).

#### M1C · FloorPlan — mobile zoom floor and touch targets
**File:** `src/components/planner/FloorPlan.tsx`

- Detect mobile viewport on mount; set `initialZoom` to
  `containerWidth / CANVAS_W` (fit-to-width) rather than the desktop default.
- Raise zoom buttons from `w-7 h-7` to `w-10 h-10` (40px, close enough).
- Wire pinch-to-zoom: `onTouchMove` reads `touches[0]` + `touches[1]` distance
  delta and maps it to the existing `setZoom` state.

#### M1D · RoomEditor — mobile gate
**File:** `src/components/planner/RoomEditor.tsx`

Below `lg:`, replace the canvas with a full-bleed notice panel:
*"Room editing works best on a larger screen. Everything you add here will be
waiting when you switch to desktop."*
The tab remains accessible; only the interactive canvas is gated. Honest and
avoids a broken drag UX on touch.

#### M1E · Index.tsx — hero vignette height on mobile
**File:** `src/pages/Index.tsx`

`FloorPlanVignette` collapses to zero on mobile because the container is
`relative md:h-[560px]` (no base height). Fix: `h-[300px] md:h-[560px]`.

---

### Phase M2 — High-impact experience work

#### M2A · Planner header — mobile compact mode
**File:** `src/pages/Planner.tsx`

Below `sm:`, the plan name input + action buttons overflow one row. Fix: replace
the header input with a tappable plan-name text label that opens a Sheet for
editing. Better UX too — prevents accidental renames during navigation.

#### M2B · SmartGuestInput / SmartTableInput — mobile grid
**Files:** `src/components/planner/SmartGuestInput.tsx`,
`src/components/planner/SmartTableInput.tsx`

Parsed-results `grid-cols-12` with `col-span-*` is cramped at 390px. Fix:
mobile shows stacked cards per row (name line 1, party + RSVP line 2, dietary
line 3). The `col-span-*` grid activates only at `sm:`.

#### M2C · ExportPanel — stacked mobile layout
**File:** `src/components/planner/ExportPanel.tsx`

Below `md:`, show only the format picker + options in a single column. The proof
stage becomes a tappable thumbnail that expands to a modal preview. This avoids
the fixed-pixel-dimension artifact previews overflowing on 390px.

#### M2D · ConstraintsTab — tap-to-edit rows
**File:** `src/components/planner/ConstraintsTab.tsx`

Desktop uses hover-reveal edit/delete. On mobile these never appear. Fix:
`lg:hidden` tap-to-expand per constraint row that reveals edit/delete inline.

#### M2E · Index.tsx — demo card height fix
**File:** `src/pages/Index.tsx`

Change all `height: 260` fixed-height demo cards in §2 and §3 to
`minHeight: 260, height: "auto"` on mobile so content never overflows.

---

### Phase M3 — Native-feel polish

#### M3A · Pinch-to-zoom on FloorPlan canvas
**File:** `src/components/planner/FloorPlan.tsx`

Proper two-finger pinch: store touch midpoint + distance on `touchstart`,
compute scale delta on `touchmove`, apply to `zoom` state with the same
clamp/bounds logic used by wheel zoom.

#### M3B · Safe area insets
**Files:** `src/pages/Planner.tsx`, `src/components/planner/SeatingView.tsx`

Verify `env(safe-area-inset-bottom)` applies to the bottom tab bar (Planner.tsx
line ~424 already has it), the SeatingView FAB, and the unassigned drawer.
Add `pb-[env(safe-area-inset-bottom)]` to drawer content wrappers.

#### M3C · Input mode hints
**Files:** `src/components/planner/GuestsTab.tsx`, `src/pages/Planner.tsx`

Add `inputMode="none"` to draggable guest pills (prevents iOS keyboard flash on
long-press to drag). Add `autoCapitalize="words"` to plan name and guest name
fields.

#### M3D · Auth page — hide editorial column on mobile
**File:** `src/pages/Auth.tsx`

Below `md:`, the editorial left column (64px heading + bullets) consumes the
full viewport before the user sees the sign-in form. Fix: `hidden md:block` on
the left column. Show only the sign-in card, full-bleed, on mobile. The
editorial framing reappears at `md:` as designed.

#### M3E · Landscape orientation
**Files:** `src/pages/Planner.tsx`, `src/index.css`

At `844×390` landscape (iPhone SE), the 56px bottom tab bar eats 14% of screen
height. Fix: `@media (orientation: landscape) and (max-height: 500px)` switches
to a side rail nav instead of bottom bar. CSS-only; no JS required.

---

### Implementation rules for mobile work

- Every phase ships as one commit per item (M1A, M1B, etc. are separate commits).
- No mobile change should break the `lg:` desktop layout — use `lg:` or
  breakpoint guards on every mobile override.
- Minimum touch target: 44×44px on all interactive elements.
- Never use `pointer-events: none` on tap targets to "solve" overlap — fix the
  layout instead.
- Test each change at 390×844 (portrait) before committing.

### Out of scope for mobile pass

- Dedicated PWA manifest / splash screen / installability.
- Native drag-and-drop rewrite (`@dnd-kit` already has touch support).
- Floor plan re-architecture as a touch-native canvas.
- Schema changes or new routes for mobile.
