
DO $$
DECLARE
  keep_plans uuid[] := ARRAY[
    '6b0e5293-cd05-4ab0-94c1-f8805e7e78c5'::uuid,
    'd85012b8-cc7f-4468-8255-0d2295bab3c5'::uuid,
    '3be80cc7-8c5c-46e4-ae6c-232432c6cc06'::uuid
  ];
  keep_users uuid[] := ARRAY[
    '705097b0-8eb4-4e63-a5c0-29a0214c352c'::uuid,
    '945ea3b7-18fa-4be2-8827-9f6f503c5c6e'::uuid
  ];
BEGIN
  DELETE FROM public.assignments     WHERE plan_id <> ALL(keep_plans);
  DELETE FROM public.constraints_def WHERE plan_id <> ALL(keep_plans);
  DELETE FROM public.tables_def      WHERE plan_id <> ALL(keep_plans);
  DELETE FROM public.scenarios       WHERE plan_id <> ALL(keep_plans);
  DELETE FROM public.plan_owners     WHERE plan_id <> ALL(keep_plans);
  DELETE FROM public.guests          WHERE plan_id <> ALL(keep_plans);
  DELETE FROM public.activity_log    WHERE plan_id <> ALL(keep_plans);
  DELETE FROM public.plans           WHERE id      <> ALL(keep_plans);

  DELETE FROM public.pending_paddle_sessions WHERE user_id <> ALL(keep_users);
  DELETE FROM public.profiles                WHERE id      <> ALL(keep_users);
  DELETE FROM auth.users                     WHERE id      <> ALL(keep_users);
END $$;
