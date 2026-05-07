import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Entitlement {
  isPaid: boolean;
  isGrandfathered: boolean;
  /** Convenience: true if either flag is set. The single source of truth for paywall checks. */
  hasAccess: boolean;
  loading: boolean;
}

const DEFAULT: Entitlement = { isPaid: false, isGrandfathered: false, hasAccess: false, loading: true };
const SIGNED_OUT: Entitlement = { isPaid: false, isGrandfathered: false, hasAccess: false, loading: false };

/**
 * Reads the current user's payment + grandfather flags from public.profiles.
 * The on_auth_user_created trigger guarantees a profile row exists for any
 * authenticated user; the Paddle webhook flips is_paid via the service role
 * after a successful checkout, so this hook will pick up the change on the
 * next read once realtime fires (or on next auth state change).
 *
 * Use {@link RequiresPaid} for declarative gating, or this hook directly when
 * you need to branch in JSX/event handlers.
 */
export function useEntitlement(): Entitlement {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<Entitlement>(DEFAULT);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setState(SIGNED_OUT); return; }

    let active = true;
    setState(s => ({ ...s, loading: true }));

    // The `profiles` table is in the latest migration but the generated
    // Supabase types may lag. Cast to keep this hook typesafe at the
    // boundary; the runtime row shape is { is_paid: bool, is_grandfathered: bool }.
    type ProfileRow = { is_paid: boolean; is_grandfathered: boolean };
    (supabase.from("profiles" as never) as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: ProfileRow | null }>;
        };
      };
    })
      .select("is_paid, is_grandfathered")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const isPaid = !!data?.is_paid;
        const isGrandfathered = !!data?.is_grandfathered;
        setState({ isPaid, isGrandfathered, hasAccess: isPaid || isGrandfathered, loading: false });
      });

    // Realtime: pick up the moment the Paddle webhook flips is_paid.
    const ch = supabase
      .channel(`profile-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          if (!active) return;
          const row = payload.new as { is_paid?: boolean; is_grandfathered?: boolean };
          const isPaid = !!row.is_paid;
          const isGrandfathered = !!row.is_grandfathered;
          setState({ isPaid, isGrandfathered, hasAccess: isPaid || isGrandfathered, loading: false });
        },
      )
      .subscribe();

    return () => { active = false; supabase.removeChannel(ch); };
  }, [user, authLoading]);

  return state;
}
