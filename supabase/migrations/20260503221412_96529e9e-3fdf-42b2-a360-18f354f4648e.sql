
CREATE TABLE IF NOT EXISTS public.scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Default',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scenarios_plan ON public.scenarios(plan_id);

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public all scenarios" ON public.scenarios;
CREATE POLICY "public all scenarios" ON public.scenarios FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.tables_def ADD COLUMN IF NOT EXISTS scenario_id uuid;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS scenario_id uuid;

-- One default scenario per plan
INSERT INTO public.scenarios (plan_id, name, is_default)
SELECT p.id, 'Default', true
FROM public.plans p
LEFT JOIN public.scenarios s ON s.plan_id = p.id
WHERE s.id IS NULL;

-- Backfill scenario_id on existing rows
UPDATE public.tables_def t
SET scenario_id = s.id
FROM public.scenarios s
WHERE s.plan_id = t.plan_id AND s.is_default = true AND t.scenario_id IS NULL;

UPDATE public.assignments a
SET scenario_id = s.id
FROM public.scenarios s
WHERE s.plan_id = a.plan_id AND s.is_default = true AND a.scenario_id IS NULL;

ALTER TABLE public.tables_def ALTER COLUMN scenario_id SET NOT NULL;
ALTER TABLE public.assignments ALTER COLUMN scenario_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tables_scenario ON public.tables_def(scenario_id);
CREATE INDEX IF NOT EXISTS idx_assignments_scenario ON public.assignments(scenario_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.scenarios;
