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

  const loadAll = useCallback(async (planCode: string, scnId: string | null) => {
    const { data, error } = await supabase.rpc("get_plan_snapshot", { _code: planCode });
    if (error || !data) return;
    const snap = data as unknown as {
      scenarios: Scenario[]; guests: Guest[];
      tables: TableDef[]; assignments: Assignment[]; constraints: ConstraintDef[];
    };
    setGuests(snap.guests ?? []);
    setScenarios(snap.scenarios ?? []);
    const tables = snap.tables ?? [];
    const assigns = snap.assignments ?? [];
    setTables(scnId ? tables.filter(t => t.scenario_id === scnId) : tables);
    setAssignments(scnId ? assigns.filter(a => a.scenario_id === scnId) : assigns);
    setConstraints(snap.constraints ?? []);
  }, []);

  useEffect(() => {
    if (!code) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data: snap } = await supabase.rpc("get_plan_snapshot", { _code: code });
      if (!active) return;
      if (!snap) { setNotFound(true); setLoading(false); return; }
      const s = snap as unknown as {
        plan: Plan; scenarios: Scenario[]; guests: Guest[];
        tables: TableDef[]; assignments: Assignment[]; constraints: ConstraintDef[];
      };
      setPlan(s.plan);
      const list = s.scenarios ?? [];
      const stored = typeof window !== "undefined" ? localStorage.getItem(`plan:${s.plan.id}:activeScenario`) : null;
      let chosen =
        (stored && list.find(x => x.id === stored)) ||
        list.find(x => x.is_default) ||
        list[0];
      if (!chosen) {
        const { data: created } = await supabase.from("scenarios").insert({ plan_id: s.plan.id, name: "Default", is_default: true }).select().single();
        chosen = created as Scenario;
      }
      setScenarioIdState(chosen?.id ?? null);
      // Hydrate from snapshot we already have
      setScenarios(list);
      setGuests(s.guests ?? []);
      const tables = s.tables ?? [];
      const assigns = s.assignments ?? [];
      setTables(chosen?.id ? tables.filter(t => t.scenario_id === chosen!.id) : tables);
      setAssignments(chosen?.id ? assigns.filter(a => a.scenario_id === chosen!.id) : assigns);
      setConstraints(s.constraints ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [code, loadAll]);

  // Realtime: subscribe to changes for this plan.
  // Debounce the reload so rapid DELETE + INSERT sequences (e.g. auto-assign)
  // collapse into a single fetch rather than briefly showing an empty state.
  useEffect(() => {
    if (!plan || !code) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const reload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => loadAll(code, scenarioId), 350);
    };
    const ch = supabase
      .channel(`plan-${plan.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "guests", filter: `plan_id=eq.${plan.id}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "tables_def", filter: `plan_id=eq.${plan.id}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments", filter: `plan_id=eq.${plan.id}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "constraints_def", filter: `plan_id=eq.${plan.id}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "scenarios", filter: `plan_id=eq.${plan.id}` }, reload)
      .subscribe();
    return () => { if (timer) clearTimeout(timer); supabase.removeChannel(ch); };
  }, [plan, code, scenarioId, loadAll]);

  const refresh = useCallback(() => { if (code) return loadAll(code, scenarioId); }, [code, scenarioId, loadAll]);

  const setScenarioId = useCallback((id: string | null) => {
    setScenarioIdState(id);
    if (plan && code) {
      if (typeof window !== "undefined") {
        if (id) localStorage.setItem(`plan:${plan.id}:activeScenario`, id);
        else localStorage.removeItem(`plan:${plan.id}:activeScenario`);
      }
      loadAll(code, id);
    }
  }, [plan, code, loadAll]);

  return { plan, setPlan, scenarios, scenarioId, setScenarioId, guests, tables, assignments, setAssignments, constraints, loading, notFound, refresh };
}