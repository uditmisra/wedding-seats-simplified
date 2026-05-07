-- Activity log for collaborative change history
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  user_display text NOT NULL DEFAULT 'Someone',
  action text NOT NULL,
  subject text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_plan_time
  ON public.activity_log(plan_id, created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Anyone with the plan link can read the log
CREATE POLICY "activity_select" ON public.activity_log
  FOR SELECT USING (true);

-- Anyone can insert (RLS on plans table controls plan existence)
CREATE POLICY "activity_insert" ON public.activity_log
  FOR INSERT WITH CHECK (true);
