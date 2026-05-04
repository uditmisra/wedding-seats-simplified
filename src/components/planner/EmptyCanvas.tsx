import { Button } from "@/components/ui/button";
import { PaperTable } from "@/components/PaperTable";

interface Props {
  onAddTables: () => void;
  onAddGuests: () => void;
  onLoadSample?: () => void;
}

/**
 * Editorial empty state for the seating canvas. Ghost dashed tables behind a
 * centered prompt — design-faithful copy: lead with guests-first ("an empty
 * room, ready for everyone"), CTAs add guests primary / sample plan ghost.
 */
export function EmptyCanvas({ onAddTables, onAddGuests, onLoadSample }: Props) {
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
          <div className="label-mono text-terracotta">Blank plan · Let&apos;s begin</div>
          <h2 className="m-0 mt-4 font-display text-[44px] leading-[1.0] tracking-[-0.025em] sm:text-[56px]">
            An empty room,<br />ready for <span className="font-display-italic">everyone.</span>
          </h2>
          <p className="m-0 mt-4 max-w-sm text-[15px] leading-[1.55] text-ink-2">
            Start by adding guests — paste from a spreadsheet, type a few names, or drop a list and we&apos;ll figure it out.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <Button onClick={onAddGuests} className="h-11 rounded-full px-5">
              + Add guests
              <span className="ml-1 font-display-italic">→</span>
            </Button>
            {onLoadSample ? (
              <Button onClick={onLoadSample} variant="outline" className="h-11 rounded-full border-hairline px-5">
                Use a sample plan
              </Button>
            ) : (
              <Button onClick={onAddTables} variant="outline" className="h-11 rounded-full border-hairline px-5">
                Add tables instead
              </Button>
            )}
          </div>
          <p className="mt-6 font-display-italic text-[14px] text-ink-3">
            There&apos;s no wrong way to start. Most couples begin with parents.
          </p>
        </div>
      </div>
    </div>
  );
}
