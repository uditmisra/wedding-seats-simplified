import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { autoAssign, tableConflicts } from "@/lib/seating";
import { supabase } from "@/integrations/supabase/client";
import type { Guest, TableDef, Assignment, ConstraintDef } from "@/lib/types";
import { toast } from "sonner";
import { AlertTriangle, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { analytics } from "@/lib/analytics";
import type { AssignmentUndo } from "@/hooks/useAssignmentUndo";

interface Props {
  planId: string;
  scenarioId: string;
  guests: Guest[];
  tables: TableDef[];
  assignments: Assignment[];
  setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
  constraints: ConstraintDef[];
  onClose: () => void;
  /** Demo mode — skip Supabase writes; setAssignments is the only persistence. */
  demoMode?: boolean;
  /** Shared undo stack — auto-assign is the highest-stakes mutation to walk back. */
  undoApi?: AssignmentUndo;
}

interface TableRow {
  table: TableDef;
  guestList: Guest[];
  conflicts: ConstraintDef[];
}

export function AutoAssignDialog({ planId, scenarioId, guests, tables, assignments, setAssignments, constraints, onClose, demoMode = false, undoApi }: Props) {
  const [includeMaybe, setIncludeMaybe] = useState(false);
  const [keepExisting, setKeepExisting] = useState(true);
  const [preview, setPreview] = useState<Map<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const compute = () => {
    const result = autoAssign(guests, tables, assignments, constraints, { includeMaybe, respectPinned: keepExisting });
    if (keepExisting) {
      for (const a of assignments) if (!result.has(a.guest_id)) result.set(a.guest_id, a.table_id);
    }
    setPreview(result);

    // Build synthetic assignments to detect conflicts, then auto-expand flagged tables
    const synthetic: Assignment[] = [...result.entries()].map(([guest_id, table_id]) => ({
      id: guest_id, plan_id: planId, scenario_id: scenarioId, guest_id, table_id, seat_index: null, pinned: false,
    }));
    const toExpand = new Set<string>();
    for (const t of tables) {
      if (tableConflicts(t.id, synthetic, constraints).length > 0) toExpand.add(t.id);
    }
    setExpanded(toExpand);
  };

  const tableRows = useMemo<TableRow[]>(() => {
    if (!preview) return [];
    const guestMap = new Map(guests.map(g => [g.id, g]));
    const synthetic: Assignment[] = [...preview.entries()].map(([guest_id, table_id]) => ({
      id: guest_id, plan_id: planId, scenario_id: scenarioId, guest_id, table_id, seat_index: null, pinned: false,
    }));
    return tables
      .map(t => {
        const guestList = [...preview.entries()]
          .filter(([, tid]) => tid === t.id)
          .map(([gid]) => guestMap.get(gid)!)
          .filter(Boolean);
        const conflicts = tableConflicts(t.id, synthetic, constraints);
        return { table: t, guestList, conflicts };
      })
      .filter(r => r.guestList.length > 0)
      .sort((a, b) => b.conflicts.length - a.conflicts.length || b.guestList.length - a.guestList.length);
  }, [preview, guests, tables, constraints, planId, scenarioId]);

  const apply = async () => {
    if (!preview) return;
    setLoading(true);
    undoApi?.snapshot(assignments);
    const pinnedIds = new Set(assignments.filter(a => a.pinned).map(a => a.guest_id));
    const rows = [...preview.entries()]
      .filter(([gid]) => !pinnedIds.has(gid))
      .map(([guest_id, table_id]) => ({ plan_id: planId, scenario_id: scenarioId, guest_id, table_id }));

    // Apply optimistically first — user sees the result before DB operations complete.
    // This also prevents the brief "empty seating" flash caused by the realtime
    // DELETE event firing before the INSERT lands.
    const optimistic: Assignment[] = [
      ...(keepExisting ? assignments.filter(a => a.pinned) : []),
      ...rows.map(r => ({ ...r, id: `opt-${r.guest_id}`, seat_index: null, pinned: false })),
    ];
    setAssignments(optimistic);

    if (!demoMode) {
      if (keepExisting) {
        await supabase.from("assignments").delete().eq("scenario_id", scenarioId).eq("pinned", false);
      } else {
        await supabase.from("assignments").delete().eq("scenario_id", scenarioId);
      }
      if (rows.length) await supabase.from("assignments").insert(rows);
    }
    setLoading(false);
    const eligibleCount = guests.filter(g => g.rsvp === "attending" || (includeMaybe && g.rsvp === "maybe")).length;
    try {
      localStorage.setItem(`plan:${planId}:autoAssignLast`, JSON.stringify({
        when: Date.now(), seated: rows.length + pinnedIds.size, total: eligibleCount, conflicts: 0,
      }));
    } catch {}
    analytics.autoAssignRun({ guestCount: rows.length });

    // Say who didn't fit, not just how many seated — "78 seated" with 4
    // missing reads as success until the couple counts chairs at midnight.
    const eligible = guests.filter(g => g.rsvp === "attending" || (includeMaybe && g.rsvp === "maybe"));
    const placedIds = new Set([
      ...preview.keys(),
      ...(keepExisting ? assignments.filter(a => a.pinned).map(a => a.guest_id) : []),
    ]);
    const unseated = eligible.filter(g => !placedIds.has(g.id));
    const unseatedNote = unseated.length === 0
      ? undefined
      : unseated.length <= 3
        ? `Couldn't fit ${unseated.map(g => g.name).join(", ")} — add seats or another table.`
        : `${unseated.length} guests couldn't fit (${unseated.slice(0, 2).map(g => g.name).join(", ")}…) — add seats or another table.`;

    toast.success(`Seated ${rows.length + (keepExisting ? pinnedIds.size : 0)} guests`, {
      description: unseatedNote,
      // Auto-assign rearranges everything at once — the Undo right here is
      // what makes it safe to try.
      action: undoApi ? { label: "Undo", onClick: () => void undoApi.undo() } : undefined,
      duration: unseatedNote ? 10000 : 8000,
    });
    onClose();
  };

  const toggle = (id: string) => setExpanded(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const eligible = guests.filter(g => g.rsvp === "attending" || (includeMaybe && g.rsvp === "maybe")).length;
  const seatedNow = preview ? preview.size : 0;
  const totalConflicts = tableRows.reduce((s, r) => s + r.conflicts.length, 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-terracotta" />
            Do a first pass for me
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-ink-2">
            Groups guests by party, keeps &ldquo;not near&rdquo; pairs apart, and never overflows a table. Preview before anything moves.
          </p>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={includeMaybe} onCheckedChange={v => { setIncludeMaybe(!!v); setPreview(null); }} />
            Save a seat for the maybes too
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={keepExisting} onCheckedChange={v => { setKeepExisting(!!v); setPreview(null); }} />
            Keep guests I&apos;ve already placed
          </label>

          <Button variant="outline" onClick={compute} className="w-full rounded-full">
            Preview the seating
          </Button>

          {preview && (
            <div className="space-y-2">
              {/* Summary bar */}
              <div className="flex items-center justify-between rounded-xl bg-paper-2/60 px-3 py-2">
                <span className="font-mono text-[11px] text-ink-3">
                  {seatedNow} of {eligible} seated across {tableRows.length} tables
                </span>
                {totalConflicts > 0 ? (
                  <span className="flex items-center gap-1 font-mono text-[11px] text-terracotta">
                    <AlertTriangle size={11} />
                    {totalConflicts} conflict{totalConflicts !== 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="font-mono text-[11px] text-olive">No conflicts</span>
                )}
              </div>

              {/* Table-by-table list */}
              <div className="max-h-[280px] divide-y divide-hairline-2 overflow-y-auto rounded-xl border hairline">
                {tableRows.map(row => {
                  const isOpen = expanded.has(row.table.id);
                  return (
                    <div key={row.table.id}>
                      <button
                        type="button"
                        onClick={() => toggle(row.table.id)}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-paper-2/40"
                      >
                        {isOpen
                          ? <ChevronDown size={12} className="shrink-0 text-ink-3" />
                          : <ChevronRight size={12} className="shrink-0 text-ink-3" />
                        }
                        <span className="flex-1 truncate font-display text-[14px]">{row.table.name}</span>
                        <span className="font-mono text-[10px] tabular-nums text-ink-3">
                          {row.guestList.length} / {row.table.capacity}
                        </span>
                        {row.conflicts.length > 0 && (
                          <span className="flex items-center gap-0.5 rounded-full bg-terracotta/10 px-1.5 py-0.5 font-mono text-[9px] text-terracotta">
                            <AlertTriangle size={9} />
                            {row.conflicts.length}
                          </span>
                        )}
                      </button>

                      {isOpen && (
                        <div className="bg-paper-2/30 px-4 pb-2.5 pt-0.5">
                          {row.guestList.map(g => (
                            <div key={g.id} className="py-[3px] font-mono text-[11px] text-ink-2">{g.name}</div>
                          ))}
                          {row.conflicts.map((c, i) => {
                            const ga = guests.find(g => g.id === c.guest_a);
                            const gb = guests.find(g => g.id === c.guest_b);
                            return (
                              <div key={i} className="mt-1 flex items-center gap-1 font-mono text-[10px] text-terracotta">
                                <AlertTriangle size={9} className="shrink-0" />
                                {ga?.name ?? "?"} &amp; {gb?.name ?? "?"} shouldn&apos;t sit together
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!preview || loading} onClick={apply}>
            Looks good — seat them
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
