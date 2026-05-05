interface LogoMarkProps {
  size?: number;
  ink?: string;
  accent?: string;
  className?: string;
}

export function LogoMark({ size = 22, ink = "currentColor", accent = "hsl(var(--terracotta))", className }: LogoMarkProps) {
  const cx = size / 2;
  const cy = size / 2;
  const tableR = size * 0.28;
  const seatR = size * 0.085;
  const orbit = size * 0.42;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ display: "block", flexShrink: 0 }}
      aria-hidden
    >
      <circle
        cx={cx}
        cy={cy}
        r={tableR}
        fill="none"
        stroke={ink}
        strokeWidth={Math.max(0.8, size * 0.04)}
      />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * orbit;
        const y = cy + Math.sin(a) * orbit;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={seatR}
            fill={i === 0 ? accent : ink}
          />
        );
      })}
    </svg>
  );
}

interface LogoProps {
  size?: number;
  gap?: number;
  accent?: string;
  ink?: string;
  className?: string;
}

export function Logo({ size = 20, gap = 8, accent, ink, className }: LogoProps) {
  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap }}>
      <LogoMark size={size * 1.15} accent={accent} ink={ink} />
      <span
        className="font-display"
        style={{ fontSize: size, letterSpacing: "-0.015em", lineHeight: 1 }}
      >
        Wedding <span className="font-display-italic">Seater</span>
      </span>
    </div>
  );
}
