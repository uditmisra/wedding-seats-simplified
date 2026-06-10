import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Assignment } from "@/lib/types";

const MAX_DEPTH = 20;

export interface AssignmentUndo {
  /** Capture the current assignments BEFORE a mutation. Cheap; call freely. */
  snapshot: (current: Assignment[]) => void;
  /** Restore the most recent snapshot — optimistic UI first, then the DB. */
  undo: () => Promise<void>;
}

/**
 * One shared undo stack for every seating mutation — drags, swaps, unseats,
 * and auto-assign. Lives above SeatingView and AutoAssignDialog so a single
 * Cmd+Z (or a toast's Undo button) walks back whatever just happened, however
 * it happened. Depth 20; restoring replaces the scenario's assignment rows
 * wholesale, which keeps it correct even after a bulk auto-assign.
 */
export function useAssignmentUndo(opts: {
  scenarioId: string | null;
  setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
  refresh: () => void;
  demoMode?: boolean;
}): AssignmentUndo {
  const stack = useRef<Assignment[][]>([]);
  const busy = useRef(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const snapshot = useCallback((current: Assignment[]) => {
    stack.current.push(current.map(a => ({ ...a })));
    if (stack.current.length > MAX_DEPTH) stack.current.shift();
  }, []);

  const undo = useCallback(async () => {
    if (busy.current) return;
    const snap = stack.current.pop();
    if (!snap) { toast("Nothing left to undo."); return; }
    const { scenarioId, setAssignments, refresh, demoMode } = optsRef.current;
    busy.current = true;
    setAssignments(snap);
    if (!demoMode && scenarioId) {
      await supabase.from("assignments").delete().eq("scenario_id", scenarioId);
      // Optimistic `opt-` ids never reached the DB with that id — strip them
      // so Postgres generates real ones; keep real ids so later snapshots
      // referencing the same rows stay coherent.
      const rows = snap.map(a => {
        const base = {
          plan_id: a.plan_id,
          scenario_id: a.scenario_id,
          guest_id: a.guest_id,
          table_id: a.table_id,
          seat_index: a.seat_index ?? null,
          pinned: a.pinned ?? false,
        };
        return a.id.startsWith("opt-") ? base : { ...base, id: a.id };
      });
      if (rows.length) {
        const { error } = await supabase.from("assignments").insert(rows);
        if (error) {
          toast.error("Couldn't undo — check your connection.");
          refresh();
          busy.current = false;
          return;
        }
      }
      refresh();
    }
    toast.success("Undone.");
    busy.current = false;
  }, []);

  return { snapshot, undo };
}
