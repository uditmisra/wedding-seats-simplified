import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUnlock } from "@/hooks/useUnlock";
import { Sparkles, Loader2 } from "lucide-react";

/**
 * Post-payment landing. Two paths reach this page:
 *
 *  1. Anonymous checkout — Paddle redirects with `?_ptxn={transaction_id}`.
 *     We poll consume-paddle-session to retrieve the one-time magic link
 *     the webhook stashed and redirect through it. Supabase signs the
 *     user in.
 *
 *  2. Signed-in checkout — the webhook flips profiles.is_paid directly
 *     via customData.userId. No magic link is generated. Paddle's overlay
 *     may or may not append `_ptxn` reliably in this case, so we also
 *     handle "no _ptxn but session is paid" by polling useUnlock and
 *     redirecting to the dashboard once it flips.
 *
 *  3. Fall-through — neither signed in nor with a transaction reference.
 *     Show a clear "check your email" with a manual sign-in link.
 */
export default function PostPay() {
  const [params] = useSearchParams();
  const ptxn = params.get("_ptxn") ?? params.get("ptxn");
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isPaid, loading: unlockLoading } = useUnlock();
  const [status, setStatus] = useState<"polling" | "error" | "consumed">("polling");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const consumed = useRef(false);

  // Path 1: anonymous checkout — consume the magic link via ?_ptxn.
  useEffect(() => {
    if (!ptxn || consumed.current) return;

    let attempts = 0;
    const MAX_ATTEMPTS = 20;
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
        const respStatus = (data as { status?: string } | null)?.status;
        if (respStatus === "ok" && (data as { magic_link_url?: string }).magic_link_url) {
          consumed.current = true;
          window.location.replace((data as { magic_link_url: string }).magic_link_url);
          return;
        }
        if (respStatus === "consumed" || (error && /410/.test(String((error as { message?: string }).message ?? "")))) {
          setStatus("consumed");
          return;
        }
        if (attempts >= MAX_ATTEMPTS) {
          setStatus("error");
          setErrorMsg("Payment recorded, but we couldn't sign you in automatically. Check your inbox for a sign-in link.");
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

  // Path 2: signed-in checkout — wait for is_paid to flip, then go.
  // Also catches the "Paddle didn't redirect with _ptxn" edge case for
  // signed-in users.
  useEffect(() => {
    if (ptxn) return;                  // path 1 owns this case
    if (authLoading || unlockLoading) return;

    if (!user) {
      // No transaction ref AND not signed in. Either the user navigated
      // here directly, or paid anonymously and Paddle didn't append the
      // ref. Their magic link should be in their inbox.
      setStatus("error");
      setErrorMsg("If you just paid, your sign-in link is in your inbox. Click it to come back signed in.");
      return;
    }

    // Signed in. Either they're already paid (redirect now) or the webhook
    // is still in flight — poll the profile briefly.
    if (isPaid) {
      navigate("/dashboard?unlock=success", { replace: true });
      return;
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 20;
    const INTERVAL_MS = 1500;
    let cancelled = false;
    let timer: number | null = null;

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      const { data } = await supabase
        .from("profiles" as never)
        .select("is_paid, is_grandfathered" as never)
        .eq("id" as never, user.id as never)
        .maybeSingle();
      const row = data as { is_paid?: boolean; is_grandfathered?: boolean } | null;
      if (row?.is_paid || row?.is_grandfathered) {
        navigate("/dashboard?unlock=success", { replace: true });
        return;
      }
      if (attempts >= MAX_ATTEMPTS) {
        setStatus("error");
        setErrorMsg("Payment didn't fully process yet. Refresh in a minute, or check your inbox for a sign-in link.");
        return;
      }
      timer = window.setTimeout(poll, INTERVAL_MS);
    };

    poll();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [ptxn, user, authLoading, isPaid, unlockLoading, navigate]);

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
