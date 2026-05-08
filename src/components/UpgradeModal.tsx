import type { ReactNode } from "react";
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
}

export function UpgradeModal({ open, onOpenChange, headline, subhead }: Props) {
  const { openCheckout, loading } = usePaddleCheckout();
  const isTest = getPaddleEnvironment() === "sandbox";

  const start = async () => {
    try { await openCheckout("unlock_lifetime"); }
    catch (e) { console.error(e); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] rounded-[18px] border-ink bg-paper p-0 shadow-elegant paper-grain">
        <div className="px-10 pt-10 pb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-terracotta">
            One-time unlock
          </div>
          <h2 className="mt-3 font-display text-[36px] leading-[1.05] text-ink">
            {headline ?? <>Unlock the <em className="font-display-italic text-terracotta">whole thing.</em></>}
          </h2>
          <p className="mt-4 text-[15px] leading-[1.55] text-ink-2">
            {subhead ?? "One payment unlocks unlimited plans, every PDF export, and sharing — for your account, forever. No subscription. No expiry."}
          </p>

          <div className="mt-7 rounded-xl border border-hairline bg-paper-2/40 px-5 py-4">
            <div className="flex items-baseline justify-between">
              <div className="font-display text-[19px] text-ink">Lifetime unlock</div>
              <div className="font-display text-[28px] text-ink">£10</div>
            </div>
            <ul className="mt-3 space-y-1.5 text-[13px] leading-[1.55] text-ink-2">
              <li>· All four print-ready PDFs (floor plan, index, table cards, place cards)</li>
              <li>· Unlimited plans on this account</li>
              <li>· Share links for collaborators</li>
              <li>· 30-day money-back guarantee</li>
            </ul>
          </div>

          <div className="mt-7 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-ink-3">
              Not now
            </Button>
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