import { useState } from "react";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";
import { useAuth } from "@/hooks/useAuth";

export function usePaddleCheckout() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const openCheckout = async (priceId: string, opts: { successUrl?: string } = {}) => {
    if (!user) throw new Error("Sign in required");
    setLoading(true);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(priceId);
      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: user.email ? { email: user.email } : undefined,
        customData: { userId: user.id },
        settings: {
          displayMode: "overlay",
          successUrl: opts.successUrl || `${window.location.origin}/dashboard?unlock=success`,
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