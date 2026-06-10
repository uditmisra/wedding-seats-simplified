import { useState } from "react";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";
import { useAuth } from "@/hooks/useAuth";
import { analytics } from "@/lib/analytics";

/**
 * Opens Paddle Checkout for the £10 lifetime unlock. Works in two modes:
 *
 * 1. Signed in — passes customData.userId so the webhook takes the fast
 *    path: just flips profiles.is_paid for that existing user.
 *
 * 2. Signed out — Paddle's checkout collects email natively. The webhook
 *    falls back to email-based provisioning: creates the auth user via
 *    admin.createUser, flips is_paid, generates a magic link, stashes it
 *    in pending_paddle_sessions. Success URL goes to /post-pay which
 *    polls consume-paddle-session and redirects through the magic link.
 *
 * No "Sign in required" gate — the brief explicitly intends payment
 * without a prior account creation step.
 */
export function usePaddleCheckout() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const openCheckout = async (priceId: string, opts: { successUrl?: string; source?: string } = {}) => {
    setLoading(true);
    try {
      analytics.checkoutOpened({ source: opts.source ?? "unknown" });
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(priceId);
      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: user?.email ? { email: user.email } : undefined,
        customData: user ? { userId: user.id } : undefined,
        settings: {
          displayMode: "overlay",
          successUrl: opts.successUrl || `${window.location.origin}/post-pay`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}
