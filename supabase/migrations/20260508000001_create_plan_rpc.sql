-- Robust plan creation via SECURITY DEFINER RPC.
--
-- The plans table's RLS INSERT policy has been modified somewhere along
-- the way (likely via Supabase dashboard, not in our migrations) and is
-- now rejecting writes from paid users with "new row violates row-level
-- security policy". Rather than reverse-engineer the current policy,
-- we route plan creation through this function which:
--
--   1. Confirms the caller is authenticated (auth.uid() is not null).
--   2. Confirms they have access (is_paid OR is_grandfathered).
--   3. Inserts the plan + plan_owners row atomically.
--
-- Runs as the function owner (postgres) so RLS is bypassed for these
-- specific writes. Frontend generates the human-readable plan code
-- (e.g., "luna-meadow-4821") and passes it in.

CREATE OR REPLACE FUNCTION public.create_plan_with_owner(_code text, _name text)
RETURNS public.plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _uid uuid := auth.uid();
  _has_access boolean;
  _plan public.plans;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT (is_paid OR is_grandfathered) INTO _has_access
  FROM public.profiles
  WHERE id = _uid;

  IF COALESCE(_has_access, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'payment required';
  END IF;

  INSERT INTO public.plans (code, name)
  VALUES (
    _code,
    COALESCE(NULLIF(btrim(_name), ''), 'Our Wedding')
  )
  RETURNING * INTO _plan;

  INSERT INTO public.plan_owners (plan_id, user_id, role)
  VALUES (_plan.id, _uid, 'owner');

  RETURN _plan;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_plan_with_owner(text, text)
  TO authenticated;
