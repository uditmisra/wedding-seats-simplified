DROP POLICY IF EXISTS "authed users can create plans" ON public.plans;
DROP POLICY IF EXISTS "public insert plans" ON public.plans;
DROP POLICY IF EXISTS "anyone can create plans" ON public.plans;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.plans;

DROP POLICY IF EXISTS "anyone can read plans" ON public.plans;
DROP POLICY IF EXISTS "public read plans" ON public.plans;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.plans;
DROP POLICY IF EXISTS "editors can read plans" ON public.plans;
CREATE POLICY "editors can read plans" ON public.plans
  FOR SELECT TO authenticated
  USING (public.is_plan_editor(id, auth.uid()));

DROP POLICY IF EXISTS "anyone can read scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "public all scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "public read scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "editors can read scenarios" ON public.scenarios;
CREATE POLICY "editors can read scenarios" ON public.scenarios
  FOR SELECT TO authenticated
  USING (public.is_plan_editor(plan_id, auth.uid()));

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (COALESCE(qual, '') LIKE '%email-assets%'
        OR COALESCE(with_check, '') LIKE '%email-assets%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT n.nspname AS schema,
           p.proname  AS name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
      f.schema, f.name, f.args
    );
  END LOOP;
END $$;