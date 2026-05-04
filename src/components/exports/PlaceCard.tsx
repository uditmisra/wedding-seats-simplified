import { PaperSheet, type PaperColor } from "./PaperSheet";

interface Props {
  /** Guest name (full). */
  name: string;
  /** Table number/label. */
  table: string | number;
  /** Optional meal label (e.g. "fish", "vegan"). Only shown if `showMeal` true. */
  meal?: string | null;
  /** When false, suppress the meal pill on the front face. */
  showMeal?: boolean;
  paper?: PaperColor;
  cutMarks?: boolean;
}

const W = 600;
const H = 200;

/**
 * Folded tent place card, printed flat. Top half is rotated 180° (back face
 * visible across the table when folded), bottom half is upright (front face
 * visible to the seated guest). Both halves carry the name.
 */
export function PlaceCard({
  name,
  table,
  meal,
  showMeal = true,
  paper = "cream",
  cutMarks = false,
}: Props) {
  return (
    <PaperSheet w={W} h={H} paper={paper} cutMarks={cutMarks}>
      {/* Fold line */}
      <div
        style={{
          position: "absolute",
          top: H / 2,
          left: 0,
          right: 0,
          height: 0,
          borderTop: "0.5px dashed hsl(var(--ink-3))",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: H / 2 - 6,
          left: 12,
          fontFamily: '"Geist Mono", monospace',
          fontSize: 7,
          color: "hsl(var(--ink-3))",
          letterSpacing: "0.2em",
          background: "hsl(var(--paper))",
          padding: "0 4px",
        }}
      >
        FOLD
      </div>

      {/* TOP half — back face, printed upside-down */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: H / 2,
          transform: "rotate(180deg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              fontFamily: "Newsreader, serif",
              fontSize: 22,
              color: "hsl(var(--ink))",
              letterSpacing: "0.01em",
            }}
          >
            {name}
          </div>
          <div style={{ width: 0.5, height: 24, background: "hsl(var(--ink-3))" }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div
              style={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: 7,
                color: "hsl(var(--terracotta))",
                letterSpacing: "0.32em",
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
                fontSize: 22,
                lineHeight: 1,
                color: "hsl(var(--ink))",
              }}
            >
              {table}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM half — front face, upright */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: H / 2,
          width: "100%",
          height: H / 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 32px",
        }}
      >
        <div
          style={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 7,
            color: "hsl(var(--terracotta))",
            letterSpacing: "0.32em",
            marginBottom: 6,
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          · welcome ·
        </div>
        <div
          style={{
            fontFamily: "Newsreader, serif",
            fontSize: 26,
            textAlign: "center",
            lineHeight: 1,
            color: "hsl(var(--ink))",
            letterSpacing: "0.005em",
          }}
        >
          {name}
        </div>
        <div
          style={{
            width: 32,
            height: 0.5,
            background: "hsl(var(--terracotta))",
            margin: "8px 0 6px",
          }}
        />
        <div
          style={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 7,
            color: "hsl(var(--ink-3))",
            letterSpacing: "0.3em",
          }}
        >
          TABLE {table}
          {showMeal && meal ? ` · ${meal.toUpperCase()}` : ""}
        </div>
      </div>
    </PaperSheet>
  );
}
