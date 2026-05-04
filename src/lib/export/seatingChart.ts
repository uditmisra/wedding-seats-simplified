import type { Assignment, Guest, TableDef } from "../types";
import { tableDims, computeSeats, initials } from "../floorplanGeometry";
import {
  newDoc, paintBackground, pageHeader, stampFooters,
  display, mono, setInk,
  INK, INK_2, INK_3, INK_4, PAPER, PAPER_2, TERRACOTTA, HAIRLINE,
} from "./pdfTheme";

interface Args {
  planName: string;
  planCode: string;
  tables: TableDef[];
  guests: Guest[];
  assignments: Assignment[];
  showTableNames: boolean;
}

/**
 * Visual floor-plan PDF — the hero export. A single landscape A4 with every
 * table drawn to scale. Uses the same geometry as the on-screen planner so the
 * print is the print: tables centred & laid out on a uniform grid.
 */
export function exportSeatingChart(args: Args) {
  const { planName, planCode, tables, guests, assignments, showTableNames } = args;
  const doc = newDoc("a4-landscape");
  paintBackground(doc);

  pageHeader(
    doc,
    planName,
    "Seating chart · Floor plan",
    `${tables.length} tables · ${assignments.length} of ${guests.length} seated`,
  );

  // Layout area below header / above footer.
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const top = 34, bottom = ph - 18, left = 14, right = pw - 14;
  const areaW = right - left;
  const areaH = bottom - top;

  if (tables.length === 0) {
    display(doc, 14, true);
    setInk(doc, INK_3);
    doc.text("No tables yet.", pw / 2, ph / 2, { align: "center" });
    stampFooters(doc, planCode);
    doc.save(`${planName}-seating-chart.pdf`);
    return;
  }

  // Compute grid (mirrors FloorPlan.tsx behaviour).
  const dims = tables.map(tableDims);
  const maxW = Math.max(220, ...dims.map(d => d.box.w + 80));
  const maxH = Math.max(220, ...dims.map(d => d.box.h + 80));
  const cols = tables.length <= 2 ? Math.max(1, tables.length) : tables.length <= 6 ? 3 : 4;
  const rows = Math.max(1, Math.ceil(tables.length / cols));
  const worldW = cols * maxW;
  const worldH = rows * maxH;
  const scale = Math.min(areaW / worldW, areaH / worldH);
  const drawW = worldW * scale;
  const drawH = worldH * scale;
  const offX = left + (areaW - drawW) / 2;
  const offY = top + (areaH - drawH) / 2;

  const guestById = new Map(guests.map(g => [g.id, g]));

  tables.forEach((t, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = offX + (col + 0.5) * maxW * scale;
    const cy = offY + (row + 0.5) * maxH * scale;
    const d = dims[i];
    const seats = computeSeats(t);
    const seated = assignments.filter(a => a.table_id === t.id);
    const bySeat = new Map<number, Assignment>();
    seated.forEach(a => { if (a.seat_index != null) bySeat.set(a.seat_index, a); });

    drawTable(doc, t, d, cx, cy, scale);

    // Seats
    seats.forEach((s, idx) => {
      const sx = cx + s.x * scale;
      const sy = cy + s.y * scale;
      const r = 4 * scale;
      const a = bySeat.get(idx);
      if (a) {
        const g = guestById.get(a.guest_id);
        doc.setFillColor(...TERRACOTTA);
        doc.setDrawColor(...INK);
        doc.setLineWidth(0.15);
        doc.circle(sx, sy, r, "FD");
        if (g) {
          mono(doc, Math.max(4, 5.5 * scale));
          setInk(doc, PAPER);
          const txt = initials(g.name);
          const w = doc.getTextWidth(txt);
          doc.text(txt, sx - w / 2, sy + 1.6 * scale);
        }
      } else {
        doc.setFillColor(...PAPER);
        doc.setDrawColor(...INK_4);
        doc.setLineWidth(0.15);
        doc.circle(sx, sy, r, "FD");
        mono(doc, Math.max(3.5, 4.5 * scale));
        setInk(doc, INK_3);
        const txt = String(idx + 1);
        const w = doc.getTextWidth(txt);
        doc.text(txt, sx - w / 2, sy + 1.4 * scale);
      }
    });

    if (showTableNames) {
      display(doc, Math.max(7, 9 * scale));
      setInk(doc, INK);
      const w = doc.getTextWidth(t.name);
      doc.text(t.name, cx - w / 2, cy);
      mono(doc, Math.max(5, 6 * scale));
      setInk(doc, INK_3);
      const meta = `${seated.length}/${t.capacity}`;
      const mw = doc.getTextWidth(meta);
      doc.text(meta, cx - mw / 2, cy + 4);
    }
  });

  // Legend
  const ly = ph - 18;
  mono(doc, 7);
  setInk(doc, INK_3);
  let lx = left;
  const drawLegendDot = (color: [number, number, number], stroke: [number, number, number]) => {
    doc.setFillColor(...color);
    doc.setDrawColor(...stroke);
    doc.setLineWidth(0.15);
    doc.circle(lx, ly - 1.2, 1.4, "FD");
    lx += 3;
  };
  drawLegendDot(TERRACOTTA, INK);
  doc.text("SEATED", lx, ly);
  lx += doc.getTextWidth("SEATED") + 5;
  drawLegendDot(PAPER, INK_4);
  doc.text("EMPTY", lx, ly);

  stampFooters(doc, planCode);
  doc.save(`${planName}-seating-chart.pdf`);
}

function drawTable(doc: any, t: TableDef, d: ReturnType<typeof tableDims>, cx: number, cy: number, scale: number) {
  doc.setFillColor(...PAPER_2);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.4);
  if (t.shape === "round") {
    doc.circle(cx, cy, d.radius * scale, "FD");
  } else if (t.shape === "square") {
    const s = d.shapeW * scale;
    doc.roundedRect(cx - s / 2, cy - s / 2, s, s, 1.5, 1.5, "FD");
  } else {
    const w = d.shapeW * scale, h = d.shapeH * scale;
    const r = t.shape === "head" ? 2 : 1.2;
    doc.roundedRect(cx - w / 2, cy - h / 2, w, h, r, r, "FD");
  }
}
