import type { Assignment, Guest, Plan, TableDef } from "../types";
import { renderPagesToPdf } from "./renderToPdf";
import { PLACE_CARD } from "./paperSizes";
import type { PaperColor } from "@/components/exports/PaperSheet";
import { PlaceCard } from "@/components/exports/PlaceCard";

interface Args {
  plan: Plan;
  tables: TableDef[];
  guests: Guest[];
  assignments: Assignment[];
  paper: PaperColor;
  cutMarks: boolean;
  onProgress?: (done: number, total: number) => void;
  showMeal: boolean;
}

export async function exportPlaceCards({
  plan, tables, guests, assignments, paper, cutMarks, showMeal, onProgress,
}: Args) {
  if (assignments.length === 0) return;
  const guestById = new Map(guests.map(g => [g.id, g]));
  const tableNumByTableId = new Map(tables.map((t, i) => [t.id, i + 1]));

  // Sort by last name for predictable batches.
  const items = assignments
    .map(a => {
      const guest = guestById.get(a.guest_id);
      const tableNum = tableNumByTableId.get(a.table_id);
      if (!guest || tableNum === undefined) return null;
      return { guest, tableNum };
    })
    .filter((x): x is { guest: Guest; tableNum: number } => x !== null)
    .sort((a, b) => a.guest.name.localeCompare(b.guest.name));

  if (items.length === 0) return;

  const pageElements = items.map(({ guest, tableNum }) => (
    <PlaceCard
      key={guest.id}
      name={guest.name}
      table={tableNum}
      meal={guest.meal ?? null}
      showMeal={showMeal}
      paper={paper}
      cutMarks={cutMarks}
    />
  ));

  await renderPagesToPdf(pageElements, {
    filename: `${plan.name} — Place cards.pdf`,
    paper: PLACE_CARD,
    onProgress,
  });
}
