import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PaperTable } from "@/components/PaperTable";

interface Props {
  /** Plan info for the summary card. */
  planName: string;
  guestCount: number;
  tableCount: number;
  /** Pre-rendered "started X ago" string (e.g. "yesterday"). */
  startedLabel?: string;
  /** Email the modal will attach the plan to. */
  email: string;
  open: boolean;
  busy?: boolean;
  onClaim: () => void;
  onDecline: () => void;
}

/**
 * Editorial claim modal — design surface AuthClaimPlanA. Centered, paper bg,
 * ink border, big shadow. Asks the freshly signed-in user whether to attach
 * the anonymous plan they started to their account.
 */
export function ClaimPlanModal({
  planName,
  guestCount,
  tableCount,
  startedLabel = "today",
  email,
  open,
  busy = false,
  onClaim,
  onDecline,
}: Props) {
  // Approximate occupancy for the mini PaperTable preview — purely visual.
  const sampleSeats = 8;
  const sampleOccupied = Math.min(sampleSeats, Math.round((guestCount / Math.max(1, tableCount)) * sampleSeats / 2));

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onDecline(); }}>
      <DialogContent
        className="max-w-[560px] gap-0 rounded-none border-ink bg-paper p-0 shadow-elegant"
        style={{
          padding: "40px 44px",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.25)",
        }}
      >
        <div className="label-mono mb-4 text-terracotta">SIGNED IN · ONE LAST THING</div>
        <div className="font-display text-[36px] leading-[1.02] tracking-[-0.02em]">
          Bring this plan <span className="font-display-italic">with you?</span>
        </div>
        <p className="mt-3.5 text-[14px] leading-[1.55] text-ink-2">
          You started <strong className="text-ink">{planName}</strong> without an account.
          Attach it to <strong className="text-ink">{email}</strong> so it shows up in your dashboard?
        </p>

        {/* Plan summary mini-card */}
        <div
          className="mt-6 flex items-center gap-3.5 rounded-[10px] border hairline"
          style={{ background: "hsl(var(--paper-2))", padding: 16 }}
        >
          <PaperTable size={48} seats={sampleSeats} occupied={sampleOccupied} accent="hsl(var(--terracotta))" />
          <div className="flex-1 min-w-0">
            <div className="font-display text-[18px] truncate">{planName}</div>
            <div
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3"
              style={{ marginTop: 2 }}
            >
              {guestCount} GUESTS · {tableCount} TABLES · STARTED {startedLabel.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-2.5">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-full border-hairline"
            onClick={onDecline}
            disabled={busy}
          >
            Not this one
          </Button>
          <Button
            type="button"
            className="flex-[2] rounded-full"
            onClick={onClaim}
            disabled={busy}
          >
            {busy ? "Attaching…" : "Yes, attach it"}
            <span className="ml-1 font-display-italic">→</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
