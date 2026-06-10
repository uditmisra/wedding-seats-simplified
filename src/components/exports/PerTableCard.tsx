import { PaperSheet, type PaperColor } from "./PaperSheet";

interface Props {
  /** Table number/label shown as the giant italic numeral. */
  num: string | number;
  /** Optional table name (e.g. "Aunts & Uncles"). */
  name?: string;
  /** Seated guest names, in the order they should appear. */
  seats: string[];
  /** Couple display name for footer. */
  coupleName: string;
  /** Optional ISO date for the footer (rendered as `DD · MM · YYYY`). */
  eventDate?: string | null;
  paper?: PaperColor;
  cutMarks?: boolean;
}

const W = 380;
const H = 540;

interface Density {
  cols: 1 | 2 | 3;
  lineH: number;
  fs: number;
}

/**
 * Layout density tuned to fit the 332→476 region (148px tall) for any
 * seat count from 3 to 30. Per the spec in CLAUDE.md.
 */
function density(n: number): Density {
  if (n <= 6) return { cols: 1, lineH: 22, fs: 13 };
  if (n <= 12) return { cols: 1, lineH: 18, fs: 13 };
  if (n <= 18) return { cols: 2, lineH: 17, fs: 12 };
  if (n <= 22) return { cols: 2, lineH: 14, fs: 10 };
  if (n <= 24) return { cols: 3, lineH: 14, fs: 10 };
  return { cols: 3, lineH: 13, fs: 10 }; // 25–30
}

function formatNumericDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd} · ${mm} · ${yyyy}`;
}

export function PerTableCard({
  num,
  name,
  seats,
  coupleName,
  eventDate,
  paper = "cream",
  cutMarks = false,
}: Props) {
  const n = seats.length;
  const { cols, lineH, fs } = density(n);
  const numericDate = formatNumericDate(eventDate);

  return (
    <PaperSheet w={W} h={H} paper={paper} cutMarks={cutMarks}>
      <div style={{ position: "absolute", inset: 22, border: "0.5px solid hsl(var(--ink))" }} />
      <div style={{ position: "absolute", inset: 30, border: "0.5px dashed hsl(var(--ink-3))" }} />

      {/* HEADER BLOCK */}
      <div style={{ position: "absolute", top: 60, left: 0, right: 0, textAlign: "center" }}>
        <div
          style={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 9,
            color: "hsl(var(--terracotta))",
            letterSpacing: "0.36em",
            marginBottom: 28,
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          TABLE
        </div>
        <div
          style={{
            fontFamily: "Newsreader, serif",
            fontStyle: "italic",
            fontSize: 110,
            lineHeight: 0.85,
            color: "hsl(var(--ink))",
            letterSpacing: "-0.02em",
          }}
        >
          {num}
        </div>
        {name && (
          <div
            style={{
              fontFamily: "Newsreader, serif",
              fontSize: 16,
              marginTop: 16,
              color: "hsl(var(--ink-2))",
              letterSpacing: "0.01em",
            }}
          >
            {name}
          </div>
        )}
      </div>

      {/* DIVIDER */}
      <div
        style={{
          position: "absolute",
          top: 296,
          left: 56,
          right: 56,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, height: 0.5, background: "hsl(var(--ink-2))" }} />
        <span
          style={{
            fontFamily: "Newsreader, serif",
            fontStyle: "italic",
            fontSize: 12,
            color: "hsl(var(--ink-3))",
            letterSpacing: "0.04em",
          }}
        >
          seated here
        </span>
        <div style={{ flex: 1, height: 0.5, background: "hsl(var(--ink-2))" }} />
      </div>

      {/* SEAT LIST */}
      <div
        style={{
          position: "absolute",
          top: 332,
          left: 28,
          right: 28,
          bottom: 64,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          overflow: "hidden",
        }}
      >
        {cols === 1 ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {seats.map((s, i) => (
              <div
                key={i}
                style={{
                  fontFamily: "Newsreader, serif",
                  fontSize: fs,
                  color: "hsl(var(--ink))",
                  lineHeight: `${lineH}px`,
                  textAlign: "center",
                }}
              >
                {s}
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: cols === 3 ? "1fr 1fr 1fr" : "1fr 1fr",
              columnGap: cols === 3 ? 14 : 22,
              width: "100%",
            }}
          >
            {seats.map((s, i) => {
              const col = i % cols;
              const isLastCol = col === cols - 1;
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: "Newsreader, serif",
                    fontSize: fs,
                    color: "hsl(var(--ink))",
                    lineHeight: `${lineH}px`,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textAlign: cols === 2 ? (col === 0 ? "right" : "left") : "center",
                    paddingRight: cols === 2 && col === 0 ? 6 : 0,
                    paddingLeft: cols === 2 && col === 1 ? 6 : 0,
                    borderRight: !isLastCol ? "0.4px dotted hsl(var(--hairline))" : "none",
                  }}
                >
                  {s}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER — numeric date, never Roman */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: '"Geist Mono", monospace',
          fontSize: 8,
          color: "hsl(var(--ink-3))",
          letterSpacing: "0.32em",
        }}
      >
        {coupleName.toUpperCase()}
        {numericDate && <>&nbsp;&nbsp;·&nbsp;&nbsp;{numericDate}</>}
      </div>
      {/* Maker's mark — every guest reads this card to find their seat, so the
          quiet credit line is the product's single biggest organic surface. */}
      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: '"Geist Mono", monospace',
          fontSize: 5.5,
          color: "hsl(var(--ink-4))",
          letterSpacing: "0.28em",
        }}
      >
        WEDDINGSEATER.APP
      </div>
    </PaperSheet>
  );
}
