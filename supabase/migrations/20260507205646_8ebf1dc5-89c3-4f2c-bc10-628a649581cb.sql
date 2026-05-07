
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'live';

CREATE OR REPLACE FUNCTION public.user_is_paid(_user_id uuid, _env text DEFAULT 'live')
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_paid FROM public.profiles
      WHERE id = _user_id AND (environment = _env OR is_grandfathered = true)
      LIMIT 1),
    false
  );
$$;
