import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Scenario, TableDef, Assignment, ConstraintDef, Guest } from "@/lib/types";
import { FloorPlan } from "./FloorPlan";
import { tableConflicts } from "@/lib/seating";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, ArrowRight, ArrowLeft, Plus, Minus, Pencil, Equal } from "lucide-react";
import { toast } from "sonner";

interface Props {
  scenarios: Scenario[];
  currentScenarioId: string | null;
  currentTables: TableDef[];
  currentAssignments: Assignment[];
  guests: Guest[];
  constraints: ConstraintDef[];
}

type DiffKind = "added" | "removed" | "changed" | "same";
interface Row {
  key: string; // table name (match key)
  left?: TableDef;
  right?: TableDef;
  leftSeats: number;
  rightSeats: number;
  kind: DiffKind;
  changes: string[];
}

export function CompareScenarios({ scenarios, currentScenarioId, currentTables, currentAssignments, guests, constraints }: Props) {
  const others = scenarios.filter(s => s.id !== currentScenarioId);
  const [otherId, setOtherId] = useState<string | null>(others[0]?.id ?? null);
  const [otherTables, setOtherTables] = useState<TableDef[]>([]);
  const [otherAssignments, setOtherAssignments] = useState<Assignment[]>([]);
  const [busy, setBusy] = useState(false);

  const reloadOther = async () => {
    if (!otherId) { setOtherTables([]); setOtherAssignments([]); return; }
    const [t, a] = await Promise.all([
      supabase.from("tables_def").select("*").eq("scenario_id", otherId),
      supabase.from("assignments").select("*").eq("scenario_id", otherId),
    ]);
    setOtherTables((t.data ?? []) as TableDef[]);
    setOtherAssignments((a.data ?? []) as Assignment[]);
  };

  useEffect(() => { reloadOther(); /* eslint-disable-next-line */ }, [otherId]);

  const rows: Row[] = useMemo(() => {
    const byKey = new Map<string, Row>();
    const seatsLeft = (id: string) => currentAssignments.filter(a => a.table_id === id).length;
    const seatsRight = (id: string) => otherAssignments.filter(a => a.table_id === id).length;
    for (const t of currentTables) {
      const k = t.name.trim().toLowerCase() || t.id;
      byKey.set(k, { key: k, left: t, leftSeats: seatsLeft(t.id), rightSeats: 0, kind: "removed", changes: [] });
    }
    for (const t of otherTables) {
      const k = t.name.trim().toLowerCase() || t.id;
      const ex = byKey.get(k);
      if (ex && ex.left) {
        ex.right = t;
        ex.rightSeats = seatsRight(t.id);
        const changes: string[] = [];
        if (ex.left.capacity !== t.capacity) changes.push(`capacity ${ex.left.capacity}→${t.capacity}`);
        if (ex.left.shape !== t.shape) changes.push(`shape ${ex.left.shape}→${t.shape}`);
        if (Math.round(ex.left.x) !== Math.round(t.x) || Math.round(ex.left.y) !== Math.round(t.y)) changes.push("position");
        if (Math.round(ex.left.rotation) !== Math.round(t.rotation)) changes.push("rotation");
        if (ex.leftSeats !== ex.rightSeats) changes.push(`seated ${ex.leftSeats}→${ex.rightSeats}`);
        ex.changes = changes;
        ex.kind = changes.length ? "changed" : "same";
      } else {
        byKey.set(k, { key: k, right: t, leftSeats: 0, rightSeats: seatsRight(t.id), kind: "added", changes: [] });
      }
    }
    return Array.from(byKey.values()).sort((a, b) => {
      const order = { changed: 0, added: 1, removed: 2, same: 3 } as const;
      if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind];
      return (a.left?.name ?? a.right?.name ?? "").localeCompare(b.left?.name ?? b.right?.name ?? "");
    });
  }, [currentTables, otherTables, currentAssignments, otherAssignments]);

  const leftHighlights = useMemo(() => {
    const m = new Map<string, "added" | "removed" | "changed">();
    for (const r of rows) {
      if (!r.left) continue;
      if (r.kind === "removed") m.set(r.left.id, "removed");
      else if (r.kind === "changed") m.set(r.left.id, "changed");
    }
    return m;
  }, [rows]);

  const rightHighlights = useMemo(() => {
    const m = new Map<string, "added" | "removed" | "changed">();
    for (const r of rows) {
      if (!r.right) continue;
      if (r.kind === "added") m.set(r.right.id, "added");
      else if (r.kind === "changed") m.set(r.right.id, "changed");
    }
    return m;
  }, [rows]);

  if (scenarios.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-10 text-center text-muted-foreground">
        Create a second layout to compare them side by side.
      </div>
    );
  }

  const current = scenarios.find(s => s.id === currentScenarioId);
  const other = scenarios.find(s => s.id === otherId);
  const planId = current?.plan_id ?? other?.plan_id;

  /**
   * Copy a table from one scenario to another. If it already exists (matched by
   * name) we update it in place; otherwise we insert. We also overwrite seating
   * for that table on the destination side, mapping guest IDs (which are global
   * to the plan).
   */
  const copyTable = async (row: Row, direction: "toRight" | "toLeft") => {
    if (!planId || !currentScenarioId || !otherId) return;
    setBusy(true);
    try {
      const src = direction === "toRight" ? row.left : row.right;
      const dst = direction === "toRight" ? row.right : row.left;
      const dstScenario = direction === "toRight" ? otherId : currentScenarioId;
      const srcAssigns = direction === "toRight" ? currentAssignments : otherAssignments;
      if (!src) return;

      let dstTableId: string;
      const payload = {
        plan_id: planId, scenario_id: dstScenario,
        name: src.name, capacity: src.capacity, shape: src.shape,
        x: src.x, y: src.y, rotation: src.rotation,
      };
      if (dst) {
        await supabase.from("tables_def").update(payload).eq("id", dst.id);
        dstTableId = dst.id;
        await supabase.from("assignments").delete().eq("table_id", dst.id).eq("scenario_id", dstScenario);
      } else {
        const { data } = await supabase.from("tables_def").insert(payload).select().single();
        if (!data) throw new Error("insert failed");
        dstTableId = data.id;
      }

      const seatRows = srcAssigns
        .filter(a => a.table_id === src.id)
        .map(a => ({
          plan_id: planId, scenario_id: dstScenario,
          guest_id: a.guest_id, table_id: dstTableId,
          pinned: a.pinned, seat_index: a.seat_index ?? null,
        }));
      // Avoid duplicate-guest assignments on the destination scenario
      if (seatRows.length) {
        const guestIds = seatRows.map(r => r.guest_id);
        await supabase.from("assignments").delete().eq("scenario_id", dstScenario).in("guest_id", guestIds);
        await supabase.from("assignments").insert(seatRows);
      }

      toast.success(`Copied "${src.name}" ${direction === "toRight" ? "→" : "←"}`);
      await reloadOther();
      // current side will refresh via realtime in usePlanData
    } catch (e: any) {
      toast.error(e.message ?? "Copy failed");
    } finally {
      setBusy(false);
    }
  };

  const removeTable = async (row: Row, side: "left" | "right") => {
    const t = side === "left" ? row.left : row.right;
    if (!t) return;
    if (!confirm(`Remove "${t.name}" from ${side === "left" ? current?.name : other?.name}?`)) return;
    await supabase.from("tables_def").delete().eq("id", t.id);
    toast.success("Removed");
    await reloadOther();
  };

  const summary = {
    added: rows.filter(r => r.kind === "added").length,
    removed: rows.filter(r => r.kind === "removed").length,
    changed: rows.filter(r => r.kind === "changed").length,
    same: rows.filter(r => r.kind === "same").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center text-sm">
        <Header label="Left" name={current?.name ?? "—"} tables={currentTables} assignments={currentAssignments} constraints={constraints}/>
        <ArrowLeftRight size={14} className="text-muted-foreground"/>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Right</span>
          <select
            value={otherId ?? ""}
            onChange={e => setOtherId(e.target.value || null)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm font-medium"
          >
            {others.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {other && <Stats tables={otherTables} assignments={otherAssignments} constraints={constraints}/>}
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <Legend color="hsl(var(--primary))" label={`${summary.changed} changed`}/>
          <Legend color="hsl(var(--sage))" label={`${summary.added} added`}/>
          <Legend color="hsl(var(--muted-foreground))" dashed label={`${summary.removed} removed`}/>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title={current?.name ?? "Current"}>
          <FloorPlan tables={currentTables} assignments={currentAssignments} guests={guests} constraints={constraints} highlights={leftHighlights}/>
        </Panel>
        <Panel title={other?.name ?? "—"}>
          <FloorPlan tables={otherTables} assignments={otherAssignments} guests={guests} constraints={constraints} highlights={rightHighlights}/>
        </Panel>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
          <div className="font-display text-base">Table-by-table diff</div>
          <div className="text-xs text-muted-foreground">Tables matched by name. Use the arrows to copy a change to the other layout.</div>
        </div>
        <div className="divide-y divide-border/60">
          {rows.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">No tables in either layout yet.</div>
          )}
          {rows.map(r => <DiffRow key={r.key} row={r} onCopy={copyTable} onDelete={removeTable} busy={busy}/>)}
        </div>
      </div>
    </div>
  );
}

