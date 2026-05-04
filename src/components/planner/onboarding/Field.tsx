import type { CSSProperties, ReactNode } from "react";

interface Props {
  label: string;
  /** Static value display (read-only) — used for "couple" / "date" type fields. */
  value?: ReactNode;
  /** Optional smaller hint line below the value/border. */
  hint?: string;
  /** When provided, renders an underline-style input instead of the read-only value. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Editorial form field — uppercase mono label, big Newsreader value, ink
 * underline border-bottom. Used inside the Onboarding two-column page.
 */
export function Field({ label, value, hint, children, className, style }: Props) {
  return (
    <div className={className} style={style}>
      <div className="label-mono mb-2">{label}</div>
      {children ? (
        <div className="border-b border-ink pb-2.5">{children}</div>
      ) : (
        <div
          className="border-b border-ink pb-2.5 font-display"
          style={{ fontSize: 22, color: "hsl(var(--ink))" }}
        >
          {value}
        </div>
      )}
      {hint && (
        <div className="mt-1.5 text-[12px] text-ink-3">{hint}</div>
      )}
    </div>
  );
}
