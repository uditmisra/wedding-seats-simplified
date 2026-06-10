import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { getPaddleEnvironment } from "@/lib/paddle";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  headline?: ReactNode;
  subhead?: ReactNode;
  /** Hide the "Try the demo first" escape button. Set true on /demo to avoid a circular CTA. */
  hideDemoEscape?: boolean;
}

export function UpgradeModal({ open, onOpenChange, headline, subhead, hideDemoEscape }: Props) {
  const { openCheckout, loading } = usePaddleCheckout();
  const navigate = useNavigate();
  const location = useLocation();
  const isTest = getPaddleEnvironment() === "sandbox";
  // Hide the demo escape if explicitly disabled OR we're already on /demo.
  const showDemoEscape = !hideDemoEscape && location.pathname !== "/demo";

  const start = async () => {
    try { await openCheckout("unlock_lifetime", { source: location.pathname }); }
    catch (e) { console.error(e); }
  };

  const tryDemo = () => {
    onOpenChange(false);
    navigate("/demo");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[540px] rounded-[18px] border-ink bg-paper p-0 shadow-elegant paper-grain">
        <div className="px-10 pt-10 pb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-terracotta">
            One-time unlock
          </div>
          <h2 className="mt-3 font-display text-[36px] leading-[1.05] text-ink">
            {headline ?? <>Stop sweating the <em className="font-display-italic text-terracotta">seating chart.</em></>}
          </h2>
          <p className="mt-4 text-[15px] leading-[1.55] text-ink-2">
            {subhead ?? "Drag your guests onto your tables. Auto-seat handles the divorced parents, the feuding in-laws, the cousins who don't speak. Done in an afternoon."}
          </p>

          <div className="mt-7 rounded-xl border border-hairline bg-paper-2/40 px-5 py-4">
            <div className="flex items-baseline justify-between">
              <div className="font-display text-[19px] text-ink">Lifetime unlock</div>
              <div className="font-display text-[32px] text-ink leading-none">£10</div>
            </div>
            <ul className="mt-3 space-y-1.5 text-[13px] leading-[1.55] text-ink-2">
              <li>· Auto-seat handles the conflicts</li>
              <li>· Print-ready PDFs your venue actually wants</li>
              <li>· Share with your partner, mum, MOH</li>
              <li>· 30-day money-back guarantee</li>
            </ul>
            <p className="mt-3 border-t border-hairline-2 pt-2.5 font-display-italic text-[13px] leading-snug text-ink-3">
              Less than one place setting at your reception.
            </p>
          </div>

          <div className="mt-7 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            {showDemoEscape ? (
              <Button variant="ghost" onClick={tryDemo} className="text-ink-2 hover:text-ink sm:mr-auto">
                Try the demo first
              </Button>
            ) : (
              <span className="hidden sm:block sm:mr-auto" aria-hidden />
            )}
            <Button onClick={start} disabled={loading} className="rounded-full bg-ink px-6 text-paper hover:bg-ink-2">
              {loading ? <Loader2 className="animate-spin" /> : <>Unlock for £10 →</>}
            </Button>
          </div>

          {isTest && (
            <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
              Test mode · use card 4242 4242 4242 4242
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
