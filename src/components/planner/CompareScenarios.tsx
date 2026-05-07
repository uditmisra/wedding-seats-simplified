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
      <div className="rounded-2xl border border-dashed hairline bg-paper-2/40 px-12 py-14 text-center">
        <p className="m-0 font-display text-[28px] leading-tight">
          Two <span className="font-display-italic">scenarios,</span> one winner.
        </p>
        <p className="mx-auto mt-3 max-w-sm text-[14px] text-ink-3 leading-relaxed">
          Try a second layout — round tables vs long, or a different head table position —
          then compare them here side by side.
        </p>
        <p className="mx-auto mt-4 max-w-sm font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
          ↑ Use the scenario selector above the tabs to create a new draft.
        </p>
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
    const scenarioName = side === "left" ? current?.name : other?.name;
    toast(`Remove "${t.name}" from ${scenarioName}?`, {
      action: {
        label: "Remove",
        onClick: async () => {
          await supabase.from("tables_def").delete().eq("id", t.id);
          await reloadOther();
        },
      },
    });
    return;
  };

  const summary = {
    added: rows.filter(r => r.kind === "added").length,
    removed: rows.filter(r => r.kind === "removed").length,
    changed: rows.filter(r => r.kind === "changed").length,
    same: rows.filter(r => r.kind === "same").length,
  };

  // Editorial observation — one short sentence pointing at the calmer plan.
  const observation = (() => {
    const leftStats = stats(currentTables, currentAssignments, constraints);
    const rightStats = stats(otherTables, otherAssignments, constraints);
    if (rightStats.conflicts < leftStats.conflicts) return `${other?.name ?? "Right"} is the calmer plan.`;
    if (leftStats.conflicts < rightStats.conflicts) return `${current?.name ?? "Left"} is the calmer plan.`;
    if (rightStats.seated > leftStats.seated) return `${other?.name ?? "Right"} seats more guests.`;
    if (leftStats.seated > rightStats.seated) return `${current?.name ?? "Left"} seats more guests.`;
    return `These two are basically twins.`;
  })();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="m-0 font-display text-2xl md:text-[28px]">
          A/B <span className="font-display-italic">scenarios.</span>
        </h2>
        <p className="mt-1 text-[14px] text-ink-3">
          Two layouts side by side. Promote the one that feels right.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ScenarioPanel
          tag="Live"
          name={current?.name ?? "Current"}
          tables={currentTables}
          assignments={currentAssignments}
          constraints={constraints}
        >
          <FloorPlan tables={currentTables} assignments={currentAssignments} guests={guests} constraints={constraints} highlights={leftHighlights}/>
        </ScenarioPanel>
        <ScenarioPanel
          tag="Draft"
          name={other?.name ?? "—"}
          tables={otherTables}
          assignments={otherAssignments}
          constraints={constraints}
          headerControls={
            <select
              value={otherId ?? ""}
              onChange={e => setOtherId(e.target.value || null)}
              className="h-7 rounded-full border-hairline border bg-paper px-2 text-[12px] font-medium hover:bg-paper-2"
            >
              {others.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          }
        >
          <FloorPlan tables={otherTables} assignments={otherAssignments} guests={guests} constraints={constraints} highlights={rightHighlights}/>
        </ScenarioPanel>
      </div>

      {/* Editorial diff strip */}
      <div className="rounded-2xl border hairline bg-paper-2/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="label-mono">What changed</span>
            <ArrowLeftRight size={11} className="text-ink-3" />
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em]">
            <DiffChip color="hsl(var(--olive))" label={`+${summary.added} added`} />
            <DiffChip color="hsl(var(--terracotta))" label={`${summary.changed} changed`} />
            <DiffChip color="hsl(var(--ink-4))" label={`-${summary.removed} removed`} dashed />
          </div>
        </div>
        <p className="m-0 mt-3 font-display-italic text-[16px] text-ink-2">
          {observation}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border hairline bg-paper">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b hairline px-5 py-3">
          <div className="font-display text-[18px]">Table-by-table diff</div>
          <div className="text-[12px] text-ink-3">Matched by name. Arrows copy a change to the other layout.</div>
        </div>
        <div className="divide-y divide-hairline-2">
          {rows.length === 0 && (
            <div className="p-6 text-center font-display-italic text-[14px] text-ink-3">Both layouts are empty.</div>
          )}
          {rows.map(r => <DiffRow key={r.key} row={r} onCopy={copyTable} onDelete={removeTable} busy={busy}/>)}
        </div>
      </div>
    </div>
  );
}

