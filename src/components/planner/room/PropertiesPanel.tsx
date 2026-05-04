import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  /** Title of the selected element (e.g. "North wall · in progress" or table name). */
  title: string;
  /** Optional italic suffix highlighted in terracotta (e.g. "in progress"). */
  italicSuffix?: string;
  /** Label shown above the title (e.g. "WALL · SELECTED"). */
  selectedLabel: string;
  /** Property rows: key/value pairs. */
  rows: Array<{ key: string; value: ReactNode; muted?: boolean; mono?: boolean }>;
  /** NEEDS checklist items. Hidden when empty. */
  needs?: Array<{ text: string; ok: "yes" | "no" | "warn" }>;
  /** Primary save action label + handler. Hidden when not provided. */
  saveLabel?: string;
  onSave?: () => void;
}

/**
 * Right sidebar of the Room editor — design surface RoomEditorA properties.
 * WALL · SELECTED label, italic-emphasised title, key/value rows separated
 * by hairline-2 underlines, NEEDS checklist with olive ✓ / terracotta ?
 * markers, and a primary "Done · save room →" button at the bottom.
 */
export function PropertiesPanel({
  title,
  italicSuffix,
  selectedLabel,
  rows,
  needs,
  saveLabel,
  onSave,
}: Props) {
  return (
    <aside
      className="hidden flex-col p-5 lg:flex"
      style={{
        borderLeft: "1px solid hsl(var(--hairline))",
        background: "rgba(255,255,255,0.3)",
        minHeight: 480,
      }}
    >
      <div className="label-mono mb-3.5">{selectedLabel}</div>
      <div className="m-0 font-display text-[22px] leading-[1.05]">
        {title}
        {italicSuffix && (
          <>
            {" "}
            <span className="font-display-italic" style={{ color: "hsl(var(--terracotta))" }}>
              · {italicSuffix}
            </span>
          </>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 text-[13px]">
        {rows.map(r => (
          <div
            key={r.key}
            className="flex items-center justify-between pb-2.5"
            style={{ borderBottom: "1px solid hsl(var(--hairline-2))" }}
          >
            <span className="text-[12px] text-ink-3">{r.key}</span>
            <span
              className="text-[13px]"
              style={{
                color: r.muted ? "hsl(var(--ink-3))" : "hsl(var(--ink))",
                fontFamily: r.mono ? '"Geist Mono", monospace' : undefined,
              }}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>

      {needs && needs.length > 0 && (
        <div className="mt-6 border-t hairline pt-5">
          <div className="label-mono mb-2.5">Needs</div>
          <div
            className="flex flex-col gap-1 text-[12px] text-ink-2"
            style={{ fontFamily: "Newsreader, serif", lineHeight: 1.7 }}
          >
            {needs.map((n, i) => {
              const marker = n.ok === "yes"
                ? <span style={{ color: "hsl(var(--olive))" }}>✓</span>
                : n.ok === "warn"
                  ? <span style={{ color: "hsl(var(--terracotta))" }}>?</span>
                  : <span style={{ color: "hsl(var(--rose))" }}>✕</span>;
              return (
                <div key={i}>
                  · {n.text} {marker}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {saveLabel && (
        <Button
          onClick={onSave}
          className="mt-auto w-full justify-center rounded-full"
        >
          {saveLabel}
          <span className="ml-1 font-display-italic">→</span>
        </Button>
      )}
    </aside>
  );
}
