import { supabase } from "@/integrations/supabase/client";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

declare global {
  interface Window {
    Paddle: any;
  }
}

export function getPaddleEnvironment(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

let paddleInitialized = false;
let initPromise: Promise<void> | null = null;

export async function initializePaddle() {
  if (paddleInitialized) return;
  if (initPromise) return initPromise;
  if (!clientToken) throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
  initPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-paddle="1"]');
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
      script.dataset.paddle = "1";
      document.head.appendChild(script);
    }
    const onReady = () => {
      const env = getPaddleEnvironment() === "sandbox" ? "sandbox" : "production";
      window.Paddle.Environment.set(env);
      window.Paddle.Initialize({
        token: clientToken,
        // Re-broadcast checkout lifecycle as a DOM event so UI (UpgradeModal)
        // can react to the overlay closing without importing Paddle.
        eventCallback: (event: { name?: string }) => {
          if (event?.name === "checkout.completed") {
            window.dispatchEvent(new CustomEvent("paddle:checkout-completed"));
          } else if (event?.name === "checkout.closed") {
            window.dispatchEvent(new CustomEvent("paddle:checkout-closed"));
          }
        },
      });
      paddleInitialized = true;
      resolve();
    };
    if (window.Paddle) onReady();
    else {
      script.onload = onReady;
      script.onerror = reject;
    }
  });
  return initPromise;
}

const priceCache = new Map<string, string>();
export async function getPaddlePriceId(priceId: string): Promise<string> {
  const env = getPaddleEnvironment();
  const key = `${env}:${priceId}`;
  if (priceCache.has(key)) return priceCache.get(key)!;
  const { data, error } = await supabase.functions.invoke("get-paddle-price", {
    body: { priceId, environment: env },
  });
  if (error || !data?.paddleId) throw new Error(`Failed to resolve price: ${priceId}`);
  priceCache.set(key, data.paddleId);
  return data.paddleId;
}