import { PaperTable } from "@/components/PaperTable";

interface Props {
  /** Couple display name (italic ampersand applied). */
  coupleName: string;
  /** Optional ISO date — rendered as `DD · MM · YYYY` if present. */
  eventDate?: string | null;
  /** Plan code shown in the footer. */
  planCode?: string;
  /** Optional override for the table previews. Defaults to a 2×2 sample. */
  tables?: Array<{ seats: number; occupied: number }>;
}

function formatDateNumeric(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd} · ${mm} · ${yyyy}`;
}

function splitCoupleName(name: string): { left: string; right: string } | null {
  const m = name.match(/^(.+?)\s+(?:&|and)\s+(.+?)$/i);
  if (!m) return null;
  return { left: m[1].trim(), right: m[2].trim() };
}

const DEFAULT_TABLES = [
  { seats: 8, occupied: 6 },
  { seats: 8, occupied: 8 },
  { seats: 8, occupied: 4 },
  { seats: 8, occupied: 7 },
];

/**
 * Right-side illustrative card for the Onboarding two-column page.
 * Tilted -1.5deg, paper-grain-strong backdrop, sample seating chart.
 */
export function SamplePreviewCard({ coupleName, eventDate, planCode, tables }: Props) {
  const split = splitCoupleName(coupleName);
  const previews = tables ?? DEFAULT_TABLES;

  return (
    <div
      className="paper-grain-strong relative h-full overflow-hidden"
      style={{ borderLeft: "1px solid hsl(var(--hairline))" }}
    >
      <div
        className="absolute inset-x-12 inset-y-20 flex flex-col rounded-md border bg-paper"
        style={{
          borderColor: "hsl(var(--hairline))",
          transform: "rotate(-1.5deg)",
          boxShadow: "0 30px 60px -30px rgba(0,0,0,0.25)",
          padding: 36,
          minHeight: 360,
        }}
      >
        <div className="label-mono mb-4">SEATING CHART</div>
        <div className="font-display text-[36px] leading-[1.05]">
          {split ? (
            <>
              {split.left}
              <br />
              <span className="font-display-italic">&amp;</span> {split.right}
            </>
          ) : (
            coupleName
          )}
        </div>
        <div className="mt-2 font-mono text-[13px] text-ink-3">
          {formatDateNumeric(eventDate)}
        </div>

        <div className="mt-9 grid flex-1 grid-cols-2 gap-4">
          {previews.slice(0, 4).map((t, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <PaperTable size={62} seats={t.seats} occupied={t.occupied} />
              <div className="font-mono text-[9px] text-ink-3">
                TABLE {String(i + 1).padStart(2, "0")}
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-auto flex items-center justify-between border-t pt-5 font-mono text-[11px] text-ink-3"
          style={{ borderColor: "hsl(var(--hairline))" }}
        >
          <span>SAMPLE PREVIEW</span>
          <span>wedding seater · {planCode ?? "PLM-2840"}</span>
        </div>
      </div>
    </div>
  );
}
