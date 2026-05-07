-- Billing profiles + Paddle checkout handoff
-- =============================================================
-- profiles: per-user payment + grandfather flags. One row per auth.users
-- row, inserted automatically by the on_auth_user_created trigger. Users can
-- read their own row but cannot write to it — payment flips happen
-- server-side via the Paddle webhook using the service role.

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  is_grandfathered boolean NOT NULL DEFAULT false,
  paddle_customer_id text,
  paddle_transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Mirror new auth users into public.profiles automatically
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill: every existing auth user gets a profile row
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- pending_paddle_sessions: short-lived bridge between a successful Paddle
-- checkout and the user signing in. The webhook stashes a one-time magic
-- link keyed by Paddle's transaction/checkout ID; the /post-pay route
-- consumes it once and redirects the user into their workspace.

CREATE TABLE IF NOT EXISTS public.pending_paddle_sessions (
  paddle_session_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  magic_link_url text NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_paddle_sessions ENABLE ROW LEVEL SECURITY;
-- No client-facing policies. Only the service role (Paddle webhook +
-- consume-paddle-session edge function) touches this table.

CREATE INDEX IF NOT EXISTS idx_pending_paddle_sessions_user
  ON public.pending_paddle_sessions(user_id);
