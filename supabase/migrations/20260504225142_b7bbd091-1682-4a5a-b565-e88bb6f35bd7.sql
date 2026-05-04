
-- Replace public SELECT on plans with a code-validation RPC to prevent enumeration
DROP POLICY IF EXISTS "anyone can read plans" ON public.plans;

CREATE POLICY "editors can read plans"
ON public.plans FOR SELECT
TO authenticated
USING (is_plan_editor(id, auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_plan_code(_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.plans WHERE code = _code);
$$;

GRANT EXECUTE ON FUNCTION public.validate_plan_code(text) TO anon, authenticated;

-- Restrict Realtime channel subscriptions to plan editors
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan editors can subscribe to plan channels" ON realtime.messages;
CREATE POLICY "plan editors can subscribe to plan channels"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'plan-%'
  AND public.is_plan_editor(
    NULLIF(substring(realtime.topic() FROM 6), '')::uuid,
    auth.uid()
  )
);
