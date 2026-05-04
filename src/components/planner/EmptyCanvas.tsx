import { Button } from "@/components/ui/button";
import { PaperTable } from "@/components/PaperTable";

interface Props {
  onAddTables: () => void;
  onAddGuests: () => void;
}

/**
 * Editorial empty state for the seating canvas. Ghost dashed tables behind a
 * centered prompt — "a blank plan should still feel intentional".
 */
export function EmptyCanvas({ onAddTables, onAddGuests }: Props) {
  return (
    <div className="paper-grain relative overflow-hidden rounded-2xl border hairline">
      <div className="relative" style={{ minHeight: 480 }}>
        {/* Ghost tables — a soft suggestion of what's coming */}
        <div className="pointer-events-none absolute inset-0">
          <PaperTable size={92} ghost className="absolute" style={{ top: 60, left: "10%" }} />
          <PaperTable size={92} ghost className="absolute" style={{ top: 60, left: "44%" }} />
          <PaperTable size={92} ghost className="absolute" style={{ top: 60, right: "10%" }} />
          <PaperTable size={108} ghost className="absolute" style={{ top: 240, left: "30%" }} />
          <PaperTable size={92} ghost className="absolute" style={{ top: 290, right: "12%" }} />
          <PaperTable size={92} ghost className="absolute" style={{ bottom: 60, left: "16%" }} />
        </div>

        {/* Prompt */}
        <div className="relative mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center sm:py-24">
          <div className="label-mono text-terracotta">Empty canvas</div>
          <h2 className="m-0 mt-4 font-display text-[44px] leading-[1.05] tracking-[-0.02em] sm:text-[56px]">
            Start with the <span className="font-display-italic">tables.</span>
          </h2>
          <p className="m-0 mt-4 max-w-sm text-[15px] leading-[1.55] text-ink-2">
            Add a few tables, then drag your guests onto them. Already have a guest list? Import it and we&apos;ll catch up.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <Button onClick={onAddTables} className="h-11 rounded-full px-5">
              Add tables
              <span className="ml-1 font-display-italic">→</span>
            </Button>
            <Button onClick={onAddGuests} variant="outline" className="h-11 rounded-full border-hairline px-5">
              Import guests
            </Button>
          </div>
          <p className="mt-6 font-display-italic text-[13px] text-ink-3">
            Easier to drag than to type from scratch.
          </p>
        </div>
      </div>
    </div>
  );
}
