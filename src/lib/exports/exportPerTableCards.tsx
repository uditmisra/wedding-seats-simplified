import type { Assignment, Guest, Plan, TableDef } from "../types";
import { renderPagesToPdf } from "./renderToPdf";
import { PER_TABLE_CARD } from "./paperSizes";
import type { PaperColor } from "@/components/exports/PaperSheet";
import { PerTableCard } from "@/components/exports/PerTableCard";

interface Args {
  plan: Plan;
  tables: TableDef[];
  guests: Guest[];
  assignments: Assignment[];
  paper: PaperColor;
  cutMarks: boolean;
}

export async function exportPerTableCards({
  plan, tables, guests, assignments, paper, cutMarks,
}: Args) {
  if (tables.length === 0) return;
  const guestById = new Map(guests.map(g => [g.id, g]));

  // Group assignments by table, sorted by seat_index.
  const seatsByTable = new Map<string, string[]>();
  for (const a of assignments) {
    const guest = guestById.get(a.guest_id);
    if (!guest) continue;
    if (!seatsByTable.has(a.table_id)) seatsByTable.set(a.table_id, []);
  }
  for (const t of tables) seatsByTable.set(t.id, []);

  const sorted = [...assignments].sort((a, b) => (a.seat_index ?? 0) - (b.seat_index ?? 0));
  for (const a of sorted) {
    const guest = guestById.get(a.guest_id);
    if (!guest) continue;
    const list = seatsByTable.get(a.table_id);
    if (list) list.push(guest.name);
  }

  const pageElements = tables.map((t, i) => {
    const seats = seatsByTable.get(t.id) ?? [];
    return (
      <PerTableCard
        key={t.id}
        num={i + 1}
        name={t.name}
        seats={seats}
        coupleName={plan.name}
        eventDate={plan.event_date}
        paper={paper}
        cutMarks={cutMarks}
      />
    );
  });

  await renderPagesToPdf(pageElements, {
    filename: `${plan.name} — Table cards.pdf`,
    paper: PER_TABLE_CARD,
  });
}
