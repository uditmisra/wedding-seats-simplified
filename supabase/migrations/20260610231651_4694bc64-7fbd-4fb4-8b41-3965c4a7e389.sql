-- Security hardening — addresses the Lovable security scan (2026-06-11).

-- 1) activity_log: lock down to plan owners
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

-- 2) pending_paddle_sessions: explicit deny-all (service role bypasses RLS)
DROP POLICY IF EXISTS "deny_all_pending_paddle_sessions" ON public.pending_paddle_sessions;
CREATE POLICY "deny_all_pending_paddle_sessions" ON public.pending_paddle_sessions
  FOR ALL USING (false) WITH CHECK (false);

-- 3) email-assets bucket: drop listing policy (public objects still served via /object/public/)
DROP POLICY IF EXISTS "Public read email-assets" ON storage.objects;

-- 4) Pin search_path on all public functions (defense against search_path hijack)
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
      WHEN undefined_function THEN NULL;
      WHEN invalid_parameter_value THEN NULL;
    END;
  END LOOP;
END $$;