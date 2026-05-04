import type { Assignment, Guest, Plan, TableDef } from "../types";
import { renderToPdf } from "./renderToPdf";
import { FLOOR_PLAN } from "./paperSizes";
import type { PaperColor } from "@/components/exports/PaperSheet";
import { FloorPlanPDF, type FloorPlanTable } from "@/components/exports/FloorPlanPDF";

interface Args {
  plan: Plan;
  tables: TableDef[];
  guests: Guest[];
  assignments: Assignment[];
  paper: PaperColor;
  cutMarks: boolean;
}

/**
 * Lay tables onto the floor plan canvas. If the tables have stored x/y
 * positions (from the Room editor) we honour them, normalising into the
 * 100..1000 × 210..640 room rectangle. Otherwise we grid them in rows.
 */
function layoutTables(tables: TableDef[]): { id: string; x: number; y: number }[] {
  if (tables.length === 0) return [];
  const useStored = tables.some(t => t.x !== 0 || t.y !== 0);
  if (useStored) {
    const xs = tables.map(t => t.x);
    const ys = tables.map(t => t.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const dx = maxX - minX || 1;
    const dy = maxY - minY || 1;
    return tables.map(t => ({
      id: t.id,
      x: 150 + ((t.x - minX) / dx) * 800,
      y: 260 + ((t.y - minY) / dy) * 320,
    }));
  }
  // Auto-grid: 5 columns, 160px x-stride, 220px y-stride.
  return tables.map((t, i) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    return {
      id: t.id,
      x: 150 + col * 160,
      y: 270 + row * 220,
    };
  });
}

export async function exportFloorPlan({ plan, tables, guests, assignments, paper, cutMarks }: Args) {
  const layout = layoutTables(tables);
  const positionById = new Map(layout.map(l => [l.id, l]));

  const seatedByTable = new Map<string, number>();
  for (const a of assignments) {
    seatedByTable.set(a.table_id, (seatedByTable.get(a.table_id) ?? 0) + 1);
  }

  const fpTables: FloorPlanTable[] = tables.map((t, i) => {
    const pos = positionById.get(t.id);
    return {
      id: t.id,
      num: i + 1,
      x: pos?.x ?? 150,
      y: pos?.y ?? 270,
      seats: t.capacity,
      occupied: Math.min(seatedByTable.get(t.id) ?? 0, t.capacity),
      name: t.name,
    };
  });

  await renderToPdf(
    <FloorPlanPDF
      coupleName={plan.name}
      eventDate={plan.event_date}
      planCode={plan.code}
      totalGuests={guests.length}
      totalTables={tables.length}
      tables={fpTables}
      paper={paper}
      cutMarks={cutMarks}
    />,
    {
      filename: `${plan.name} — Floor plan.pdf`,
      paper: FLOOR_PLAN,
    },
  );
}
