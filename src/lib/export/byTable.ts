import type { Assignment, ConstraintDef, Guest, TableDef } from "../types";
import { tableConflicts } from "../seating";
import {
  newDoc, paintBackground, pageHeader, stampFooters, hairline, tableBadge,
  display, body, mono, setInk,
  INK, INK_2, INK_3, INK_4, ROSE, TERRACOTTA, PAPER_2,
} from "./pdfTheme";

interface Args {
  planName: string;
  planCode: string;
  guests: Guest[];
  tables: TableDef[];
  assignments: Assignment[];
  constraints: ConstraintDef[];
  showCapacity: boolean;
  showDietary: boolean;
}

/**
 * One designed page per table: badge, name, shape/capacity, seat-ordered
 * guest list, conflict callout if any.
 */
export function exportByTable(args: Args) {
  const { planName, planCode, guests, tables, assignments, constraints, showCapacity, showDietary } = args;
  const doc = newDoc("a4");
  const guestById = new Map(guests.map(g => [g.id, g]));

  if (tables.length === 0) {
    paintBackground(doc);
    pageHeader(doc, planName, "Tables", "");
    display(doc, 14, true);
    setInk(doc, INK_3);
    doc.text("No tables yet.", 105, 150, { align: "center" });
    stampFooters(doc, planCode);
    doc.save(`${planName}-tables.pdf`);
    return;
  }

  tables.forEach((t, i) => {
    if (i > 0) doc.addPage();
    paintBackground(doc);
    const seated = assignments.filter(a => a.table_id === t.id)
      .sort((a, b) => (a.seat_index ?? 0) - (b.seat_index ?? 0));
    pageHeader(doc, planName, "Table sheet", `${seated.length} OF ${t.capacity}`);

    // Big badge + name
    const badgeX = 24;
    const badgeY = 50;
    const labelMatch = t.name.match(/^(T\d+|\d+)/i);
    const badgeLabel = labelMatch ? labelMatch[1].toUpperCase().replace(/^T/, "T") : String(i + 1);
    tableBadge(doc, badgeX, badgeY, badgeLabel.length <= 3 ? badgeLabel : `T${i + 1}`);

    display(doc, 28);
    setInk(doc, INK);
    doc.text(t.name, badgeX + 14, badgeY + 3);

    if (showCapacity) {
      mono(doc, 8);
      setInk(doc, INK_3);
      doc.text(`${t.shape.toUpperCase()} · ${t.capacity} SEATS`, badgeX + 14, badgeY + 9);
    }

    hairline(doc, 14, 70, 196, 70);

    // Guest list (seat-ordered)
    let y = 82;
    const lineH = 9;
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    for (let s = 0; s < t.capacity; s++) {
      if (y + lineH > ph - 30) break;
      const a = seated.find(x => x.seat_index === s);
      const g = a ? guestById.get(a.guest_id) : undefined;
      // Seat number
      mono(doc, 8);
      setInk(doc, INK_3);
      doc.text(String(s + 1).padStart(2, "0"), 18, y);
      if (g) {
        body(doc, 12);
        setInk(doc, INK);
        doc.text(g.name, 30, y);
        if (g.party) {
          mono(doc, 7);
          setInk(doc, INK_3);
          doc.text(g.party.toUpperCase(), 30, y + 4);
        }
        if (showDietary && g.meal) {
          // Tiny chip on the right
          const chip = g.meal;
          mono(doc, 7);
          const cw = doc.getTextWidth(chip) + 4;
          doc.setDrawColor(...INK_4);
          doc.setLineWidth(0.2);
          doc.roundedRect(pw - 14 - cw, y - 4, cw, 6, 1, 1, "S");
          setInk(doc, INK_2);
          doc.text(chip, pw - 14 - cw + 2, y);
        }
      } else {
        body(doc, 11);
        setInk(doc, INK_4);
        doc.text("— empty —", 30, y);
      }
      // Row hairline
      hairline(doc, 14, y + 5, pw - 14, y + 5);
      y += lineH + (a && guestById.get(a.guest_id)?.party ? 2 : 0);
    }

    // Conflict callout
    const conflicts = tableConflicts(t.id, assignments, constraints);
    if (conflicts.length > 0) {
      const cy = ph - 30;
      doc.setFillColor(...PAPER_2);
      doc.setDrawColor(...ROSE);
      doc.setLineWidth(0.3);
      doc.roundedRect(14, cy - 6, pw - 28, 14, 1.5, 1.5, "FD");
      mono(doc, 7);
      setInk(doc, ROSE);
      doc.text("CONFLICT", 18, cy - 1.5);
      body(doc, 9);
      setInk(doc, INK_2);
      const names = conflicts.slice(0, 2).map(c => {
        const ga = guestById.get(c.guest_a)?.name ?? "—";
        const gb = guestById.get(c.guest_b)?.name ?? "—";
        return `${ga} ↔ ${gb}`;
      }).join("   ·   ");
      doc.text(names, 18, cy + 4);
    }
  });

  stampFooters(doc, planCode);
  doc.save(`${planName}-tables.pdf`);
}
