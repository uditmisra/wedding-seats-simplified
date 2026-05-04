import type { CSSProperties, ReactNode } from "react";

interface ScaledProps {
  w: number;
  h: number;
  scale: number;
  children: ReactNode;
  style?: CSSProperties;
}

/**
 * Wraps a fixed-size element in a scale transform without affecting its
 * intrinsic layout. Used to drop full-size export artifacts into smaller
 * preview slots.
 */
export function Scaled({ w, h, scale, children, style }: ScaledProps) {
  return (
    <div
      style={{
        width: w * scale,
        height: h * scale,
        position: "relative",
        flexShrink: 0,
        ...style,
      }}
    >
      <div
        style={{
          width: w,
          height: h,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
