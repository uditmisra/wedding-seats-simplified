import { jsPDF } from "jspdf";

/**
 * Editorial paper-tone palette mirroring the on-screen design system.
 * jsPDF only ships Helvetica/Times/Courier — we use Times for the display
 * voice (close to Newsreader) and Helvetica for body, keeping bundle small.
 */
export const PAPER: [number, number, number] = [241, 234, 217];
export const PAPER_2: [number, number, number] = [231, 222, 200];
export const INK: [number, number, number] = [44, 41, 31];
export const INK_2: [number, number, number] = [73, 68, 53];
export const INK_3: [number, number, number] = [110, 103, 84];
export const INK_4: [number, number, number] = [156, 148, 126];
export const HAIRLINE: [number, number, number] = [196, 188, 168];
export const TERRACOTTA: [number, number, number] = [183, 90, 53];
export const ROSE: [number, number, number] = [183, 75, 75];
export const OLIVE: [number, number, number] = [120, 120, 60];

export type PageSize = "a4" | "a4-landscape";

export const SIZES = {
  a4: { w: 210, h: 297 },
  "a4-landscape": { w: 297, h: 210 },
};

export function newDoc(size: PageSize = "a4"): jsPDF {
  const orientation = size === "a4-landscape" ? "landscape" : "portrait";
  return new jsPDF({ unit: "mm", format: "a4", orientation });
}

/** Paint the paper-tone background across the whole current page. */
export function paintBackground(doc: jsPDF) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor(...PAPER);
  doc.rect(0, 0, pw, ph, "F");
}

export function setInk(doc: jsPDF, c: [number, number, number] = INK) {
  doc.setTextColor(c[0], c[1], c[2]);
}

export function display(doc: jsPDF, size: number, italic = false) {
  doc.setFont("times", italic ? "italic" : "normal");
  doc.setFontSize(size);
}
export function body(doc: jsPDF, size: number, weight: "normal" | "bold" = "normal") {
  doc.setFont("helvetica", weight);
  doc.setFontSize(size);
}
export function mono(doc: jsPDF, size: number) {
  doc.setFont("courier", "normal");
  doc.setFontSize(size);
}

export function hairline(doc: jsPDF, x1: number, y1: number, x2: number, y2: number) {
  doc.setDrawColor(...HAIRLINE);
  doc.setLineWidth(0.15);
  doc.line(x1, y1, x2, y2);
}

/** Page header with plan name (display) + tagline (mono). */
export function pageHeader(
  doc: jsPDF,
  planName: string,
  tagline: string,
  meta?: string,
) {
  const pw = doc.internal.pageSize.getWidth();
  display(doc, 22);
  setInk(doc, INK);
  doc.text(planName, 14, 18);
  mono(doc, 8);
  setInk(doc, INK_3);
  doc.text(tagline.toUpperCase(), 14, 24);
  if (meta) {
    const tw = doc.getTextWidth(meta.toUpperCase());
    doc.text(meta.toUpperCase(), pw - 14 - tw, 24);
  }
  hairline(doc, 14, 28, pw - 14, 28);
}

export function pageFooter(doc: jsPDF, code: string, pageNum: number, pageTotal: number) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  hairline(doc, 14, ph - 12, pw - 14, ph - 12);
  mono(doc, 7);
  setInk(doc, INK_3);
  doc.text("SEATLY", 14, ph - 7);
  const mid = `${code.toUpperCase()}`;
  const mw = doc.getTextWidth(mid);
  doc.text(mid, (pw - mw) / 2, ph - 7);
  const right = `PAGE ${pageNum} OF ${pageTotal}`;
  const rw = doc.getTextWidth(right);
  doc.text(right, pw - 14 - rw, ph - 7);
}

/** Walk every page and stamp footers (after page count is known). */
export function stampFooters(doc: jsPDF, code: string) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    pageFooter(doc, code, i, total);
  }
}

/** Numeric badge ("T1") with a circle outline. */
export function tableBadge(doc: jsPDF, x: number, y: number, label: string) {
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.4);
  doc.circle(x, y, 8, "S");
  display(doc, 13);
  setInk(doc, INK);
  const w = doc.getTextWidth(label);
  doc.text(label, x - w / 2, y + 1.5);
}

/** Horizontal leader-dot row (for A–Z list rows). */
export function leaderDots(doc: jsPDF, x1: number, x2: number, y: number) {
  doc.setDrawColor(...HAIRLINE);
  doc.setLineDashPattern([0.3, 1.2], 0);
  doc.setLineWidth(0.2);
  doc.line(x1, y, x2, y);
  doc.setLineDashPattern([], 0);
}
