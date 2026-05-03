import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Plan, Guest, TableDef, Assignment, ConstraintDef, Scenario } from "@/lib/types";

export function usePlanData(code: string | undefined) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioId, setScenarioIdState] = useState<string | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<TableDef[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [constraints, setConstraints] = useState<ConstraintDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadAll = useCallback(async (planId: string, scnId: string | null) => {
    const tablesQ = supabase.from("tables_def").select("*").eq("plan_id", planId).order("name");
    const assignsQ = supabase.from("assignments").select("*").eq("plan_id", planId);
    const [g, s, t, a, c] = await Promise.all([
      supabase.from("guests").select("*").eq("plan_id", planId).order("name"),
      supabase.from("scenarios").select("*").eq("plan_id", planId).order("created_at"),
      scnId ? tablesQ.eq("scenario_id", scnId) : tablesQ,
      scnId ? assignsQ.eq("scenario_id", scnId) : assignsQ,
      supabase.from("constraints_def").select("*").eq("plan_id", planId),
    ]);
    setGuests((g.data ?? []) as Guest[]);
    setScenarios((s.data ?? []) as Scenario[]);
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
      // Pick default scenario (or first)
      const { data: scns } = await supabase.from("scenarios").select("*").eq("plan_id", data.id).order("created_at");
      let chosen = (scns ?? []).find(s => s.is_default) ?? (scns ?? [])[0];
      if (!chosen) {
        const { data: created } = await supabase.from("scenarios").insert({ plan_id: data.id, name: "Default", is_default: true }).select().single();
        chosen = created as Scenario;
      }
      setScenarioIdState(chosen?.id ?? null);
      await loadAll(data.id, chosen?.id ?? null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [code, loadAll]);

  // Realtime: subscribe to changes for this plan
  useEffect(() => {
    if (!plan) return;
    const reload = () => loadAll(plan.id, scenarioId);
    const ch = supabase
      .channel(`plan-${plan.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "guests", filter: `plan_id=eq.${plan.id}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "tables_def", filter: `plan_id=eq.${plan.id}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments", filter: `plan_id=eq.${plan.id}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "constraints_def", filter: `plan_id=eq.${plan.id}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "scenarios", filter: `plan_id=eq.${plan.id}` }, reload)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [plan, scenarioId, loadAll]);

  const refresh = useCallback(() => { if (plan) return loadAll(plan.id, scenarioId); }, [plan, scenarioId, loadAll]);

  const setScenarioId = useCallback((id: string | null) => {
    setScenarioIdState(id);
    if (plan) loadAll(plan.id, id);
  }, [plan, loadAll]);

  return { plan, setPlan, scenarios, scenarioId, setScenarioId, guests, tables, assignments, constraints, loading, notFound, refresh };
}