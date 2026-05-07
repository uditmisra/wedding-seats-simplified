-- One-time launch script: grandfather every user who has used the product
-- before launch day. Run this AFTER the launch cutoff is locked in but
-- BEFORE enabling the paywall for new users in the frontend.
--
-- Eligibility: any user who owns at least one plan via plan_owners. The
-- brief specifies "anyone who created a chart before launch day" — owning
-- a plan is the cleanest proxy. Anonymous plans (no owner row) are not
-- grandfathered, which matches the policy of "creators need to pay" — an
-- anonymous plan has no creator account to grandfather.
--
-- Idempotent: running multiple times has no additional effect after the
-- first successful run.
--
-- How to run:
--   1. Supabase SQL Editor → paste this file → Run
--   2. OR via CLI: psql "$SUPABASE_DB_URL" -f grandfather_existing_users.sql
--
-- Verify with the SELECT at the bottom before running the UPDATE.

-- DRY RUN — count of users about to be flipped:
-- SELECT COUNT(DISTINCT po.user_id)
-- FROM public.plan_owners po
-- JOIN public.profiles p ON p.id = po.user_id
-- WHERE p.is_grandfathered = false;

UPDATE public.profiles
SET is_grandfathered = true
WHERE id IN (SELECT DISTINCT user_id FROM public.plan_owners)
  AND is_grandfathered = false
  AND is_paid = false;

-- Audit:
-- SELECT
--   (SELECT COUNT(*) FROM public.profiles WHERE is_grandfathered) AS grandfathered,
--   (SELECT COUNT(*) FROM public.profiles WHERE is_paid) AS paid,
--   (SELECT COUNT(*) FROM public.profiles) AS total;
