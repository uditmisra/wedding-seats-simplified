-- Security hardening — addresses the Lovable security scan (2026-06-11).
--
-- 1) CRITICAL: activity_log was readable and writable by ANYONE (both
--    policies were USING/WITH CHECK (true)) — any visitor could dump the
--    whole table across every plan (editor names, guest names in subjects)
--    or spam-insert rows. Scoped to plan owners. App impact: none for
--    owners; anonymous viewers see an empty activity drawer, and their
--    fire-and-forget log inserts fail silently (they never produced edit
--    actions anyway — edit UI is owner-gated).
--
-- 2) pending_paddle_sessions had RLS enabled but no policies. That is
--    deny-by-default already (only the service-role webhook/edge functions
--    touch it), but an explicit deny-all policy locks intent against a
--    future accidental permissive policy.
--
-- 3) email-assets bucket: the SELECT policy on storage.objects allowed
--    LISTING the bucket via the storage API. Public buckets serve objects
--    through /object/public/ regardless of RLS, so emails keep rendering;
--    dropping the policy only removes enumeration.
--
-- 4) Pin search_path on every public function (defense against
--    search_path hijack on SECURITY DEFINER functions). Repo definitions
--    already pin it; this re-pins whatever versions are live, skipping
--    any signature that doesn't exist.

-- ── 1) activity_log ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "activity_select" ON public.activity_log;
DROP POLICY IF EXISTS "activity_insert" ON public.activity_log;

CREATE POLICY "activity_select_owners" ON public.activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.plan_owners po
      WHERE po.plan_id = activity_log.plan_id AND po.user_id = auth.uid()
    )
  );

CREATE POLICY "activity_insert_owners" ON public.activity_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plan_owners po
      WHERE po.plan_id = activity_log.plan_id AND po.user_id = auth.uid()
    )
  );
-- No UPDATE/DELETE policies: activity history is append-only by design.

-- ── 2) pending_paddle_sessions ──────────────────────────────────────────────
DROP POLICY IF EXISTS "deny_all_pending_paddle_sessions" ON public.pending_paddle_sessions;
CREATE POLICY "deny_all_pending_paddle_sessions" ON public.pending_paddle_sessions
  FOR ALL USING (false) WITH CHECK (false);

-- ── 3) email-assets bucket listing ──────────────────────────────────────────
DROP POLICY IF EXISTS "Public read email-assets" ON storage.objects;

-- ── 4) search_path pinning ──────────────────────────────────────────────────
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.get_plan_snapshot(text)',
    'public.validate_plan_code(text)',
    'public.plan_has_any_owner(uuid)',
    'public.is_plan_editor(uuid, uuid)',
    'public.create_plan_with_owner(text, text)',
    'public.ensure_sample_plan()',
    'public.user_is_paid(uuid, text)',
    'public.handle_new_auth_user()',
    'public.admin_get_stats()',
    'public.admin_list_plans(integer, integer)',
    'public.admin_list_users(integer, integer)',
    'public.admin_delete_plan(uuid)',
    'public.admin_delete_user(uuid)'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', fn);
    EXCEPTION
      WHEN undefined_function THEN NULL; -- signature not on this database; skip
      WHEN invalid_parameter_value THEN NULL;
    END;
  END LOOP;
END $$;
