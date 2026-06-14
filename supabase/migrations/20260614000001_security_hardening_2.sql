-- Security hardening round 2 — addresses the Lovable scan (2026-06-14).
--
-- Context: the live database has drifted from these migrations (some policies
-- were changed via the Lovable/Supabase dashboard — see the note in
-- 20260508000001_create_plan_rpc.sql). These statements are written to set the
-- DESIRED end state regardless of current drift: drop-if-exists every known
-- permissive policy name, then (re)create the correct restrictive ones.

-- ── 1) plans: block direct INSERT — force creation through the RPC ───────────
-- create_plan_with_owner() is SECURITY DEFINER (runs as postgres, bypasses
-- RLS) and checks payment before inserting. A client INSERT policy let an
-- authenticated-but-unpaid user insert a plan row directly and skip that
-- check. No client code inserts into plans directly, so dropping the policy
-- breaks nothing and closes the payment bypass.
DROP POLICY IF EXISTS "authed users can create plans" ON public.plans;
DROP POLICY IF EXISTS "public insert plans" ON public.plans;
DROP POLICY IF EXISTS "anyone can create plans" ON public.plans;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.plans;
-- (intentionally no INSERT policy: only SECURITY DEFINER RPCs may insert)

-- ── 2) plans: SELECT only for editors (anon viewing goes via the snapshot RPC)
-- get_plan_snapshot() is SECURITY DEFINER and serves the link-shareable read
-- for anonymous viewers, so the base table needs no public SELECT.
DROP POLICY IF EXISTS "anyone can read plans" ON public.plans;
DROP POLICY IF EXISTS "public read plans" ON public.plans;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.plans;
DROP POLICY IF EXISTS "editors can read plans" ON public.plans;
CREATE POLICY "editors can read plans" ON public.plans
  FOR SELECT TO authenticated
  USING (public.is_plan_editor(id, auth.uid()));

-- ── 3) scenarios: SELECT only for editors ───────────────────────────────────
-- Realtime subscriptions are separately gated by the realtime.messages policy
-- (plan editors only), so anon subscribers receive nothing.
DROP POLICY IF EXISTS "anyone can read scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "public all scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "public read scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "editors can read scenarios" ON public.scenarios;
CREATE POLICY "editors can read scenarios" ON public.scenarios
  FOR SELECT TO authenticated
  USING (public.is_plan_editor(plan_id, auth.uid()));

-- ── 4) storage: lock down the email-assets bucket ───────────────────────────
-- Drop every policy on storage.objects that references this bucket. Emails
-- embed images via the bucket's PUBLIC URL, which serves regardless of RLS,
-- so removing client policies leaves rendering intact while denying client
-- uploads, deletes, and listing. Only the service role (which bypasses RLS)
-- can write.
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

-- ── 5) Pin search_path on EVERY public function (catches dashboard drift) ────
-- A SECURITY DEFINER function without a fixed search_path can be hijacked via
-- a malicious schema on the caller's path. Pin all of them, not just the ones
-- we know by name.
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
