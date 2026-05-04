import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { createRoot, type Root } from "react-dom/client";
import { type ReactElement } from "react";
import type { PaperSize } from "./paperSizes";

interface RenderOptions {
  /** Pixel-density multiplier for html2canvas. 2 = retina-quality. */
  scale?: number;
  /** Background colour to paint behind the captured element. */
  background?: string;
}

/** Wait for webfonts to load so html2canvas captures the right typography. */
async function waitForFonts(): Promise<void> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
}

/**
 * Render a React element off-screen at exact pixel size, then capture it via
 * html2canvas. Returns the captured canvas. Caller is responsible for
 * embedding into a PDF (or wherever else).
 */
export async function captureElement(
  element: ReactElement,
  pxW: number,
  pxH: number,
  opts: RenderOptions = {},
): Promise<HTMLCanvasElement> {
  const { scale = 2, background = "#f3eee3" } = opts;

  // Mount off-screen at native size
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.width = `${pxW}px`;
  host.style.height = `${pxH}px`;
  host.style.pointerEvents = "none";
  document.body.appendChild(host);

  const root: Root = createRoot(host);
  try {
    root.render(element);
    // Let React commit + fonts load before capture.
    await new Promise<void>(r => requestAnimationFrame(() => r()));
    await waitForFonts();
    // One more frame to be safe (some Newsreader weights swap in late).
    await new Promise<void>(r => requestAnimationFrame(() => r()));

    const canvas = await html2canvas(host, {
      scale,
      backgroundColor: background,
      useCORS: true,
      logging: false,
      width: pxW,
      height: pxH,
      windowWidth: pxW,
      windowHeight: pxH,
    });
    return canvas;
  } finally {
    root.unmount();
    document.body.removeChild(host);
  }
}

interface RenderToPdfOptions extends RenderOptions {
  filename: string;
  paper: PaperSize;
}

/**
 * Render a single React element to a single-page PDF and trigger download.
 */
export async function renderToPdf(
  element: ReactElement,
  opts: RenderToPdfOptions,
): Promise<void> {
  const { filename, paper, scale = 2, background } = opts;
  const canvas = await captureElement(element, paper.px.w, paper.px.h, { scale, background });
  const doc = new jsPDF({
    unit: "mm",
    format: paper.format as jsPDF["internal"]["pageSize"]["width"] extends never ? "a4" : "a4",
    orientation: paper.orientation,
  });
  doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, paper.mm.w, paper.mm.h);
  doc.save(filename);
}

/**
 * Render multiple React elements as separate pages into one PDF.
 * Each element is rendered at the same paper size.
 */
export async function renderPagesToPdf(
  elements: ReactElement[],
  opts: RenderToPdfOptions,
): Promise<void> {
  const { filename, paper, scale = 2, background } = opts;
  if (elements.length === 0) return;

  const doc = new jsPDF({
    unit: "mm",
    format: paper.format as jsPDF["internal"]["pageSize"]["width"] extends never ? "a4" : "a4",
    orientation: paper.orientation,
  });

  for (let i = 0; i < elements.length; i++) {
    if (i > 0) doc.addPage(paper.format as "a4", paper.orientation);
    const canvas = await captureElement(elements[i], paper.px.w, paper.px.h, { scale, background });
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, paper.mm.w, paper.mm.h);
  }

  doc.save(filename);
}
