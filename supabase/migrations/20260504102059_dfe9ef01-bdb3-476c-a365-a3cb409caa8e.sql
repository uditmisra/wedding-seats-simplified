REVOKE EXECUTE ON FUNCTION public.is_plan_editor(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.plan_has_any_owner(uuid) FROM PUBLIC, anon, authenticated;