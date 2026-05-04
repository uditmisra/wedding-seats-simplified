import type { Guest, TableDef, Assignment, ConstraintDef } from "@/lib/types";
import { tableConflicts, unmetMustWith } from "@/lib/seating";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface Props {
  guests: Guest[];
  tables: TableDef[];
  assignments: Assignment[];
  constraints: ConstraintDef[];
}

/** Calm, flat progress strip — one number that matters. */
export function StatsBar({ guests, tables, assignments, constraints }: Props) {
  const expected = guests.filter(g => g.rsvp !== "declined");
  const expectedIds = new Set(expected.map(g => g.id));
  const total = expected.length;
  const seated = assignments.filter(a => expectedIds.has(a.guest_id)).length;
  const conflicts = tables.flatMap(t => tableConflicts(t.id, assignments, constraints)).length + unmetMustWith(assignments, constraints).length;
  const pct = total ? Math.round((seated / total) * 100) : 0;
  const done = total > 0 && seated === total && conflicts === 0;

  return (
    <div className="flex items-end gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-4xl md:text-5xl tabular-nums leading-none text-foreground">{seated}</span>
          <span className="text-soft text-sm">of {total} seated</span>
        </div>
        <div className="mt-3 h-px bg-hairline relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-primary transition-all duration-500" style={{ width: `${pct}%`, height: "2px", top: "-0.5px" }}/>
        </div>
      </div>
      <div className="flex items-center gap-3 pb-1">
        {done && (
          <span className="inline-flex items-center gap-1.5 text-sm text-sage">
            <CheckCircle2 size={14}/> Complete
          </span>
        )}
        {conflicts > 0 && (
          <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
            <AlertTriangle size={14}/> {conflicts} to review
          </span>
        )}
      </div>
    </div>
  );
}
