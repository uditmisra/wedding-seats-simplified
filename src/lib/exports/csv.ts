import type { Assignment, Guest, TableDef } from "../types";

interface Args {
  planName: string;
  guests: Guest[];
  tables: TableDef[];
  assignments: Assignment[];
}

/**
 * Caterer's-eye-view CSV. Includes the full roster so unseated guests
 * (e.g. "maybe" RSVPs) still appear with empty table fields.
 */
export function exportCsv(args: Args) {
  const { planName, guests, tables, assignments } = args;
  const guestById = new Map(guests.map(g => [g.id, g]));
  const tableById = new Map(tables.map(t => [t.id, t]));

  const rows: string[][] = [[
    "Name", "Party", "Side", "Table", "Table Shape", "Seat",
    "Meal", "Accessibility", "Kid", "RSVP", "Notes",
  ]];
  for (const a of assignments) {
    const g = guestById.get(a.guest_id);
    const t = tableById.get(a.table_id);
    if (!g || !t) continue;
    rows.push([
      g.name,
      g.party ?? "",
      g.side ?? "",
      t.name,
      t.shape,
      a.seat_index != null ? String(a.seat_index + 1) : "",
      g.meal ?? "",
      g.accessibility ?? "",
      g.is_kid ? "yes" : "",
      g.rsvp,
      g.notes ?? "",
    ]);
  }
  const assignedSet = new Set(assignments.map(a => a.guest_id));
  for (const g of guests) {
    if (assignedSet.has(g.id)) continue;
    rows.push([
      g.name, g.party ?? "", g.side ?? "", "", "", "",
      g.meal ?? "", g.accessibility ?? "", g.is_kid ? "yes" : "", g.rsvp, g.notes ?? "",
    ]);
  }

  const csv = rows
    .map(r => r.map(c => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${planName}-roster.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
