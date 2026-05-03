import type { Guest, TableDef, Assignment, ConstraintDef } from "@/lib/types";
import { tableConflicts, unmetMustWith } from "@/lib/seating";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface Props {
  guests: Guest[];
  tables: TableDef[];
  assignments: Assignment[];
  constraints: ConstraintDef[];
}

/**
 * A single calm progress strip. One number that matters: how close are we to done?
 * Conflicts only surface when present, so the happy path stays quiet.
 */
export function StatsBar({ guests, tables, assignments, constraints }: Props) {
  // Count anyone who hasn't declined — early on, RSVPs are "pending" and we
  // don't want the headline to read "0 of 0" while the couple has 80 names typed in.
  const expected = guests.filter(g => g.rsvp !== "declined");
  const expectedIds = new Set(expected.map(g => g.id));
  const total = expected.length;
  const seated = assignments.filter(a => expectedIds.has(a.guest_id)).length;
  const conflicts = tables.flatMap(t => tableConflicts(t.id, assignments, constraints)).length + unmetMustWith(assignments, constraints).length;
  const pct = total ? Math.round((seated / total) * 100) : 0;
  const done = total > 0 && seated === total && conflicts === 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur px-5 py-4 flex items-center gap-5">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl">{seated}</span>
          <span className="text-muted-foreground text-sm">of {total} guests seated</span>
          {done && <span className="ml-auto text-sm text-primary inline-flex items-center gap-1"><CheckCircle2 size={14}/>All set</span>}
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }}/>
        </div>
      </div>
      {conflicts > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-destructive whitespace-nowrap">
          <AlertTriangle size={14}/>{conflicts} to review
        </div>
      )}
    </div>
  );
}