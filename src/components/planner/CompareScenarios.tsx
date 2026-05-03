import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Scenario, TableDef, Assignment, ConstraintDef, Guest } from "@/lib/types";
import { FloorPlan } from "./FloorPlan";
import { tableConflicts } from "@/lib/seating";

interface Props {
  scenarios: Scenario[];
  currentScenarioId: string | null;
  currentTables: TableDef[];
  currentAssignments: Assignment[];
  guests: Guest[];
  constraints: ConstraintDef[];
}

export function CompareScenarios({ scenarios, currentScenarioId, currentTables, currentAssignments, guests, constraints }: Props) {
  const others = scenarios.filter(s => s.id !== currentScenarioId);
  const [otherId, setOtherId] = useState<string | null>(others[0]?.id ?? null);
  const [otherTables, setOtherTables] = useState<TableDef[]>([]);
  const [otherAssignments, setOtherAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    if (!otherId) { setOtherTables([]); setOtherAssignments([]); return; }
    (async () => {
      const [t, a] = await Promise.all([
        supabase.from("tables_def").select("*").eq("scenario_id", otherId),
        supabase.from("assignments").select("*").eq("scenario_id", otherId),
      ]);
      setOtherTables((t.data ?? []) as TableDef[]);
      setOtherAssignments((a.data ?? []) as Assignment[]);
    })();
  }, [otherId]);

  if (scenarios.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-10 text-center text-muted-foreground">
        Create a second scenario to compare layouts side by side.
      </div>
    );
  }

  const current = scenarios.find(s => s.id === currentScenarioId);
  const other = scenarios.find(s => s.id === otherId);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 items-center text-sm">
        <Header label="Current" name={current?.name ?? "—"} tables={currentTables} assignments={currentAssignments} constraints={constraints}/>
        <span className="text-muted-foreground">vs</span>
        <div className="flex items-center gap-2">
          <select
            value={otherId ?? ""}
            onChange={e => setOtherId(e.target.value || null)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            {others.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {other && <Stats tables={otherTables} assignments={otherAssignments} constraints={constraints}/>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title={current?.name ?? "Current"}>
          <FloorPlan tables={currentTables} assignments={currentAssignments} guests={guests} constraints={constraints}/>
        </Panel>
        <Panel title={other?.name ?? "—"}>
          <FloorPlan tables={otherTables} assignments={otherAssignments} guests={guests} constraints={constraints}/>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="font-display text-lg px-1">{title}</div>
      {children}
    </div>
  );
}

function Header({ label, name, tables, assignments, constraints }: { label: string; name: string; tables: TableDef[]; assignments: Assignment[]; constraints: ConstraintDef[] }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-medium">{name}</span>
      <Stats tables={tables} assignments={assignments} constraints={constraints}/>
    </div>
  );
}

function Stats({ tables, assignments, constraints }: { tables: TableDef[]; assignments: Assignment[]; constraints: ConstraintDef[] }) {
  const seated = assignments.length;
  const capacity = tables.reduce((s, t) => s + t.capacity, 0);
  const conflicts = tables.reduce((sum, t) => sum + (tableConflicts(t.id, assignments, constraints).length > 0 ? 1 : 0), 0);
  return (
    <span className="text-xs text-muted-foreground">
      {tables.length} tables · {seated}/{capacity} seated{conflicts ? ` · ${conflicts} conflicts` : ""}
    </span>
  );
}