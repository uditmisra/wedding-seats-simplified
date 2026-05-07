import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPaddleEnvironment } from "@/lib/paddle";

export function useUnlock() {
  const { user } = useAuth();
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setIsPaid(false); setLoading(false); return; }
    const env = getPaddleEnvironment();
    const { data } = await supabase
      .from("profiles")
      .select("is_paid, environment, is_grandfathered")
      .eq("id", user.id)
      .maybeSingle();
    const paid = !!(data?.is_grandfathered || (data?.is_paid && data?.environment === env));
    setIsPaid(paid);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime: webhook updates the row → refetch.
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`profile-${user.id}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  return { isPaid, loading, refresh };
}