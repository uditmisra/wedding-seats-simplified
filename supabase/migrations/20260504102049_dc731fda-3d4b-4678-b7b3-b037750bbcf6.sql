-- Auth: plan ownership and proper RLS

-- 1. plan_owners table
CREATE TABLE public.plan_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, user_id)
);
CREATE INDEX idx_plan_owners_user ON public.plan_owners(user_id);
CREATE INDEX idx_plan_owners_plan ON public.plan_owners(plan_id);

ALTER TABLE public.plan_owners ENABLE ROW LEVEL SECURITY;

-- 2. Helper functions (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_plan_editor(_plan_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.plan_owners
    WHERE plan_id = _plan_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.plan_has_any_owner(_plan_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.plan_owners WHERE plan_id = _plan_id)
$$;

-- 3. plan_owners policies
CREATE POLICY "owners can view their own ownership rows"
ON public.plan_owners FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "claim or self-add ownership"
ON public.plan_owners FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND (
    NOT public.plan_has_any_owner(plan_id)
    OR public.is_plan_editor(plan_id, auth.uid())
  )
);

CREATE POLICY "editors can remove ownership"
ON public.plan_owners FOR DELETE
TO authenticated
USING (public.is_plan_editor(plan_id, auth.uid()));

-- 4. Replace permissive policies on plans
DROP POLICY IF EXISTS "public read plans" ON public.plans;
DROP POLICY IF EXISTS "public insert plans" ON public.plans;
DROP POLICY IF EXISTS "public update plans" ON public.plans;
DROP POLICY IF EXISTS "public delete plans" ON public.plans;

CREATE POLICY "anyone can read plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "authed users can create plans" ON public.plans FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "editors can update plans" ON public.plans FOR UPDATE TO authenticated USING (public.is_plan_editor(id, auth.uid()));
CREATE POLICY "editors can delete plans" ON public.plans FOR DELETE TO authenticated USING (public.is_plan_editor(id, auth.uid()));

-- 5. Replace policies on scenarios
DROP POLICY IF EXISTS "public all scenarios" ON public.scenarios;
CREATE POLICY "anyone can read scenarios" ON public.scenarios FOR SELECT USING (true);
CREATE POLICY "editors can insert scenarios" ON public.scenarios FOR INSERT TO authenticated WITH CHECK (public.is_plan_editor(plan_id, auth.uid()));
CREATE POLICY "editors can update scenarios" ON public.scenarios FOR UPDATE TO authenticated USING (public.is_plan_editor(plan_id, auth.uid()));
CREATE POLICY "editors can delete scenarios" ON public.scenarios FOR DELETE TO authenticated USING (public.is_plan_editor(plan_id, auth.uid()));

-- 6. Replace policies on guests
DROP POLICY IF EXISTS "public all guests" ON public.guests;
CREATE POLICY "anyone can read guests" ON public.guests FOR SELECT USING (true);
CREATE POLICY "editors can insert guests" ON public.guests FOR INSERT TO authenticated WITH CHECK (public.is_plan_editor(plan_id, auth.uid()));
CREATE POLICY "editors can update guests" ON public.guests FOR UPDATE TO authenticated USING (public.is_plan_editor(plan_id, auth.uid()));
CREATE POLICY "editors can delete guests" ON public.guests FOR DELETE TO authenticated USING (public.is_plan_editor(plan_id, auth.uid()));

-- 7. Replace policies on tables_def
DROP POLICY IF EXISTS "public all tables" ON public.tables_def;
CREATE POLICY "anyone can read tables" ON public.tables_def FOR SELECT USING (true);
CREATE POLICY "editors can insert tables" ON public.tables_def FOR INSERT TO authenticated WITH CHECK (public.is_plan_editor(plan_id, auth.uid()));
CREATE POLICY "editors can update tables" ON public.tables_def FOR UPDATE TO authenticated USING (public.is_plan_editor(plan_id, auth.uid()));
CREATE POLICY "editors can delete tables" ON public.tables_def FOR DELETE TO authenticated USING (public.is_plan_editor(plan_id, auth.uid()));

-- 8. Replace policies on assignments
DROP POLICY IF EXISTS "public all assignments" ON public.assignments;
CREATE POLICY "anyone can read assignments" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "editors can insert assignments" ON public.assignments FOR INSERT TO authenticated WITH CHECK (public.is_plan_editor(plan_id, auth.uid()));
CREATE POLICY "editors can update assignments" ON public.assignments FOR UPDATE TO authenticated USING (public.is_plan_editor(plan_id, auth.uid()));
CREATE POLICY "editors can delete assignments" ON public.assignments FOR DELETE TO authenticated USING (public.is_plan_editor(plan_id, auth.uid()));

-- 9. Replace policies on constraints_def
DROP POLICY IF EXISTS "public all constraints" ON public.constraints_def;
CREATE POLICY "anyone can read constraints" ON public.constraints_def FOR SELECT USING (true);
CREATE POLICY "editors can insert constraints" ON public.constraints_def FOR INSERT TO authenticated WITH CHECK (public.is_plan_editor(plan_id, auth.uid()));
CREATE POLICY "editors can update constraints" ON public.constraints_def FOR UPDATE TO authenticated USING (public.is_plan_editor(plan_id, auth.uid()));
CREATE POLICY "editors can delete constraints" ON public.constraints_def FOR DELETE TO authenticated USING (public.is_plan_editor(plan_id, auth.uid()));