import { useEffect, useState } from "react";

type Mode = "guests" | "tables" | "room";

// Phrases cycle while AI work is in flight. Aim is editorial and specific —
// a sense that something thoughtful is happening, in plain English for a
// stressed couple, not a progress log for an engineer.
const PHRASES: Record<Mode, string[]> = {
  guests: [
    "Reading your list…",
    "Spotting couples and families…",
    "Sorting names and parties…",
    "Picking up dietary notes…",
    "Tidying the edges…",
    "Almost there…",
  ],
  tables: [
    "Reading your room…",
    "Counting seats and shapes…",
    "Naming the tables…",
    "Almost ready…",
  ],
  room: [
    "Reading your description…",
    "Measuring the room…",
    "Placing the features…",
    "Setting the compass…",
    "Almost done…",
  ],
};

interface Props {
  mode: Mode;
  /** 1-indexed current batch. Only shown when total > 1. */
  batch?: number;
  /** Total number of batches; shows a progress bar when > 1. */
  totalBatches?: number;
}

export function AIProgress({ mode, batch, totalBatches }: Props) {
  const phrases = PHRASES[mode];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % phrases.length), 1600);
    return () => clearInterval(t);
  }, [phrases.length]);

  // Each new batch nudges the phrase forward so progress feels alive.
  useEffect(() => {
    if (batch && totalBatches && totalBatches > 1) {
      setIdx(i => (i + 1) % phrases.length);
    }
  }, [batch, totalBatches, phrases.length]);

  const showBar = !!batch && !!totalBatches && totalBatches > 1;
  const pct = showBar ? Math.round((batch! / totalBatches!) * 100) : 0;

  return (
    <div
      className="rounded-xl border hairline bg-paper-2/40 px-4 py-3.5 flex items-center gap-3"
      role="status"
      aria-live="polite"
    >
      <span className="relative inline-flex h-2 w-2 shrink-0">
        <span className="absolute inset-0 rounded-full bg-terracotta opacity-75 animate-ping" />
        <span className="relative rounded-full bg-terracotta h-2 w-2" />
      </span>
      <div className="flex-1 min-w-0">
        <p
          key={idx}
          className="font-display-italic text-[15px] text-ink-2 leading-tight animate-in fade-in duration-500"
        >
          {phrases[idx]}
        </p>
        {showBar && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-[3px] flex-1 bg-paper-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-olive rounded-full transition-all duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-ink-3 tracking-[0.12em] tabular-nums">
              {batch}/{totalBatches}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
