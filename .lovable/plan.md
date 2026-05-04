## Goal

Add authentication so couples can sign in to own and edit their wedding plans, while keeping the existing share links useful as **read-only** views for guests, family, and vendors.

## Sharing model

- **Owners** (signed-in creators + invited collaborators) — full edit access.
- **Public link visitors** — read-only seating chart. They see the floor plan, table assignments, and printable view, but cannot drag, edit, add/remove guests/tables/constraints, or run auto-assign.
- **Existing orphaned plans** — when a signed-in user opens an unowned plan via its link, a banner offers "Claim this plan" → assigns ownership to them.

## Auth methods

- **Email + password** (with email verification on by default).
- **Google sign-in** via Lovable Cloud's managed OAuth.

## What changes

### 1. Database (migration)

- New table `plan_owners`:
  - `plan_id uuid` (FK to `plans.id`, cascade delete)
  - `user_id uuid` (auth.users id)
  - `role text` — `"owner"` or `"editor"`
  - `created_at timestamptz`
  - Unique on `(plan_id, user_id)`.
- New security-definer function `public.is_plan_editor(_plan_id uuid, _user_id uuid)` returning bool — checks whether `_user_id` has any row in `plan_owners` for `_plan_id`. Used by every RLS policy below.
- New helper `public.plan_has_any_owner(_plan_id uuid)` returning bool — used by the claim flow.
- Replace the existing wide-open "public all …" policies on `plans`, `scenarios`, `tables_def`, `assignments`, `constraints_def`, `guests` with:
  - **SELECT** — `true` (anyone with the plan code can read).
  - **INSERT/UPDATE/DELETE** — `auth.uid() IS NOT NULL AND public.is_plan_editor(plan_id, auth.uid())`.
- `plans` INSERT — allow when `auth.uid() IS NOT NULL` (so a signed-in user can create a new plan; we then write a `plan_owners` row in the same client transaction).
- `plan_owners` policies:
  - SELECT — only rows where `user_id = auth.uid()` (so a user can list "my plans").
  - INSERT — allowed when (a) the user is already an editor of the plan, **or** (b) the plan has no owners yet (claim flow), **or** (c) the inserter is creating a row for themselves immediately after creating the plan.
  - DELETE — only by an editor of the plan.

### 2. New `/auth` route

- Dedicated page at `/auth` with two tabs: **Sign in** / **Create account**.
- Both tabs include a "Continue with Google" button at the top.
- Email + password form below. On sign-up, send verification email (default Lovable behaviour). Show a clear "Check your inbox" state.
- After successful auth, redirect to `?next=` if present, otherwise to `/`.
- Forgot-password link → triggers `resetPasswordForEmail` and a `/reset-password` page with a "set new password" form.

### 3. Auth context + session listener

- New `src/hooks/useAuth.tsx` provider:
  - Sets up `supabase.auth.onAuthStateChange` *first*, then calls `getSession()` (per Supabase rules).
  - Exposes `{ session, user, loading, signOut }`.
- Wrap `<App>` with the provider in `src/App.tsx`.

### 4. Landing page (`src/pages/Index.tsx`)

- Header: when signed out → "Sign in" link. When signed in → avatar/email + "Sign out".
- "Create a new plan" CTA:
  - Signed in → goes straight to plan creation (and writes `plan_owners` row for the new plan).
  - Signed out → routes to `/auth?next=/...` and creates the plan after sign-in.
- "Recent plans" stays as a localStorage list (shareable codes), but signed-in users also see a **"My plans"** section fetched from `plan_owners` joined to `plans`.

### 5. Planner page (`src/pages/Planner.tsx`)

- On mount, compute `canEdit = user && isPlanEditor(planId, user.id)` (single RPC or query against `plan_owners`).
- Pass `canEdit` down through `LayoutTabs`, `SeatingView`, `GuestsTab`, `TablesTab`, `ConstraintsPanel`, `RoomEditor`, `AutoAssignDialog`, `ExportPanel`, `CompareScenarios`.
- When `canEdit` is false:
  - All drag handles disabled; seat menus removed; inputs become readonly; "Add", "Save", "Delete", "Auto-assign" buttons hidden.
  - A subtle ribbon at the top of the planner: "You're viewing a shared seating chart. **Sign in to edit.**" (link → `/auth?next=current-url`).
- Header gets an avatar/sign-out menu mirroring the landing page.

### 6. Claim flow

- When a signed-in user opens a plan they don't own:
  - If `plan_has_any_owner(planId)` is **false** → show a top-of-page card: "This plan has no owner yet. **Claim it** to start editing." Button calls an insert into `plan_owners` for `(planId, auth.uid(), 'owner')`. After success, refresh `canEdit`.
  - If the plan already has an owner → no claim card; just the read-only ribbon.

### 7. Out of scope (deliberately, to keep scope tight)

- Inviting other editors by email — we'll add that as a follow-up. For now, a plan has exactly one owner (created at first claim or first save).
- Profile pages, avatars from Google, name editing — `auth.users` metadata is enough for the avatar dropdown.
- Magic-link login, password HIBP check, email branding — defaults are fine; we can layer on later.
- Email verification customisation — using default Lovable templates.

## Files touched

- **New** `supabase/migrations/<ts>_add_auth.sql` — `plan_owners` table, helpers, replacement RLS policies.
- **New** `src/pages/Auth.tsx` — sign-in / sign-up tabs + Google button.
- **New** `src/pages/ResetPassword.tsx` — handles `type=recovery` and updates password.
- **New** `src/hooks/useAuth.tsx` — session provider + hook.
- **New** `src/components/UserMenu.tsx` — avatar dropdown with email + Sign out.
- **Edited** `src/App.tsx` — wrap in `AuthProvider`, add `/auth` and `/reset-password` routes.
- **Edited** `src/pages/Index.tsx` — header user menu, "My plans" section, gated create flow.
- **Edited** `src/pages/Planner.tsx` — compute `canEdit`, render read-only ribbon and claim card, header user menu.
- **Edited** every editor surface listed in §5 — accept and respect a `canEdit` prop.

## Technical notes

- Client-side `canEdit` is a UX gate; **the source of truth is RLS**. If a viewer tries to write, Supabase rejects it. The UI just hides the controls so it looks clean.
- New plan creation uses one round trip: insert into `plans`, then insert into `plan_owners` with the returned id. Both succeed under the new policies because the user is authenticated and the plan has no owners yet.
- `is_plan_editor` is `SECURITY DEFINER` with `STABLE` and `SET search_path = public` — avoids recursive-RLS pitfalls when used in policies on `plan_owners` itself.
- We rely on the **default** Lovable auth email templates — no custom email scaffolding in this pass. If the user later wants branded emails, that's a separate step.
- We will NOT enable auto-confirm; users must verify their email. Google sign-ins are pre-verified.
