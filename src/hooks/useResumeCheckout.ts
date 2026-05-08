import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";

/**
 * If the user lands on a page with `?upgrade=resume` AND is signed in,
 * automatically open Paddle Checkout. Used as a "post-auth resume" so
 * users don't have to click "Start your chart" twice (once before sign-in,
 * once after). The flag is set by UpgradeModal when an unauthenticated
 * user proceeds — auth carries them back here, this hook finishes the job.
 *
 * Mount on any page that can be the auth-return destination.
 */
export function useResumeCheckout() {
  const [params, setParams] = useSearchParams();
  const { user, loading } = useAuth();
  const { openCheckout } = usePaddleCheckout();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (loading) return;
    if (params.get("upgrade") !== "resume") return;
    if (!user) return; // wait for the auth listener to settle

    fired.current = true;
    const next = new URLSearchParams(params);
    next.delete("upgrade");
    setParams(next, { replace: true });
    openCheckout("unlock_lifetime").catch(e => console.error("Resume checkout failed:", e));
  }, [params, user, loading, setParams, openCheckout]);
}
