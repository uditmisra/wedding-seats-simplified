import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Props {
  /** Stable id used to track per-plan visit count + dismissal. */
  planId: string;
  /** Suppresses the nudge when there is a signed-in user. */
  signedIn: boolean;
  /** Quick context for the body copy (e.g. "28 guests and 4 tables"). */
  guestCount: number;
  tableCount: number;
}

const VISITS_KEY = (planId: string) => `signin-nudge:visits:${planId}`;
const DISMISS_KEY = `signin-nudge:dismissedAt`;
const REQUIRED_VISITS = 2;
const COOLDOWN_DAYS = 30;

/**
 * Non-blocking in-content banner that nudges anonymous users to save their
 * plan. Lives at the top of the planner content area, styled per the
 * design's AuthNudgeA: 1px hairline + 3px terracotta left border + italic
 * Newsreader headline + body + Not now / Save with email actions.
 *
 * Shows only on the user's 2nd+ visit to the same anonymous plan, and
 * remembers dismissal for COOLDOWN_DAYS so it doesn't badger.
 */
export function SignInNudge({ planId, signedIn, guestCount, tableCount }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (signedIn) return;
    if (typeof window === "undefined") return;

    const visits = parseInt(localStorage.getItem(VISITS_KEY(planId)) ?? "0", 10) + 1;
    localStorage.setItem(VISITS_KEY(planId), String(visits));
    if (visits < REQUIRED_VISITS) return;

    const dismissedAt = parseInt(localStorage.getItem(DISMISS_KEY) ?? "0", 10);
    const cooldown = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    if (dismissedAt && Date.now() - dismissedAt < cooldown) return;

    // Small delay so it doesn't pop instantly on load.
    const t = window.setTimeout(() => setVisible(true), 1200);
    return () => window.clearTimeout(t);
  }, [planId, signedIn]);

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
  };

  if (!visible || signedIn) return null;

  // Pluralize for the body copy.
  const guests = `${guestCount} guest${guestCount === 1 ? "" : "s"}`;
  const tables = `${tableCount} table${tableCount === 1 ? "" : "s"}`;

  return (
    <div
      className="relative flex flex-wrap items-center gap-4 rounded-xl border hairline bg-paper py-4 pl-6 pr-5"
      style={{ borderLeft: "3px solid hsl(var(--terracotta))" }}
    >
      <div className="min-w-0 flex-1">
        <div className="font-display-italic text-[18px] leading-tight">
          Save this to your account.
        </div>
        <div className="mt-1 text-[13px] text-ink-2">
          {guests} and {tables} — sign in to open it from any device and share it
          with your partner.
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3 hover:text-ink"
        >
          Not now
        </button>
        <Button asChild size="sm" className="rounded-full">
          <Link
            to={`/auth?next=${encodeURIComponent(window.location.pathname + "?claim=1")}`}
            onClick={dismiss}
          >
            Sign in
            <span className="ml-1 font-display-italic">→</span>
          </Link>
        </Button>
      </div>
      <button
        aria-label="Dismiss"
        onClick={dismiss}
        className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full text-ink-3 hover:bg-paper-2 hover:text-ink"
      >
        <X size={11} />
      </button>
    </div>
  );
}
