import type { Guest, TableDef, Assignment, ConstraintDef } from "@/lib/types";
import { tableConflicts, unmetMustWith } from "@/lib/seating";
import { Users, Utensils, LayoutGrid, AlertTriangle } from "lucide-react";

interface Props {
  guests: Guest[];
  tables: TableDef[];
  assignments: Assignment[];
  constraints: ConstraintDef[];
}

export function StatsBar({ guests, tables, assignments, constraints }: Props) {
  const attending = guests.filter(g => g.rsvp === "attending").length;
  const declined = guests.filter(g => g.rsvp === "declined").length;
  const pending = guests.filter(g => g.rsvp === "pending").length;
  const totalCapacity = tables.reduce((s, t) => s + t.capacity, 0);
  const seatedAttending = assignments.filter(a => guests.find(g => g.id === a.guest_id)?.rsvp === "attending").length;
  const conflicts = tables.flatMap(t => tableConflicts(t.id, assignments, constraints)).length + unmetMustWith(assignments, constraints).length;

  const items = [
    { icon: Users, label: "Attending", value: `${attending}`, sub: `${pending} pending · ${declined} declined` },
    { icon: LayoutGrid, label: "Seated", value: `${seatedAttending} / ${attending}`, sub: `${tables.length} tables · ${totalCapacity} seats` },
    { icon: Utensils, label: "Meals", value: mealSummary(guests), sub: "for caterer" },
    { icon: AlertTriangle, label: "Conflicts", value: `${conflicts}`, sub: conflicts ? "review constraints" : "all clear", warn: conflicts > 0 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it, i) => (
        <div key={i} className={`rounded-xl border bg-card p-4 ${it.warn ? "border-destructive/40" : "border-border/60"}`}>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <it.icon size={14}/>{it.label}
          </div>
          <div className={`mt-1 font-display text-2xl ${it.warn ? "text-destructive" : ""}`}>{it.value}</div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">{it.sub}</div>
        </div>
      ))}
    </div>
  );
}

function mealSummary(guests: Guest[]) {
  const counts = new Map<string, number>();
  for (const g of guests) {
    if (g.rsvp !== "attending") continue;
    const k = (g.meal || "—").toLowerCase();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
  if (!top.length) return "—";
  return top.map(([k, v]) => `${v} ${k}`).join(", ");
}