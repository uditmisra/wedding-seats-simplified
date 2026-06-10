import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUnlock } from "@/hooks/useUnlock";
import { useSeoHead } from "@/lib/useSeoHead";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

/**
 * Post-payment landing. Decides what to do based on auth + entitlement
 * state, in priority order:
 *
 *   1. Signed in AND already paid (or grandfathered) → straight to
 *      /dashboard?unlock=success. Catches both:
 *        - Fast path: webhook used customData.userId, flipped is_paid
 *          before this page even loaded.
 *        - Slow path: webhook is in flight when we mount, then is_paid
 *          flips via useUnlock's realtime subscription on profiles —
 *          this effect re-runs and lands here.
 *
 *   2. Anonymous AND has ?_ptxn → poll consume-paddle-session for the
 *      one-time magic link the webhook stashed. Redirect through it to
 *      sign the user in.
 *
 *   3. Anonymous AND no ?_ptxn → tell them to check their inbox.
 *
 *   4. Signed in AND not paid yet → wait silently for the realtime
 *      flip. If 30s pass with no flip, surface a "didn't fully process
 *      yet" error.
 *
 * The previous version always polled consume-paddle-session whenever
 * ?_ptxn was present, which trapped signed-in users for 30s — the
 * webhook never creates a pending_paddle_sessions row in the
 * customData.userId path.
 */
export default function PostPay() {
  const [params] = useSearchParams();
  const ptxn = params.get("_ptxn") ?? params.get("ptxn");
  // Where the user was when they started checkout. Only accept in-app paths —
  // anything else falls back to the dashboard (prevents open-redirect abuse).
  const rawNext = params.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isPaid, loading: unlockLoading } = useUnlock();
  const [status, setStatus] = useState<"polling" | "error" | "consumed">("polling");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const handled = useRef(false);

  useSeoHead({ title: "Almost there | Wedding Seater", description: "Setting up your account.", noindex: true });

  useEffect(() => {
    if (handled.current) return;
    if (authLoading || unlockLoading) return;

    // Case 1: signed in + paid → back to where they were, or the dashboard.
    if (user && isPaid) {
      handled.current = true;
      analytics.paymentCompleted();
      if (next) {
        toast.success("Unlocked — every export is yours now.");
        navigate(next, { replace: true });
      } else {
        navigate("/dashboard?unlock=success", { replace: true });
      }
      return;
    }

    // Case 2: anonymous + ptxn → poll consume-paddle-session for a
    // one-time magic link, then redirect through it.
    if (!user && ptxn) {
      handled.current = true;
      void pollConsume();
      return;
    }

    // Case 3: anonymous + no ptxn → tell them to check email.
    if (!user && !ptxn) {
      handled.current = true;
      setStatus("error");
      setErrorMsg("If you just paid, your sign-in link is in your inbox. Click it to come back signed in.");
      return;
    }

    // Case 4: signed in but not paid yet — webhook is racing us. Do
    // nothing here; useUnlock's realtime subscription will flip isPaid
    // and we'll re-enter case 1. The timeout effect below catches the
    // case where the webhook never lands.

    async function pollConsume() {
      let attempts = 0;
      const MAX = 20;
      const INTERVAL = 1500;

      const tick = async (): Promise<void> => {
        attempts += 1;
        try {
          const { data, error } = await supabase.functions.invoke("consume-paddle-session", {
            body: { ptxn },
          });
          const respStatus = (data as { status?: string } | null)?.status;
          if (respStatus === "ok" && (data as { magic_link_url?: string }).magic_link_url) {
            window.location.replace((data as { magic_link_url: string }).magic_link_url);
            return;
          }
          if (respStatus === "consumed" || (error && /410/.test(String((error as { message?: string }).message ?? "")))) {
            setStatus("consumed");
            return;
          }
          if (attempts >= MAX) {
            setStatus("error");
            setErrorMsg("Payment recorded, but we couldn't sign you in automatically. Check your inbox for a sign-in link.");
            return;
          }
          window.setTimeout(tick, INTERVAL);
        } catch (e) {
          if (attempts >= MAX) {
            setStatus("error");
            setErrorMsg(e instanceof Error ? e.message : "Something went wrong. Check your inbox.");
            return;
          }
          window.setTimeout(tick, INTERVAL);
        }
      };
      await tick();
    }
  }, [user, authLoading, isPaid, unlockLoading, ptxn, next, navigate]);

  // Case 4 timeout: signed-in-but-not-paid-yet → wait 30s for is_paid
  // to flip via realtime, then surface a fallback error.
  useEffect(() => {
    if (handled.current || status !== "polling") return;
    if (!user || isPaid || authLoading || unlockLoading) return;
    const timer = window.setTimeout(() => {
      if (handled.current || isPaid) return;
      setStatus("error");
      setErrorMsg("Payment didn't fully process yet. Refresh in a minute, or check your inbox for a sign-in link.");
    }, 30000);
    return () => window.clearTimeout(timer);
  }, [user, isPaid, authLoading, unlockLoading, status]);

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

        {/* The minute after paying is when trust is thinnest — keep the
            guarantee in view the whole time. */}
        <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-4">
          30-day money-back guarantee ·{" "}
          <Link to="/refunds" className="underline-offset-4 hover:text-ink-2 hover:underline">
            refund policy
          </Link>
        </p>
      </div>
    </div>
  );
}
