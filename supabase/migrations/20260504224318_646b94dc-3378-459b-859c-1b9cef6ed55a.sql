
-- Drop overly-permissive public SELECT policies on plan data tables
DROP POLICY IF EXISTS "anyone can read guests" ON public.guests;
DROP POLICY IF EXISTS "anyone can read tables" ON public.tables_def;
DROP POLICY IF EXISTS "anyone can read assignments" ON public.assignments;
DROP POLICY IF EXISTS "anyone can read constraints" ON public.constraints_def;
DROP POLICY IF EXISTS "anyone can read scenarios" ON public.scenarios;

-- Editors retain direct SELECT access on each data table
CREATE POLICY "editors can read guests" ON public.guests
  FOR SELECT TO authenticated USING (public.is_plan_editor(plan_id, auth.uid()));

CREATE POLICY "editors can read tables" ON public.tables_def
  FOR SELECT TO authenticated USING (public.is_plan_editor(plan_id, auth.uid()));

CREATE POLICY "editors can read assignments" ON public.assignments
  FOR SELECT TO authenticated USING (public.is_plan_editor(plan_id, auth.uid()));

CREATE POLICY "editors can read constraints" ON public.constraints_def
  FOR SELECT TO authenticated USING (public.is_plan_editor(plan_id, auth.uid()));

CREATE POLICY "editors can read scenarios" ON public.scenarios
  FOR SELECT TO authenticated USING (public.is_plan_editor(plan_id, auth.uid()));

-- Snapshot RPC: anonymous viewers (and editors) load plan data only by knowing the plan code.
-- This prevents enumeration of all guests across plans.
CREATE OR REPLACE FUNCTION public.get_plan_snapshot(_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.plans;
  v_scenarios jsonb;
  v_guests jsonb;
  v_tables jsonb;
  v_assignments jsonb;
  v_constraints jsonb;
BEGIN
  IF _code IS NULL OR length(_code) < 3 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_plan FROM public.plans WHERE code = _code;
  IF v_plan.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.created_at), '[]'::jsonb)
    INTO v_scenarios FROM public.scenarios s WHERE s.plan_id = v_plan.id;

  SELECT COALESCE(jsonb_agg(to_jsonb(g) ORDER BY g.name), '[]'::jsonb)
    INTO v_guests FROM public.guests g WHERE g.plan_id = v_plan.id;

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.name), '[]'::jsonb)
    INTO v_tables FROM public.tables_def t WHERE t.plan_id = v_plan.id;

  SELECT COALESCE(jsonb_agg(to_jsonb(a)), '[]'::jsonb)
    INTO v_assignments FROM public.assignments a WHERE a.plan_id = v_plan.id;

  SELECT COALESCE(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
    INTO v_constraints FROM public.constraints_def c WHERE c.plan_id = v_plan.id;

  RETURN jsonb_build_object(
    'plan', to_jsonb(v_plan),
    'scenarios', v_scenarios,
    'guests', v_guests,
    'tables', v_tables,
    'assignments', v_assignments,
    'constraints', v_constraints
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_plan_snapshot(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_plan_snapshot(text) TO anon, authenticated;
