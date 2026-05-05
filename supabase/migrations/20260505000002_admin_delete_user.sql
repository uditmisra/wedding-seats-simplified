-- Delete a user from auth.users (cascades to all their data via FK constraints).
-- SECURITY DEFINER runs as the postgres role which has auth schema access.
CREATE OR REPLACE FUNCTION admin_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.email() IS DISTINCT FROM 'udit.misra93@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;
