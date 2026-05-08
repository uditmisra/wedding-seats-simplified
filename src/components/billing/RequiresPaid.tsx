import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { useUnlock } from "@/hooks/useUnlock";
import { UpgradeModal } from "@/components/UpgradeModal";

interface Props {
  children: ReactNode;
  /** Custom paywall UI. If omitted, a default paywall card is rendered. */
  fallback?: ReactNode;
  /** Hide rendering entirely while the entitlement is being read. Default: render nothing during load. */
  loadingFallback?: ReactNode;
}

/**
 * Declarative paywall gate. Renders children only if the current user has
 * either paid (£10 unlock) or is grandfathered. Intended to wrap any UI
 * that depends on paid features.
 *
 * For action-level gating (e.g. "Download PDF" → upgrade modal), use the
 * inline pattern from ExportPanel: useUnlock() + UpgradeModal directly.
 *
 * Read-only flows (viewing a shared plan via /plan/:code) should NOT be
 * wrapped. Anonymous viewing is preserved by design.
 */
export function RequiresPaid({ children, fallback, loadingFallback = null }: Props) {
  const { isPaid, loading } = useUnlock();
  if (loading) return <>{loadingFallback}</>;
  if (isPaid) return <>{children}</>;
  return <>{fallback ?? <DefaultPaywall />}</>;
}

function DefaultPaywall() {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  return (
    <>
      <div className="paper-grain mx-auto my-12 max-w-md rounded-2xl border hairline bg-paper p-8 text-center shadow-soft">
        <Sparkles size={22} className="mx-auto mb-4 text-terracotta" />
        <h2 className="m-0 font-display text-[28px] leading-tight">
          Almost <span className="font-display-italic">there.</span>
        </h2>
        <p className="mt-3 text-[14px] leading-snug text-ink-2">
          £10, one time. Unlocks every seating chart you'll ever build with this account —
          unlimited tables, guests, exports, and collaborators.
        </p>
        <div className="mt-6 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center">
          <button
            onClick={() => setUpgradeOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-paper transition hover:bg-ink-2"
          >
            Pay £10
            <ArrowRight size={13} />
          </button>
          <Link
            to="/demo"
            className="inline-flex h-11 items-center justify-center rounded-full border border-hairline bg-paper px-5 text-[14px] text-ink-2 transition hover:text-ink"
          >
            Try the demo first
          </Link>
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          30-day money-back · No subscription · Less than one place setting
        </p>
      </div>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}
