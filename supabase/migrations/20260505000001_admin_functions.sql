-- Admin functions: all check auth.email() = the admin email before executing.
-- SECURITY DEFINER bypasses RLS so the admin can see all rows.

CREATE OR REPLACE FUNCTION admin_get_stats()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF auth.email() IS DISTINCT FROM 'udit.misra93@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT json_build_object(
    'total_plans',  (SELECT COUNT(*) FROM plans),
    'total_guests', (SELECT COUNT(*) FROM guests),
    'total_tables', (SELECT COUNT(*) FROM tables_def),
    'total_users',  (SELECT COUNT(*) FROM auth.users)
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION admin_list_plans(
  p_limit  int DEFAULT 200,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  id           uuid,
  code         text,
  name         text,
  event_date   text,
  created_at   timestamptz,
  updated_at   timestamptz,
  owner_email  text,
  guest_count  bigint,
  table_count  bigint
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.email() IS DISTINCT FROM 'udit.misra93@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT
      p.id,
      p.code,
      p.name,
      p.event_date::text,
      p.created_at,
      p.updated_at,
      u.email::text AS owner_email,
      (SELECT COUNT(*) FROM guests    g WHERE g.plan_id = p.id) AS guest_count,
      (SELECT COUNT(*) FROM tables_def t WHERE t.plan_id = p.id) AS table_count
    FROM plans p
    LEFT JOIN plan_owners po ON po.plan_id = p.id AND po.role = 'owner'
    LEFT JOIN auth.users  u  ON u.id = po.user_id
    ORDER BY p.created_at DESC
    LIMIT  p_limit
    OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION admin_list_users(
  p_limit  int DEFAULT 200,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  id              uuid,
  email           text,
  created_at      timestamptz,
  last_sign_in_at timestamptz,
  plan_count      bigint
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.email() IS DISTINCT FROM 'udit.misra93@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT
      u.id,
      u.email::text,
      u.created_at,
      u.last_sign_in_at,
      (SELECT COUNT(*) FROM plan_owners po WHERE po.user_id = u.id) AS plan_count
    FROM auth.users u
    ORDER BY u.created_at DESC
    LIMIT  p_limit
    OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_plan(p_plan_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.email() IS DISTINCT FROM 'udit.misra93@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM plans WHERE id = p_plan_id;
END;
$$;
