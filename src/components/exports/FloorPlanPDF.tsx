import { PaperSheet, type PaperColor } from "./PaperSheet";
import { tableGeom } from "@/lib/exports/tableGeom";

export interface FloorPlanTable {
  id: string | number;
  /** Display number used inside the circle (italic). */
  num: string | number;
  /** x/y center in canvas coords (W=1100, H=780). */
  x: number;
  y: number;
  seats: number;
  /** Number of seats currently filled. */
  occupied: number;
  /** Optional Newsreader caption below the circle. */
  name?: string;
}

interface Props {
  /** Couple display name. Italic ampersand handled internally. */
  coupleName: string;
  /** Optional ISO date string (YYYY-MM-DD). Renders as "DD MONTH YYYY". */
  eventDate?: string | null;
  /** Plan code shown in footer. */
  planCode: string;
  /** Total guests + tables for footer count. */
  totalGuests: number;
  totalTables: number;
  tables: FloorPlanTable[];
  paper?: PaperColor;
  cutMarks?: boolean;
}

const W = 1100;
const H = 780;

function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase();
}

function splitCoupleName(name: string): { left: string; right: string } | null {
  // "Maya & Jordan" or "Maya and Jordan" → split on the conjunction so we
  // can italicize the ampersand in the middle.
  const m = name.match(/^(.+?)\s+(?:&|and)\s+(.+?)$/i);
  if (!m) return null;
  return { left: m[1].trim(), right: m[2].trim() };
}

export function FloorPlanPDF({
  coupleName,
  eventDate,
  planCode,
  totalGuests,
  totalTables,
  tables,
  paper = "cream",
  cutMarks = false,
}: Props) {
  const split = splitCoupleName(coupleName);
  const longDate = formatLongDate(eventDate);

  return (
    <PaperSheet w={W} h={H} paper={paper} cutMarks={cutMarks}>
      {/* Printer's frame */}
      <div style={{ position: "absolute", inset: 28, border: "1px solid hsl(var(--ink))" }} />
      <div style={{ position: "absolute", inset: 36, border: "0.5px solid hsl(var(--ink-3))" }} />

      {/* Masthead */}
      <div style={{ position: "absolute", top: 64, left: 0, right: 0, textAlign: "center" }}>
        <div
          style={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 11,
            color: "hsl(var(--terracotta))",
            letterSpacing: "0.32em",
            marginBottom: 12,
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          SEATING&nbsp;&nbsp;CHART
        </div>
        <div
          style={{
            fontFamily: "Newsreader, serif",
            fontWeight: 400,
            fontSize: 64,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: "hsl(var(--ink))",
          }}
        >
          {split ? (
            <>
              {split.left}{" "}
              <span style={{ fontStyle: "italic", color: "hsl(var(--terracotta))" }}>&amp;</span>{" "}
              {split.right}
            </>
          ) : (
            coupleName
          )}
        </div>
        {longDate && (
          <div
            style={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: 10,
              color: "hsl(var(--ink-2))",
              marginTop: 14,
              letterSpacing: "0.32em",
            }}
          >
            {longDate}
          </div>
        )}
      </div>

      {/* Room SVG */}
      <svg
        width={W}
        height={H}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <defs>
          <pattern id="fp-floor" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="7" cy="7" r="0.6" fill="hsl(var(--ink-3))" opacity="0.22" />
          </pattern>
        </defs>

        {/* Room canvas */}
        <rect
          x={100}
          y={210}
          width={900}
          height={430}
          fill="url(#fp-floor)"
          stroke="hsl(var(--ink))"
          strokeWidth={1}
        />

        {/* Dance floor */}
        <rect
          x={490}
          y={600}
          width={120}
          height={32}
          fill="hsl(var(--terracotta) / 0.05)"
          stroke="hsl(var(--terracotta))"
          strokeWidth={0.8}
          strokeDasharray="3 3"
        />
        <text
          x={550}
          y={622}
          textAnchor="middle"
          fontFamily="Newsreader, serif"
          fontStyle="italic"
          fontSize={12}
          fill="hsl(var(--terracotta))"
        >
          dance floor
        </text>

        {/* Bar */}
        <rect
          x={120}
          y={610}
          width={120}
          height={22}
          fill="hsl(var(--paper-2))"
          stroke="hsl(var(--ink))"
          strokeWidth={0.5}
        />
        <text
          x={180}
          y={625}
          textAnchor="middle"
          fontFamily="Newsreader, serif"
          fontStyle="italic"
          fontSize={12}
          fill="hsl(var(--ink-2))"
        >
          bar
        </text>

        {/* Entry */}
        <rect
          x={490}
          y={203}
          width={80}
          height={14}
          fill="hsl(var(--paper))"
          stroke="hsl(var(--ink))"
          strokeWidth={0.5}
        />
        <text
          x={530}
          y={214}
          textAnchor="middle"
          fontFamily='"Geist Mono", monospace'
          fontSize={8}
          fill="hsl(var(--ink-3))"
          letterSpacing="0.2em"
        >
          ENTRY
        </text>

        {/* Tables */}
        {tables.map(t => {
          const g = tableGeom(t.seats);
          return (
            <g key={String(t.id)}>
              <circle
                cx={t.x}
                cy={t.y}
                r={g.radius * 0.62}
                fill="hsl(var(--paper))"
                stroke="hsl(var(--ink))"
                strokeWidth={0.9}
              />
              {Array.from({ length: t.seats }).map((_, i) => {
                const a = (i / t.seats) * Math.PI * 2 - Math.PI / 2;
                const sx = t.x + Math.cos(a) * g.radius * 0.85;
                const sy = t.y + Math.sin(a) * g.radius * 0.85;
                return (
                  <circle
                    key={i}
                    cx={sx}
                    cy={sy}
                    r={g.seatR}
                    fill={i < t.occupied ? "hsl(var(--ink))" : "hsl(var(--paper))"}
                    stroke="hsl(var(--ink))"
                    strokeWidth={0.6}
                  />
                );
              })}
              <text
                x={t.x}
                y={t.y + g.numFs * 0.34}
                textAnchor="middle"
                fontFamily="Newsreader, serif"
                fontStyle="italic"
                fontSize={g.numFs}
                fill="hsl(var(--ink))"
              >
                {t.num}
              </text>
              {t.name && (
                <text
                  x={t.x}
                  y={t.y + g.radius + 22}
                  textAnchor="middle"
                  fontFamily="Newsreader, serif"
                  fontSize={11}
                  fill="hsl(var(--ink-2))"
                >
                  {t.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Compass */}
        <g transform="translate(950, 250)">
          <circle r={16} fill="none" stroke="hsl(var(--ink-3))" strokeWidth={0.5} />
          <path d="M 0 -13 L 4 5 L 0 0 L -4 5 Z" fill="hsl(var(--ink))" />
          <text
            y={-19}
            textAnchor="middle"
            fontFamily='"Geist Mono", monospace'
            fontSize={9}
            fill="hsl(var(--ink-3))"
          >
            N
          </text>
        </g>
      </svg>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          left: 60,
          right: 60,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: '"Geist Mono", monospace',
          fontSize: 9,
          color: "hsl(var(--ink-3))",
          letterSpacing: "0.2em",
        }}
      >
        <span>FIG · 01 — FLOOR PLAN — 1:50</span>
        <span>
          {totalGuests} GUESTS · {totalTables} TABLES
        </span>
        <span>SEATLY.APP / {planCode.toUpperCase()}</span>
      </div>
    </PaperSheet>
  );
}
