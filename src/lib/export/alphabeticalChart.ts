import type { Assignment, Guest, TableDef } from "../types";
import {
  newDoc, paintBackground, pageHeader, stampFooters, hairline, leaderDots,
  display, body, mono, setInk,
  INK, INK_2, INK_3, TERRACOTTA,
} from "./pdfTheme";

interface Args {
  planName: string;
  planCode: string;
  guests: Guest[];
  tables: TableDef[];
  assignments: Assignment[];
  showDietary: boolean;
}

/**
 * Big A–Z chart. Two columns, hairline divider, oversized italic letter
 * headings — the kind of thing you frame at the venue entrance.
 */
export function exportAlphabeticalChart(args: Args) {
  const { planName, planCode, guests, tables, assignments, showDietary } = args;
  const doc = newDoc("a4");
  const guestById = new Map(guests.map(g => [g.id, g]));
  const tableById = new Map(tables.map(t => [t.id, t]));

  type Row = { name: string; party: string; meal: string; table: string; letter: string };
  const rows: Row[] = assignments
    .map(a => {
      const g = guestById.get(a.guest_id);
      const t = tableById.get(a.table_id);
      if (!g || !t) return null;
      return {
        name: g.name,
        party: g.party ?? "",
        meal: g.meal ?? "",
        table: t.name,
        letter: g.name.trim().charAt(0).toUpperCase(),
      } as Row;
    })
    .filter((r): r is Row => !!r)
    .sort((a, b) => a.name.localeCompare(b.name));

  const dietCount = rows.filter(r => r.meal).length;
  const meta = `${guests.length} GUESTS · ${tables.length} TABLES${showDietary ? ` · ${dietCount} DIETARY` : ""}`;

  paintBackground(doc);
  pageHeader(doc, planName, "Seating · A to Z", meta);

  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const top = 36;
  const bottom = ph - 18;
  const colGap = 10;
  const colW = (pw - 28 - colGap) / 2;
  const colXs = [14, 14 + colW + colGap];
  const lineH = 6.2;

  let col = 0;
  let y = top;
  let lastLetter = "";

  const ensureSpace = (needed: number) => {
    if (y + needed > bottom) {
      col++;
      if (col > 1) {
        doc.addPage();
        paintBackground(doc);
        pageHeader(doc, planName, "Seating · A to Z", meta);
        col = 0;
      }
      y = top;
    }
  };

  // Hairline column divider on each fresh page (only between two columns).
  const drawColumnDivider = () => {
    hairline(doc, pw / 2, top, pw / 2, bottom);
  };
  drawColumnDivider();

  for (const r of rows) {
    if (r.letter !== lastLetter) {
      ensureSpace(14);
      // Initial letter as oversized italic display.
      display(doc, 28, true);
      setInk(doc, TERRACOTTA);
      doc.text(r.letter, colXs[col], y + 8);
      mono(doc, 7);
      setInk(doc, INK_3);
      doc.text("—", colXs[col] + 12, y + 6);
      y += 11;
      lastLetter = r.letter;
    }

    ensureSpace(lineH);
    const x = colXs[col];
    // Name
    body(doc, 10);
    setInk(doc, INK);
    const nameText = r.name + (showDietary && r.meal ? `  ${r.meal}` : "");
    doc.text(nameText, x, y);
    // Table right-aligned
    body(doc, 9);
    setInk(doc, INK_2);
    const tw = doc.getTextWidth(r.table);
    const tableX = x + colW - tw;
    doc.text(r.table, tableX, y);
    // Leader dots between
    const nameW = doc.getTextWidth(nameText);
    if (tableX > x + nameW + 6) {
      leaderDots(doc, x + nameW + 2, tableX - 2, y - 1.2);
    }
    // Party as a tiny mono caption underneath
    if (r.party) {
      mono(doc, 6.5);
      setInk(doc, INK_3);
      doc.text(r.party.toUpperCase(), x, y + 2.6);
    }
    y += lineH + (r.party ? 1.4 : 0);

    // Re-draw column divider when wrapping pages (handled in ensureSpace branch)
    if (col === 0 && y === top) drawColumnDivider();
  }

  if (rows.length === 0) {
    display(doc, 14, true);
    setInk(doc, INK_3);
    doc.text("No one's been seated yet.", pw / 2, ph / 2, { align: "center" });
  }

  stampFooters(doc, planCode);
  doc.save(`${planName}-seating-az.pdf`);
}