function stats(tables: TableDef[], assignments: Assignment[], constraints: ConstraintDef[]) {
  const seated = assignments.length;
  const capacity = tables.reduce((s, t) => s + t.capacity, 0);
  const conflicts = tables.reduce((sum, t) => sum + (tableConflicts(t.id, assignments, constraints).length > 0 ? 1 : 0), 0);
  return { seated, capacity, conflicts, count: tables.length };
}

function ScenarioPanel({
  tag,
  name,
  tables,
  assignments,
  constraints,
  headerControls,
  children,
}: {
  tag: "Live" | "Draft";
  name: string;
  tables: TableDef[];
  assignments: Assignment[];
  constraints: ConstraintDef[];
  headerControls?: React.ReactNode;
  children: React.ReactNode;
}) {
  const s = stats(tables, assignments, constraints);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 rounded-xl border hairline bg-paper px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${tag === "Live" ? "bg-olive text-paper" : "bg-paper-2 text-ink-3"}`}
          >
            {tag}
          </span>
          <span className="font-display text-[18px]">
            <span className="font-display-italic">{name}</span>
          </span>
          {headerControls}
        </div>
        <div className="hidden items-baseline gap-3 sm:flex">
          <Metric label="Tables" value={s.count} />
          <Metric label="Seated" value={s.seated} />
          {s.conflicts > 0 && <Metric label="Conflicts" value={s.conflicts} accent="terracotta" />}
        </div>
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: number; accent?: "olive" | "terracotta" }) {
  const color = accent === "terracotta" ? "text-terracotta" : "text-ink";
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={`font-display text-[20px] tabular-nums ${color}`}>{value}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">{label}</span>
    </span>
  );
}

function DiffChip({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-paper px-2 py-0.5"
      style={{ borderColor: color, borderStyle: dashed ? "dashed" : "solid" }}>
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      <span style={{ color }}>{label}</span>
    </span>
  );
}

function DiffRow({ row, onCopy, onDelete, busy }: {
  row: Row;
  onCopy: (r: Row, dir: "toRight" | "toLeft") => void;
  onDelete: (r: Row, side: "left" | "right") => void;
  busy: boolean;
}) {
  const name = row.left?.name ?? row.right?.name ?? row.key;
  const badge = row.kind === "added" ? { text: "Only on right", color: "text-olive", icon: Plus }
              : row.kind === "removed" ? { text: "Only on left", color: "text-ink-3", icon: Minus }
              : row.kind === "changed" ? { text: "Different", color: "text-terracotta", icon: Pencil }
              : { text: "Identical", color: "text-ink-3", icon: Equal };
  const Icon = badge.icon;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center px-4 py-3">
      {/* Left side */}
      <div className="min-w-0">
        {row.left ? (
          <SideCell t={row.left} seats={row.leftSeats} onDelete={() => onDelete(row, "left")} kind={row.kind === "removed" ? "removed" : row.kind === "changed" ? "changed" : "same"}/>
        ) : (
          <div className="text-[13px] text-ink-3 font-display-italic">— not present —</div>
        )}
      </div>

      {/* Center: action + label */}
      <div className="flex flex-col items-center gap-1.5 min-w-[180px]">
        <div className={`flex items-center gap-1.5 text-xs font-medium ${badge.color}`}>
          <Icon size={12}/> {badge.text}
        </div>
        <div className="font-display text-sm truncate max-w-[180px]" title={name}>{name}</div>
        {row.kind === "changed" && row.changes.length > 0 && (
          <div className="text-[10px] text-ink-3 text-center leading-tight">{row.changes.join(" · ")}</div>
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
          <div className="text-[13px] text-ink-3 font-display-italic">— not present —</div>
        )}
      </div>
    </div>
  );
}

function SideCell({ t, seats, onDelete, kind }: { t: TableDef; seats: number; onDelete: () => void; kind: "added" | "removed" | "changed" | "same" }) {
  const borderColor =
    kind === "added" ? "hsl(var(--olive))" :
    kind === "removed" ? "hsl(var(--ink-4))" :
    kind === "changed" ? "hsl(var(--terracotta))" :
    "transparent";
  return (
    <div className="flex items-center justify-between gap-2 rounded-md pl-3 pr-1 py-1" style={{ borderLeft: `2px solid ${borderColor}` }}>
      <div className="min-w-0">
        <div className="text-[13px] font-medium truncate">{t.name}</div>
        <div className="text-[11px] text-ink-3">
          {t.shape} · {seats}/{t.capacity} seated
        </div>
      </div>
      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[11px] text-ink-3 hover:text-rose" onClick={onDelete}>
        Remove
      </Button>
    </div>
  );
}

