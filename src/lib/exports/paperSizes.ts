/**
 * Paper size definitions for jsPDF document generation.
 * Each entry maps a design-canvas pixel size to a real paper size in mm.
 *
 * The design's pixel ratios closely match the real paper aspect ratios
 * (e.g. design's 1100×780 ≈ 1.41:1 = A2 landscape's 594×420 ratio).
 */

export interface PaperSize {
  /** mm width × height for jsPDF (orientation reflected) */
  mm: { w: number; h: number };
  /** Design-canvas pixel size at native rendering */
  px: { w: number; h: number };
  /** jsPDF format string (or custom array) */
  format: "a2" | "a3" | "a4" | "a5" | [number, number];
  orientation: "portrait" | "landscape";
}

// A2 landscape — 594×420mm
export const FLOOR_PLAN: PaperSize = {
  mm: { w: 594, h: 420 },
  px: { w: 1100, h: 780 },
  format: "a2",
  orientation: "landscape",
};

// A4 portrait — 210×297mm
export const ALPHABETICAL_INDEX: PaperSize = {
  mm: { w: 210, h: 297 },
  px: { w: 480, h: 680 },
  format: "a4",
  orientation: "portrait",
};

// A5 portrait — 148×210mm
export const PER_TABLE_CARD: PaperSize = {
  mm: { w: 148, h: 210 },
  px: { w: 380, h: 540 },
  format: "a5",
  orientation: "portrait",
};

// Folded tent — 170×55mm flat (folds to 85×55mm)
export const PLACE_CARD: PaperSize = {
  mm: { w: 170, h: 55 },
  px: { w: 600, h: 200 },
  format: [170, 55],
  orientation: "landscape",
};
