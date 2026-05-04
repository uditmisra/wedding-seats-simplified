/**
 * Adaptive table geometry — scales 3 → 30 seats without overlap, per the
 * spec in CLAUDE.md. Returns radius (drawn circle), seat dot radius, and a
 * font size for the inner italic numeral.
 */
export interface TableGeom {
  radius: number;
  seatR: number;
  numFs: number;
}

export function tableGeom(seatCount: number): TableGeom {
  if (seatCount <= 4) return { radius: 36, seatR: 5, numFs: 24 };
  if (seatCount <= 6) return { radius: 42, seatR: 4.5, numFs: 24 };
  if (seatCount <= 8) return { radius: 48, seatR: 4, numFs: 26 };
  if (seatCount <= 10) return { radius: 54, seatR: 4, numFs: 28 };
  if (seatCount <= 14) return { radius: 64, seatR: 3.5, numFs: 30 };
  if (seatCount <= 20) return { radius: 78, seatR: 3, numFs: 32 };
  return { radius: 96, seatR: 2.8, numFs: 34 }; // 21–30
}
