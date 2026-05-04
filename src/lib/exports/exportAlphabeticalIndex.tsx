import type { Assignment, Guest, Plan, TableDef } from "../types";
import { renderPagesToPdf } from "./renderToPdf";
import { ALPHABETICAL_INDEX } from "./paperSizes";
import type { PaperColor } from "@/components/exports/PaperSheet";
import {
  AlphabeticalIndex,
  ALPHA_PER_PAGE_FIRST,
  ALPHA_PER_PAGE_REST,
  type AlphaEntry,
} from "@/components/exports/AlphabeticalIndex";

interface Args {
  plan: Plan;
  tables: TableDef[];
  guests: Guest[];
  assignments: Assignment[];
  paper: PaperColor;
  cutMarks: boolean;
}

function lastFirst(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, parts.length - 1).join(" ");
  return `${last}, ${rest}`;
}

export async function exportAlphabeticalIndex({
  plan, tables, guests, assignments, paper, cutMarks,
}: Args) {
  const tableNumByTableId = new Map(tables.map((t, i) => [t.id, i + 1]));
  const guestById = new Map(guests.map(g => [g.id, g]));

  const entries: AlphaEntry[] = assignments
    .map((a): AlphaEntry | null => {
      const g = guestById.get(a.guest_id);
      const tableNum = tableNumByTableId.get(a.table_id);
      if (!g || tableNum === undefined) return null;
      return { name: lastFirst(g.name), table: tableNum };
    })
    .filter((e): e is AlphaEntry => e !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (entries.length === 0) return;

  // Paginate: first page holds ~56 entries (with masthead), subsequent ~84.
  const pages: AlphaEntry[][] = [];
  let cursor = 0;
  pages.push(entries.slice(cursor, cursor + ALPHA_PER_PAGE_FIRST));
  cursor += ALPHA_PER_PAGE_FIRST;
  while (cursor < entries.length) {
    pages.push(entries.slice(cursor, cursor + ALPHA_PER_PAGE_REST));
    cursor += ALPHA_PER_PAGE_REST;
  }

  const pageElements = pages.map((entriesOnPage, idx) => (
    <AlphabeticalIndex
      key={idx}
      coupleName={plan.name}
      eventDate={plan.event_date}
      planCode={plan.code}
      entries={entriesOnPage}
      pageIndex={idx + 1}
      pageCount={pages.length}
      paper={paper}
      cutMarks={cutMarks}
    />
  ));

  await renderPagesToPdf(pageElements, {
    filename: `${plan.name} — Alphabetical index.pdf`,
    paper: ALPHABETICAL_INDEX,
  });
}
