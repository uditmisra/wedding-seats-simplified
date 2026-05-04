import { PaperSheet, type PaperColor } from "./PaperSheet";

export interface AlphaEntry {
  /** Display name, ideally "Last, First" for alphabetisation. */
  name: string;
  /** Table number/identifier the guest is seated at. */
  table: string | number;
}

interface Props {
  /** Couple display name. Italic ampersand handled internally. */
  coupleName: string;
  /** Optional ISO date. Renders as "DD MONTH YYYY" in the masthead. */
  eventDate?: string | null;
  /** Plan code shown in footer. */
  planCode: string;
  /** Entries on this page. Caller is responsible for chunking by page. */
  entries: AlphaEntry[];
  /** Page number (1-indexed). */
  pageIndex: number;
  /** Total pages. */
  pageCount: number;
  paper?: PaperColor;
  cutMarks?: boolean;
}

const W = 480;
const H = 680;

/** Capacity per page when both columns are full at 20px row height. */
export const ALPHA_PER_PAGE_FIRST = 56; // first page (with masthead)
export const ALPHA_PER_PAGE_REST = 84; // subsequent pages (no masthead)

function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase();
}

function splitCoupleName(name: string): { left: string; right: string } | null {
  const m = name.match(/^(.+?)\s+(?:&|and)\s+(.+?)$/i);
  if (!m) return null;
  return { left: m[1].trim(), right: m[2].trim() };
}

export function AlphabeticalIndex({
  coupleName,
  eventDate,
  planCode,
  entries,
  pageIndex,
  pageCount,
  paper = "cream",
  cutMarks = false,
}: Props) {
  const split = splitCoupleName(coupleName);
  const longDate = formatLongDate(eventDate);
  const showMasthead = pageIndex === 1;

  const half = Math.ceil(entries.length / 2);
  const cols = [entries.slice(0, half), entries.slice(half)];

  return (
    <PaperSheet w={W} h={H} paper={paper} cutMarks={cutMarks}>
      <div style={{ position: "absolute", inset: 24, border: "0.5px solid hsl(var(--ink))" }} />

      {/* Header — only on first page */}
      {showMasthead && (
        <div style={{ position: "absolute", top: 52, left: 0, right: 0, textAlign: "center" }}>
          <div
            style={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: 9,
              color: "hsl(var(--terracotta))",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            FIND YOUR NAME
          </div>
          <div
            style={{
              fontFamily: "Newsreader, serif",
              fontSize: 32,
              marginTop: 12,
              lineHeight: 1,
              color: "hsl(var(--ink))",
              letterSpacing: "-0.01em",
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
                fontSize: 8,
                color: "hsl(var(--ink-2))",
                marginTop: 12,
                letterSpacing: "0.28em",
              }}
            >
              {longDate}
            </div>
          )}
          <div style={{ height: 1, background: "hsl(var(--ink))", margin: "20px 56px 0" }} />
        </div>
      )}

      {/* Columns */}
      <div
        style={{
          position: "absolute",
          top: showMasthead ? 188 : 60,
          left: 56,
          right: 56,
          bottom: 72,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: 32,
        }}
      >
        {cols.map((col, ci) => (
          <div key={ci}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "0.5px solid hsl(var(--ink-2))",
                paddingBottom: 8,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: 7,
                  letterSpacing: "0.25em",
                  color: "hsl(var(--ink-3))",
                  textTransform: "uppercase",
                }}
              >
                NAME
              </span>
              <span
                style={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: 7,
                  letterSpacing: "0.25em",
                  color: "hsl(var(--ink-3))",
                  textTransform: "uppercase",
                }}
              >
                TABLE
              </span>
            </div>
            {col.map((entry, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  height: 20,
                  borderBottom: i % 2 === 1 ? "0.4px dotted hsl(var(--hairline))" : "none",
                }}
              >
                <span
                  style={{
                    fontFamily: "Newsreader, serif",
                    fontSize: 11,
                    color: "hsl(var(--ink))",
                    flex: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {entry.name}
                </span>
                <span
                  style={{
                    fontFamily: "Newsreader, serif",
                    fontStyle: "italic",
                    fontSize: 13,
                    color: "hsl(var(--terracotta))",
                    marginLeft: 8,
                    minWidth: 20,
                    textAlign: "right",
                  }}
                >
                  {entry.table}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 56,
          right: 56,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: '"Geist Mono", monospace',
          fontSize: 7,
          color: "hsl(var(--ink-3))",
          letterSpacing: "0.25em",
        }}
      >
        <span>SEATLY · {coupleName.toUpperCase()}</span>
        <span>
          PG {String(pageIndex).padStart(2, "0")} / {String(pageCount).padStart(2, "0")}
        </span>
        <span>SEATLY.APP / {planCode.toUpperCase()}</span>
      </div>
    </PaperSheet>
  );
}
