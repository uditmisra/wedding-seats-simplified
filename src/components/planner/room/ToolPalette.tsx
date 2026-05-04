import type { Dispatch, SetStateAction } from "react";

export type RoomTool =
  | "wall"
  | "door"
  | "window"
  | "stage"
  | "dance-floor"
  | "dj"
  | "bar"
  | "text";

const TOOLS: Array<{ k: RoomTool; icon: string; label: string; shortcut: string }> = [
  { k: "wall", icon: "╱", label: "Wall", shortcut: "W" },
  { k: "door", icon: "◳", label: "Door", shortcut: "D" },
  { k: "window", icon: "◇", label: "Window", shortcut: "I" },
  { k: "stage", icon: "▭", label: "Stage", shortcut: "S" },
  { k: "dance-floor", icon: "▣", label: "Dance floor", shortcut: "F" },
  { k: "dj", icon: "◉", label: "DJ booth", shortcut: "J" },
  { k: "bar", icon: "🍷", label: "Bar", shortcut: "B" },
  { k: "text", icon: "T", label: "Text label", shortcut: "L" },
];

interface SnapState {
  grid: boolean;
  edges: boolean;
  ninetyDeg: boolean;
  otherWalls: boolean;
}

interface Props {
  activeTool: RoomTool;
  onToolChange: (t: RoomTool) => void;
  snap: SnapState;
  onSnapChange: Dispatch<SetStateAction<SnapState>>;
}

/**
 * Left sidebar of the Room editor — design surface RoomEditorA palette.
 * Eight drawing tools (wall, door, window, stage, dance floor, DJ, bar,
 * text label) and four snap toggles. Phase 6a renders this as a visual
 * frame; phase 6b+ wires actual drawing.
 */
export function ToolPalette({ activeTool, onToolChange, snap, onSnapChange }: Props) {
  return (
    <aside
      className="hidden flex-col p-5 lg:flex"
      style={{
        borderRight: "1px solid hsl(var(--hairline))",
        background: "rgba(255,255,255,0.3)",
        minHeight: 480,
      }}
    >
      <div className="label-mono mb-3.5">Draw</div>
      <div className="flex flex-col gap-1.5">
        {TOOLS.map(t => {
          const active = activeTool === t.k;
          return (
            <button
              key={t.k}
              type="button"
              onClick={() => onToolChange(t.k)}
              className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] transition"
              style={{
                background: active ? "hsl(var(--paper))" : "transparent",
                border: `1px solid ${active ? "hsl(var(--hairline))" : "transparent"}`,
              }}
            >
              <span
                style={{
                  width: 22,
                  textAlign: "center",
                  fontFamily: "Newsreader, serif",
                  fontSize: 15,
                  color: "hsl(var(--ink))",
                }}
              >
                {t.icon}
              </span>
              <span className="flex-1 text-left">{t.label}</span>
              <span
                style={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: 10,
                  color: "hsl(var(--ink-3))",
                  letterSpacing: "0.08em",
                }}
              >
                {t.shortcut}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 border-t hairline pt-5">
        <div className="label-mono mb-3">Snap</div>
        <div className="flex flex-col gap-2.5 text-[13px]">
          <SnapToggle
            label="Grid (50cm)"
            value={snap.grid}
            onChange={v => onSnapChange(s => ({ ...s, grid: v }))}
          />
          <SnapToggle
            label="Edges"
            value={snap.edges}
            onChange={v => onSnapChange(s => ({ ...s, edges: v }))}
          />
          <SnapToggle
            label="90° angles"
            value={snap.ninetyDeg}
            onChange={v => onSnapChange(s => ({ ...s, ninetyDeg: v }))}
          />
          <SnapToggle
            label="Other walls"
            value={snap.otherWalls}
            onChange={v => onSnapChange(s => ({ ...s, otherWalls: v }))}
          />
        </div>
      </div>
    </aside>
  );
}

function SnapToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between">
      <span className="text-ink-2">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className="relative inline-flex h-[14px] w-[26px] items-center rounded-full transition"
        style={{ background: value ? "hsl(var(--olive))" : "hsl(var(--paper-3))" }}
      >
        <span
          className="absolute top-0.5 inline-block size-2.5 rounded-full bg-paper transition"
          style={{ left: value ? 14 : 2 }}
        />
      </button>
    </label>
  );
}
