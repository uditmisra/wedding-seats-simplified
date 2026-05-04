## The honest answer: no, the exports don't match the app

The on-screen Export tab is beautifully art-directed — paper grain, Newsreader display type, terracotta accents, a "Fig. 01" preview. The actual files people download look nothing like that:

- **PDFs use jsPDF's default Helvetica on stark white.** No paper tone, no display serif, no hairline rules, no chapter numerals — none of the editorial language that defines the rest of the app.
- **"Big seating chart"** is a bare two-column text dump. No header block, no totals, no zebra rows.
- **"One page per table"** is a bullet list. No table number badge, no shape indicator, no seat order.
- **"Place cards"** is a wireframe — eight grey rectangles per A4 with a centred name. No fold guide, no decorative motif, no cut marks, nothing you'd actually put on a table.
- **No actual visual seating chart export.** The app's hero artifact — the floor plan — is missing from the deliverables.
- **CSV is fine but minimal.** Misses seat index, table shape, side, accessibility, kid flag.

The exports undersell the product. People who download them won't believe it's the same app.

## What we'll build

Four redesigned PDFs + an upgraded CSV, all sharing the paper/serif/terracotta language.

### 1. Visual seating chart PDF (new — becomes the hero export)

Render the same floor-plan SVG used in the planner into the PDF as vector. Single landscape A4 (with A3 toggle) showing every table laid out, seat numbers, guest initials, table names, and a small legend. This is the format people frame or hang at the venue entrance.

### 2. Big seating chart (A–Z list) — redesigned

- Header: plan name in Newsreader, event date, "Seating · A–Z" tagline, totals strip ("128 guests · 16 tables · 12 dietary marks").
- Two-column body with hairline rule between columns.
- Each row: guest name (serif), party tag (small caps mono), table name right-aligned with leader dots.
- Section headings by initial letter as oversized italic display ("A", "B", "C").
- Footer: plan code, page X of Y, "Made with Seatly".
- Optional dietary chip after the name.

### 3. One page per table — redesigned

- Per-table page: large "T1" badge, table name in serif display, shape and capacity in mono, inline seat-map thumbnail.
- Guest list with seat order (Seat 1 → N), name, party, dietary tag.
- Conflict callout at the bottom if any constraints are violated.

### 4. Place cards — redesigned

- 4 per A4 sheet (not 8), printed two-up duplex-friendly: front shows guest name in display serif and table in italic; back shows meal preference and a tiny floor-plan dot showing which table.
- Crop marks and fold guides as hairlines.
- Optional "Mr./Ms." prefix toggle.

### 5. CSV — small additions

Add columns: seat index, table shape, party side, accessibility notes, kid flag.

## Technical approach

```text
Current: jsPDF .text() calls → flat A4 default fonts
Target:  jsPDF + custom fonts + paper background + SVG embed
```

- **Fonts**: Embed Newsreader (display) + Inter Tight (body) in jsPDF via `addFileToVFS` + `addFont`. Fetch the WOFF/TTF the app already loads, base64 once at module load.
- **Paper tone**: Fill page background with `hsl(41 40% 92%)` converted to RGB before drawing.
- **Hairlines**: 0.3pt rules in `hsl(50 14% 15% / 0.15)`.
- **Floor-plan embed**: Extract `computeSeats` and `tableDims` into `src/lib/floorplanGeometry.ts` so both the React canvas and the export use them; build an SVG string from that geometry and render via `jspdf.svg()` (svg2pdf.js) at vector quality.
- **Refactor**: Each export becomes `src/lib/export/<format>.ts`. `ExportPanel.tsx` stays thin. A shared `pdfTheme.ts` holds colors, fonts, and page setup.
- **Preview**: Update on-screen `PaperPreview` to render the same components as the actual PDF — what you see is what prints. Add a sub-toggle to preview each format before downloading.

## Files affected

- `src/lib/export/pdfTheme.ts` (new) — fonts, colors, page helpers
- `src/lib/export/seatingChart.ts` (new) — visual chart PDF
- `src/lib/export/alphabeticalChart.ts` (new) — A–Z list redesign
- `src/lib/export/byTable.ts` (new) — per-table redesign
- `src/lib/export/placeCards.ts` (new) — 4-up double-sided cards
- `src/lib/export/csv.ts` (new) — extended columns
- `src/lib/floorplanGeometry.ts` (new) — pure geometry pulled from `FloorPlan.tsx`
- `src/components/planner/ExportPanel.tsx` — wire up new exports, surface "Visual chart" format, refresh preview
- `package.json` — add `svg2pdf.js`

## Two product calls before I build

1. **Hero export — the new visual seating chart, or keep the A–Z list as the default download?**
2. **Place cards — 4-up double-sided (premium feel) or keep 8-up single-sided (cheaper to print)?**

If you say "just go", I'll default to: visual chart as hero, 4-up double-sided cards, all four PDFs redesigned, geometry extracted, on-screen preview matched to actual output.