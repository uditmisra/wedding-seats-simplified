export type FixtureType =
  | "entry" | "dance_floor" | "dj" | "bar" | "stage"
  | "bathroom" | "catering" | "coat_check" | "photo_booth"
  | "annotation" | "compass";

export interface Fixture {
  id: string;
  type: FixtureType;
  label: string;
  /** Fraction of room width: 0 = left wall, 1 = right wall */
  x_pct: number;
  /** Fraction of room height: 0 = top wall, 1 = bottom wall */
  y_pct: number;
  /** Width as fraction of room width (undefined for point features like compass) */
  w_pct?: number;
  /** Height as fraction of room height */
  h_pct?: number;
  visible: boolean;
}

export interface RoomConfig {
  width_m: number;
  height_m: number;
  fixtures: Fixture[];
}

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  width_m: 20,
  height_m: 14,
  fixtures: [
    { id: "entry",       type: "entry",       label: "ENTRY",       x_pct: 0.42, y_pct: -0.01, w_pct: 0.16, h_pct: 0.03,  visible: true  },
    { id: "dj",          type: "dj",          label: "DJ",          x_pct: 0.83, y_pct: 0.03,  w_pct: 0.11, h_pct: 0.07,  visible: true  },
    { id: "bar",         type: "bar",         label: "bar",         x_pct: 0.02, y_pct: 0.82,  w_pct: 0.20, h_pct: 0.07,  visible: true  },
    { id: "dance_floor", type: "dance_floor", label: "dance floor", x_pct: 0.68, y_pct: 0.55,  w_pct: 0.24, h_pct: 0.38,  visible: true  },
    { id: "compass",     type: "compass",     label: "N",           x_pct: 0.95, y_pct: 0.05,                               visible: true  },
  ],
};

export const FIXTURE_META: Record<FixtureType, { label: string; emoji: string; defaultW: number; defaultH: number }> = {
  entry:       { label: "Entry / door",    emoji: "🚪", defaultW: 0.16, defaultH: 0.03 },
  dance_floor: { label: "Dance floor",     emoji: "💃", defaultW: 0.24, defaultH: 0.30 },
  dj:          { label: "DJ booth",        emoji: "🎧", defaultW: 0.11, defaultH: 0.07 },
  bar:         { label: "Bar",             emoji: "🍷", defaultW: 0.20, defaultH: 0.07 },
  stage:       { label: "Stage",           emoji: "🎭", defaultW: 0.30, defaultH: 0.12 },
  bathroom:    { label: "Bathroom",        emoji: "🚻", defaultW: 0.12, defaultH: 0.10 },
  catering:    { label: "Catering station",emoji: "🍽️", defaultW: 0.16, defaultH: 0.10 },
  coat_check:  { label: "Coat check",      emoji: "🧥", defaultW: 0.12, defaultH: 0.10 },
  photo_booth: { label: "Photo booth",     emoji: "📸", defaultW: 0.12, defaultH: 0.12 },
  annotation:  { label: "Text note",       emoji: "✏️", defaultW: 0.22, defaultH: 0.08 },
  compass:     { label: "Compass",         emoji: "🧭", defaultW: 0.04, defaultH: 0.05 },
};

export const FIXTURE_TYPES = Object.keys(FIXTURE_META) as FixtureType[];

/** Convert a RoomConfig into canvas pixel dimensions and a function to map fixture % coords → px. */
export function roomLayout(cfg: RoomConfig, padX = 70, padTop = 90, padBottom = 110) {
  const PX_PER_M = 52;
  const roomW = Math.max(500, Math.min(1200, cfg.width_m * PX_PER_M));
  const roomH = Math.max(350, Math.min(800, cfg.height_m * PX_PER_M));
  const canvasW = roomW + 2 * padX;
  const canvasH = roomH + padTop + padBottom;

  const toCanvas = (f: Fixture) => ({
    x:  padX  + f.x_pct * roomW,
    y:  padTop + f.y_pct * roomH,
    w:  (f.w_pct ?? 0.1) * roomW,
    h:  (f.h_pct ?? 0.06) * roomH,
  });

  return { canvasW, canvasH, roomX: padX, roomY: padTop, roomW, roomH, toCanvas };
}