function DiffRow({ row, onCopy, onDelete, busy }: {
  row: Row;
  onCopy: (r: Row, dir: "toRight" | "toLeft") => void;
  onDelete: (r: Row, side: "left" | "right") => void;
  busy: boolean;
}) {
  const name = row.left?.name ?? row.right?.name ?? row.key;
  const badge = row.kind === "added" ? { text: "Only on right", color: "text-sage", icon: Plus }
              : row.kind === "removed" ? { text: "Only on left", color: "text-muted-foreground", icon: Minus }
              : row.kind === "changed" ? { text: "Different", color: "text-primary", icon: Pencil }
              : { text: "Identical", color: "text-muted-foreground", icon: Equal };
  const Icon = badge.icon;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center px-4 py-3">
      {/* Left side */}
      <div className="min-w-0">
        {row.left ? (
          <SideCell t={row.left} seats={row.leftSeats} onDelete={() => onDelete(row, "left")} kind={row.kind === "removed" ? "removed" : row.kind === "changed" ? "changed" : "same"}/>
        ) : (
          <div className="text-sm text-muted-foreground italic">— not present —</div>
        )}
      </div>

      {/* Center: action + label */}
      <div className="flex flex-col items-center gap-1.5 min-w-[180px]">
        <div className={`flex items-center gap-1.5 text-xs font-medium ${badge.color}`}>
          <Icon size={12}/> {badge.text}
        </div>
        <div className="font-display text-sm truncate max-w-[180px]" title={name}>{name}</div>
        {row.kind === "changed" && row.changes.length > 0 && (
          <div className="text-[10px] text-muted-foreground text-center leading-tight">{row.changes.join(" · ")}</div>
        )}
        <div className="flex items-center gap-1 mt-0.5">
          {row.left && row.kind !== "same" && (
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={busy} onClick={() => onCopy(row, "toRight")} title="Copy left → right">
              <ArrowRight size={12} className="mr-1"/>Copy →
            </Button>
          )}
          {row.right && row.kind !== "same" && (
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={busy} onClick={() => onCopy(row, "toLeft")} title="Copy right → left">
              <ArrowLeft size={12} className="mr-1"/>← Copy
            </Button>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="min-w-0">
        {row.right ? (
          <SideCell t={row.right} seats={row.rightSeats} onDelete={() => onDelete(row, "right")} kind={row.kind === "added" ? "added" : row.kind === "changed" ? "changed" : "same"}/>
        ) : (
          <div className="text-sm text-muted-foreground italic">— not present —</div>
        )}
      </div>
    </div>
  );
}

function SideCell({ t, seats, onDelete, kind }: { t: TableDef; seats: number; onDelete: () => void; kind: "added" | "removed" | "changed" | "same" }) {
  const accent =
    kind === "added" ? "border-l-sage" :
    kind === "removed" ? "border-l-muted-foreground/50" :
    kind === "changed" ? "border-l-primary" :
    "border-l-transparent";
  return (
    <div className={`flex items-center justify-between gap-2 rounded-md border-l-2 ${accent} pl-3 pr-1 py-1`}>
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{t.name}</div>
        <div className="text-[11px] text-muted-foreground">
          {t.shape} · {seats}/{t.capacity} seated · ({Math.round(t.x)},{Math.round(t.y)})
        </div>
      </div>
      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-destructive" onClick={onDelete}>
        Remove
      </Button>
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

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block w-3 h-3 rounded-sm"
        style={{ border: `2px ${dashed ? "dashed" : "solid"} ${color}` }}
      />
      {label}
    </span>
  );
}
