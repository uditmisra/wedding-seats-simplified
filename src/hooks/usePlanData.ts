import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Plan, Guest, TableDef, Assignment, ConstraintDef } from "@/lib/types";

export function usePlanData(code: string | undefined) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<TableDef[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [constraints, setConstraints] = useState<ConstraintDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadAll = useCallback(async (planId: string) => {
    const [g, t, a, c] = await Promise.all([
      supabase.from("guests").select("*").eq("plan_id", planId).order("name"),
      supabase.from("tables_def").select("*").eq("plan_id", planId).order("name"),
      supabase.from("assignments").select("*").eq("plan_id", planId),
      supabase.from("constraints_def").select("*").eq("plan_id", planId),
    ]);
    setGuests((g.data ?? []) as Guest[]);
    setTables((t.data ?? []) as TableDef[]);
    setAssignments((a.data ?? []) as Assignment[]);
    setConstraints((c.data ?? []) as ConstraintDef[]);
  }, []);

  useEffect(() => {
    if (!code) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("plans").select("*").eq("code", code).maybeSingle();
      if (!active) return;
      if (!data) { setNotFound(true); setLoading(false); return; }
      setPlan(data as Plan);
      await loadAll(data.id);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [code, loadAll]);

  // Realtime: subscribe to changes for this plan
  useEffect(() => {
    if (!plan) return;
    const ch = supabase
      .channel(`plan-${plan.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "guests", filter: `plan_id=eq.${plan.id}` }, () => loadAll(plan.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "tables_def", filter: `plan_id=eq.${plan.id}` }, () => loadAll(plan.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments", filter: `plan_id=eq.${plan.id}` }, () => loadAll(plan.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "constraints_def", filter: `plan_id=eq.${plan.id}` }, () => loadAll(plan.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [plan, loadAll]);

  const refresh = useCallback(() => { if (plan) return loadAll(plan.id); }, [plan, loadAll]);

  return { plan, setPlan, guests, tables, assignments, constraints, loading, notFound, refresh };
}