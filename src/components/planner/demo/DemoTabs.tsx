import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

export interface DemoTabDef {
  value: string;
  numeral: string;
  label: string;
  /** Hidden behind the "+ More" pill until the user expands or auto-expand fires. */
  secondary?: boolean;
}

interface Props {
  tabs: DemoTabDef[];
  value: string;
  onChange: (v: string) => void;
  /** When true, all tabs are visible immediately (e.g. after first interaction). */
  forceExpanded?: boolean;
}

/**
 * Progressive-disclosure tab strip for the demo. By default only primary tabs
 * are shown plus a "+ More" pill; clicking expands the rest. Auto-expands once
 * the user signals intent (forceExpanded flips true), so power users see the
 * full set after one drag.
 */
export function DemoTabs({ tabs, value, onChange, forceExpanded }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isExpanded = expanded || forceExpanded;

  // If the active tab is hidden behind "+ More", auto-expand so it's visible.
  useEffect(() => {
    const active = tabs.find(t => t.value === value);
    if (active?.secondary) setExpanded(true);
  }, [value, tabs]);

  const visibleTabs = isExpanded ? tabs : tabs.filter(t => !t.secondary);
  const hiddenCount = isExpanded ? 0 : tabs.filter(t => t.secondary).length;

  return (
    <div className="-mx-1 flex flex-wrap items-center gap-1 overflow-x-auto px-1 pb-1">
      {visibleTabs.map(tab => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`group inline-flex shrink-0 items-baseline gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] transition ${
              active
                ? "bg-ink text-paper"
                : "text-ink-2 hover:bg-paper-2 hover:text-ink"
            }`}
          >
            <span
              className={`font-display-italic text-[12px] ${
                active ? "text-butter" : "text-terracotta"
              }`}
            >
              {tab.numeral}
            </span>
            <span className="font-medium">{tab.label}</span>
          </button>
        );
      })}
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border hairline bg-paper px-3 py-1.5 text-[12px] text-ink-3 transition hover:text-ink"
          title="Show more tabs"
        >
          <span>+ {hiddenCount} more</span>
          <ChevronRight size={11} />
        </button>
      )}
    </div>
  );
}