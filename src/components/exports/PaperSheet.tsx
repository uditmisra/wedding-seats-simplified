import type { CSSProperties, ReactNode } from "react";

export type PaperColor = "cream" | "bone" | "ivory" | "recycled";

const PAPER_COLORS: Record<PaperColor, string> = {
  cream: "hsl(var(--paper))",
  bone: "#ece5d3",
  ivory: "#f6f0df",
  recycled: "#ebe2cd",
};

interface PaperSheetProps {
  w: number;
  h: number;
  paper?: PaperColor;
  /** Show registration tick marks at the four corners. */
  cutMarks?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * The cream paper sheet primitive that all export artifacts sit on.
 * Subtle paper grain, soft drop shadow, fixed pixel dimensions (the design
 * canvas matches print proportions, just at smaller pixel sizes).
 */
export function PaperSheet({
  w,
  h,
  paper = "cream",
  cutMarks = false,
  className,
  style,
  children,
}: PaperSheetProps) {
  return (
    <div
      className={className}
      style={{
        width: w,
        height: h,
        background: PAPER_COLORS[paper],
        boxShadow:
          "0 30px 60px -24px rgba(50,40,20,0.35), 0 4px 10px -2px rgba(50,40,20,0.12)",
        position: "relative",
        backgroundImage:
          "radial-gradient(rgba(74,71,56,0.04) 1px, transparent 1.2px)",
        backgroundSize: "6px 6px",
        flexShrink: 0,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
      {cutMarks && <CutMarks w={w} h={h} />}
    </div>
  );
}

function CutMarks({ w, h }: { w: number; h: number }) {
  const len = 12;
  const off = 6;
  const stroke = "hsl(var(--ink-3))";
  return (
    <svg width={w} height={h} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* Top-left */}
      <line x1={off} y1={off} x2={off + len} y2={off} stroke={stroke} strokeWidth={0.5} />
      <line x1={off} y1={off} x2={off} y2={off + len} stroke={stroke} strokeWidth={0.5} />
      {/* Top-right */}
      <line x1={w - off - len} y1={off} x2={w - off} y2={off} stroke={stroke} strokeWidth={0.5} />
      <line x1={w - off} y1={off} x2={w - off} y2={off + len} stroke={stroke} strokeWidth={0.5} />
      {/* Bottom-left */}
      <line x1={off} y1={h - off} x2={off + len} y2={h - off} stroke={stroke} strokeWidth={0.5} />
      <line x1={off} y1={h - off - len} x2={off} y2={h - off} stroke={stroke} strokeWidth={0.5} />
      {/* Bottom-right */}
      <line x1={w - off - len} y1={h - off} x2={w - off} y2={h - off} stroke={stroke} strokeWidth={0.5} />
      <line x1={w - off} y1={h - off - len} x2={w - off} y2={h - off} stroke={stroke} strokeWidth={0.5} />
    </svg>
  );
}
