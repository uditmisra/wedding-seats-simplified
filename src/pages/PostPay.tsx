import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2 } from "lucide-react";

/**
 * Post-payment landing. Paddle redirects here with `?_ptxn={transaction_id}`.
 * The webhook may or may not have landed yet (it's racing the redirect),
 * so we poll consume-paddle-session for up to ~30s. Once we get the
 * one-time magic link back, we redirect through it — Supabase signs the
 * user in and lands them on /dashboard?unlock=success.
 *
 * Three states:
 *   - polling: spinner + reassurance (the happy path)
 *   - error: helpful message + manual link (rare; webhook never arrived)
 *   - already-consumed: tab refreshed after the redirect already happened
 */
export default function PostPay() {
  const [params] = useSearchParams();
  const ptxn = params.get("_ptxn") ?? params.get("ptxn");
  const [status, setStatus] = useState<"polling" | "error" | "consumed">("polling");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const consumed = useRef(false);

  useEffect(() => {
    if (!ptxn) {
      setStatus("error");
      setErrorMsg("Missing transaction reference. If you completed payment, check your email for the sign-in link.");
      return;
    }
    if (consumed.current) return;

    let attempts = 0;
    const MAX_ATTEMPTS = 20;            // ~30s total
    const INTERVAL_MS = 1500;
    let timer: number | null = null;
    let cancelled = false;

    const poll = async () => {
      if (cancelled || consumed.current) return;
      attempts += 1;
      try {
        const { data, error } = await supabase.functions.invoke("consume-paddle-session", {
          body: { ptxn },
        });
        // The function returns 202 (pending), 200 (ok + magic_link), 410 (already consumed)
        // supabase.functions.invoke surfaces non-2xx as `error`; we inspect data.status when present.
        const status = (data as { status?: string } | null)?.status;
        if (status === "ok" && (data as { magic_link_url?: string }).magic_link_url) {
          consumed.current = true;
          window.location.replace((data as { magic_link_url: string }).magic_link_url);
          return;
        }
        if (status === "consumed" || (error && /410/.test(String((error as { message?: string }).message ?? "")))) {
          setStatus("consumed");
          return;
        }
        // Otherwise: pending. Keep polling.
        if (attempts >= MAX_ATTEMPTS) {
          setStatus("error");
          setErrorMsg("Payment recorded, but we couldn't sign you in automatically. Check your inbox for a sign-in link from us.");
          return;
        }
        timer = window.setTimeout(poll, INTERVAL_MS);
      } catch (e) {
        if (attempts >= MAX_ATTEMPTS) {
          setStatus("error");
          setErrorMsg(e instanceof Error ? e.message : "Something went wrong. Check your inbox for a sign-in link.");
          return;
        }
        timer = window.setTimeout(poll, INTERVAL_MS);
      }
    };

    poll();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [ptxn]);

  return (
    <div className="paper-grain flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <Sparkles size={22} className="mx-auto mb-4 text-terracotta" />

        {status === "polling" && (
          <>
            <h1 className="m-0 font-display text-[36px] leading-tight">
              Almost <span className="font-display-italic">there.</span>
            </h1>
            <p className="mt-3 text-[15px] leading-snug text-ink-2">
              Setting up your account and signing you in. This usually takes a few seconds.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-ink-3">
              <Loader2 size={14} className="animate-spin" />
              <span className="font-mono uppercase tracking-[0.14em]">Just a moment</span>
            </div>
          </>
        )}

        {status === "consumed" && (
          <>
            <h1 className="m-0 font-display text-[36px] leading-tight">
              You're already <span className="font-display-italic">in.</span>
            </h1>
            <p className="mt-3 text-[15px] leading-snug text-ink-2">
              This sign-in link has already been used. Head to your dashboard.
            </p>
            <Link
              to="/dashboard"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-paper hover:bg-ink-2"
            >
              Open dashboard
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="m-0 font-display text-[32px] leading-tight">
              Hmm, <span className="font-display-italic">one moment.</span>
            </h1>
            <p className="mt-3 text-[14px] leading-snug text-ink-2">{errorMsg}</p>
            <div className="mt-6 flex flex-col items-center gap-2">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-paper hover:bg-ink-2"
              >
                Sign in to continue
              </Link>
              <Link to="/" className="text-[12px] text-ink-3 underline-offset-4 hover:underline">
                Back to home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
