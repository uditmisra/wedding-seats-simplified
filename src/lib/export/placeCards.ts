import type { Assignment, Guest, TableDef } from "../types";
import {
  newDoc, paintBackground,
  display, body, mono, setInk,
  INK, INK_2, INK_3, INK_4, HAIRLINE, TERRACOTTA, PAPER_2,
} from "./pdfTheme";

interface Args {
  planName: string;
  tables: TableDef[];
  guests: Guest[];
  assignments: Assignment[];
  showDietary: boolean;
}

/**
 * Place cards, 4 per A4 sheet, double-sided. Front: name + table.
 * Back: meal + a small dot showing the table within the room.
 * Crop marks and a centre fold rule are drawn as hairlines.
 */
export function exportPlaceCards(args: Args) {
  const { planName, tables, guests, assignments, showDietary } = args;
  const doc = newDoc("a4");
  const guestById = new Map(guests.map(g => [g.id, g]));
  const tableById = new Map(tables.map(t => [t.id, t]));
  const tableIndex = new Map(tables.map((t, i) => [t.id, i]));

  const items = assignments
    .map(a => {
      const g = guestById.get(a.guest_id);
      const t = tableById.get(a.table_id);
      if (!g || !t) return null;
      return { g, t };
    })
    .filter((x): x is { g: Guest; t: TableDef } => !!x)
    .sort((a, b) => a.g.name.localeCompare(b.g.name));

  if (items.length === 0) {
    paintBackground(doc);
    display(doc, 16, true);
    setInk(doc, INK_3);
    doc.text("No seated guests yet.", 105, 150, { align: "center" });
    doc.save(`${planName}-place-cards.pdf`);
    return;
  }

  // A4 is 210 x 297. 4 cards per sheet → 2 cols × 2 rows.
  // Each card 90 x 120 mm, with 15mm horizontal margins and 28.5mm vertical margins.
  const cardW = 90, cardH = 120;
  const marginX = (210 - cardW * 2) / 2; // 15
  const marginY = (297 - cardH * 2) / 2; // 28.5

  const perSheet = 4;
  const sheets = Math.ceil(items.length / perSheet);

  for (let s = 0; s < sheets; s++) {
    const sheetItems = items.slice(s * perSheet, s * perSheet + perSheet);
    // FRONT page
    if (s > 0) doc.addPage();
    paintBackground(doc);
    drawCropMarks(doc, marginX, marginY, cardW, cardH);
    sheetItems.forEach((it, idx) => {
      const col = idx % 2, row = Math.floor(idx / 2);
      const x = marginX + col * cardW;
      const y = marginY + row * cardH;
      drawCardFront(doc, x, y, cardW, cardH, it.g, it.t);
    });
    // BACK page (mirrored horizontally for duplex long-edge flip)
    doc.addPage();
    paintBackground(doc);
    drawCropMarks(doc, marginX, marginY, cardW, cardH);
    sheetItems.forEach((it, idx) => {
      const col = idx % 2, row = Math.floor(idx / 2);
      // Mirror columns for duplex print
      const mirroredCol = 1 - col;
      const x = marginX + mirroredCol * cardW;
      const y = marginY + row * cardH;
      drawCardBack(doc, x, y, cardW, cardH, it.g, it.t, tables, tableIndex, showDietary);
    });
  }

  doc.save(`${planName}-place-cards.pdf`);
}

function drawCropMarks(doc: any, mx: number, my: number, cw: number, ch: number) {
  doc.setDrawColor(...HAIRLINE);
  doc.setLineWidth(0.15);
  const len = 4;
  const xs = [mx, mx + cw, mx + 2 * cw];
  const ys = [my, my + ch, my + 2 * ch];
  for (const x of xs) for (const y of ys) {
    doc.line(x - len, y, x - 1, y);
    doc.line(x + 1, y, x + len, y);
    doc.line(x, y - len, x, y - 1);
    doc.line(x, y + 1, x, y + len);
  }
  // Fold line down the centre of each card (cards fold horizontally at half-height)
  doc.setLineDashPattern([1, 1.2], 0);
  for (let r = 0; r < 2; r++) {
    const y = my + r * ch + ch / 2;
    doc.line(mx, y, mx + 2 * cw, y);
  }
  doc.setLineDashPattern([], 0);
}

function drawCardFront(doc: any, x: number, y: number, w: number, h: number, g: Guest, t: TableDef) {
  // The card folds at h/2. The lower half is what stands up & faces the guest.
  const visibleY = y + h / 2;
  const cx = x + w / 2;
  const cy = visibleY + h / 4;
  // Soft inner border
  doc.setDrawColor(...INK_4);
  doc.setLineWidth(0.2);
  doc.rect(x + 4, visibleY + 4, w - 8, h / 2 - 8, "S");
  // Decorative hairline above name
  doc.setDrawColor(...TERRACOTTA);
  doc.setLineWidth(0.4);
  doc.line(cx - 8, cy - 12, cx + 8, cy - 12);
  // Name
  display(doc, 24);
  setInk(doc, INK);
  const nw = doc.getTextWidth(g.name);
  doc.text(g.name, cx - nw / 2, cy);
  // Table italic
  display(doc, 11, true);
  setInk(doc, INK_3);
  const tw = doc.getTextWidth(t.name);
  doc.text(t.name, cx - tw / 2, cy + 9);
}

function drawCardBack(
  doc: any,
  x: number, y: number, w: number, h: number,
  g: Guest, t: TableDef,
  tables: TableDef[], tableIndex: Map<string, number>,
  showDietary: boolean,
) {
  // Back faces the guest BEFORE folding — so we use the upper half (which becomes the front of the back when folded).
  const visibleY = y;
  const cx = x + w / 2;
  const cy = visibleY + h / 4;
  // Tiny "guest details" caption
  mono(doc, 7);
  setInk(doc, INK_3);
  doc.text("FOR THE TABLE", x + 8, visibleY + 10);
  // Meal preference
  if (showDietary && g.meal) {
    body(doc, 11);
    setInk(doc, INK);
    doc.text(`Meal · ${g.meal}`, x + 8, visibleY + 18);
  }
  if (g.accessibility) {
    body(doc, 9);
    setInk(doc, INK_2);
    doc.text(`Note · ${g.accessibility}`, x + 8, visibleY + 24);
  }
  // Mini room map: scatter dots for tables; highlight the guest's table.
  const mapY = visibleY + h / 2 - 22;
  const mapH = 18;
  const mapX = x + 8;
  const mapW = w - 16;
  doc.setDrawColor(...HAIRLINE);
  doc.setLineWidth(0.2);
  doc.rect(mapX, mapY, mapW, mapH, "S");
  if (tables.length > 0) {
    const cols = Math.ceil(Math.sqrt(tables.length));
    const rows = Math.ceil(tables.length / cols);
    tables.forEach((tt, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const px = mapX + ((c + 0.5) / cols) * mapW;
      const py = mapY + ((r + 0.5) / rows) * mapH;
      const isMe = tt.id === t.id;
      if (isMe) {
        doc.setFillColor(...TERRACOTTA);
        doc.setDrawColor(...INK);
      } else {
        doc.setFillColor(...PAPER_2);
        doc.setDrawColor(...INK_4);
      }
      doc.setLineWidth(0.15);
      doc.circle(px, py, isMe ? 1.6 : 1, "FD");
    });
  }
  mono(doc, 6);
  setInk(doc, INK_3);
  doc.text(`YOU'RE THE • TABLE ${tableIndex.get(t.id)! + 1}`, mapX, mapY - 1.2);
}
