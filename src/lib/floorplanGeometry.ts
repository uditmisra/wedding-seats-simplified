import type { TableDef } from "./types";

export interface TableDims {
  box: { w: number; h: number };
  shapeW: number;
  shapeH: number;
  radius: number;
}

export const SEAT_PITCH = 36;
export const SEAT_SIZE = 30;
export const SEAT_GAP = 18;

export function tableDims(t: TableDef): TableDims {
  const cap = Math.max(1, t.capacity);
  if (t.shape === "round") {
    const seatRing = (cap * SEAT_PITCH) / (2 * Math.PI);
    const radius = Math.max(60, seatRing - SEAT_GAP);
    const outer = radius + SEAT_GAP + SEAT_SIZE / 2;
    return { box: { w: outer * 2, h: outer * 2 }, shapeW: radius * 2, shapeH: radius * 2, radius };
  }
  if (t.shape === "square") {
    const side = Math.max(110, (cap * SEAT_PITCH) / 4);
    const outer = side / 2 + SEAT_GAP + SEAT_SIZE / 2;
    return { box: { w: outer * 2, h: outer * 2 }, shapeW: side, shapeH: side, radius: side / 2 };
  }
  const useEnds = cap >= 4;
  const sideTotal = useEnds ? cap - 2 : cap;
  const top = Math.ceil(sideTotal / 2);
  const bot = sideTotal - top;
  const perRow = Math.max(top, bot, 1);
  const minW = t.shape === "head" ? 180 : t.shape === "long" ? 200 : 160;
  const minH = t.shape === "head" ? 64 : t.shape === "long" ? 60 : 90;
  const shapeW = Math.max(minW, (perRow + 1) * SEAT_PITCH);
  const shapeH = minH;
  const padX = (useEnds ? SEAT_GAP + SEAT_SIZE / 2 : 0) + 8;
  const padY = SEAT_GAP + SEAT_SIZE / 2;
  return { box: { w: shapeW + padX * 2, h: shapeH + padY * 2 }, shapeW, shapeH, radius: 0 };
}

/**
 * Seat positions in local table coordinates (centre of table at 0,0).
 */
export function computeSeats(t: TableDef): { x: number; y: number }[] {
  const cap = Math.max(1, t.capacity);
  const d = tableDims(t);
  if (t.shape === "round") {
    const r = d.radius + SEAT_GAP;
    return Array.from({ length: cap }, (_, i) => {
      const angle = (i / cap) * Math.PI * 2 - Math.PI / 2;
      return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
    });
  }
  if (t.shape === "square") {
    const s = d.shapeW;
    const ring = s / 2 + SEAT_GAP;
    const perSide = Math.ceil(cap / 4);
    const seats: { x: number; y: number }[] = [];
    for (let i = 0; i < cap; i++) {
      const sideIdx = Math.floor(i / perSide);
      const slot = i % perSide;
      const t01 = (slot + 1) / (perSide + 1);
      const offset = -s / 2 + s * t01;
      if (sideIdx === 0) seats.push({ x: offset, y: -ring });
      else if (sideIdx === 1) seats.push({ x: ring, y: offset });
      else if (sideIdx === 2) seats.push({ x: -offset, y: ring });
      else seats.push({ x: -ring, y: -offset });
    }
    return seats;
  }
  // Rectangular family (rectangle, long, head)
  const useEnds = cap >= 4;
  const sideTotal = useEnds ? cap - 2 : cap;
  const top = Math.ceil(sideTotal / 2);
  const bot = sideTotal - top;
  const w = d.shapeW, h = d.shapeH;
  const ringY = h / 2 + SEAT_GAP;
  const ringX = w / 2 + SEAT_GAP;
  const seats: { x: number; y: number }[] = [];
  for (let i = 0; i < top; i++) {
    const t01 = (i + 1) / (top + 1);
    seats.push({ x: -w / 2 + w * t01, y: -ringY });
  }
  for (let i = 0; i < bot; i++) {
    const t01 = (i + 1) / (bot + 1);
    seats.push({ x: -w / 2 + w * t01, y: ringY });
  }
  if (useEnds) {
    seats.push({ x: ringX, y: 0 });
    seats.push({ x: -ringX, y: 0 });
  }
  return seats;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
