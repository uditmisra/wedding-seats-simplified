/**
 * Editorial paper-table SVG primitive — circular, ink-stroked, occupied seats
 * filled in the accent (terracotta by default). Used in the landing vignette,
 * the Tables tab cards, the Empty Canvas ghosts, and the Export preview.
 */
export interface PaperTableProps {
  size?: number;
  seats?: number;
  occupied?: number;
  label?: string;
  /** Render the table outline as a dashed ghost (used by EmptyCanvas). */
  ghost?: boolean;
  /** Override the seat-fill colour. Falls back to terracotta. */
  accent?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function PaperTable({
  size = 84,
  seats = 8,
  occupied = 0,
  label,
  ghost = false,
  accent = "hsl(var(--terracotta))",
  className,
  style,
}: PaperTableProps) {
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const seatR = Math.max(3, Math.round(size * 0.075));
  const seatRing = r + Math.max(8, Math.round(size * 0.13));
  const dots = Array.from({ length: seats }).map((_, i) => {
    const a = (i / Math.max(1, seats)) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + Math.cos(a) * seatRing,
      y: cy + Math.sin(a) * seatRing,
      taken: i < occupied,
    };
  });
  const stroke = "hsl(var(--ink))";
  const padding = Math.max(11, seatRing - r + seatR + 2);
  const viewSize = size + padding * 2;
  return (
    <div className={className} style={style}>
      <svg
        width={viewSize}
        height={viewSize}
        viewBox={`${-padding} ${-padding} ${viewSize} ${viewSize}`}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={ghost ? "transparent" : "hsl(var(--paper))"}
          stroke={stroke}
          strokeWidth={ghost ? 1 : 1.25}
          strokeDasharray={ghost ? "4 4" : undefined}
          opacity={ghost ? 0.45 : 1}
        />
        {!ghost && (
          <circle
            cx={cx}
            cy={cy}
            r={r - 6}
            fill="none"
            stroke={stroke}
            strokeWidth={0.5}
            opacity={0.35}
          />
        )}
        {!ghost && seats > 0 && dots.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={seatR}
            fill={d.taken ? accent : "transparent"}
            stroke={stroke}
            strokeWidth={1}
            opacity={d.taken ? 1 : 0.55}
          />
        ))}
      </svg>
      {label && (
        <div className="mt-1 text-center font-mono text-[10px] text-ink-3">{label}</div>
      )}
    </div>
  );
}
