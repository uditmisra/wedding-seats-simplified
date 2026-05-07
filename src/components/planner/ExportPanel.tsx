import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Printer, Lock } from "lucide-react";
import type { Assignment, ConstraintDef, Guest, Plan, TableDef } from "@/lib/types";
import { Scaled } from "@/components/exports/Scaled";
import { PaperSheet, type PaperColor } from "@/components/exports/PaperSheet";
import { FloorPlanPDF, type FloorPlanTable } from "@/components/exports/FloorPlanPDF";
import { AlphabeticalIndex, type AlphaEntry } from "@/components/exports/AlphabeticalIndex";
import { PerTableCard } from "@/components/exports/PerTableCard";
import { PlaceCard } from "@/components/exports/PlaceCard";
import { exportFloorPlan } from "@/lib/exports/exportFloorPlan";
import { exportAlphabeticalIndex } from "@/lib/exports/exportAlphabeticalIndex";
import { exportPerTableCards } from "@/lib/exports/exportPerTableCards";
import { exportPlaceCards } from "@/lib/exports/exportPlaceCards";
import { exportCsv } from "@/lib/exports/csv";
import { toast } from "sonner";
import { useUnlock } from "@/hooks/useUnlock";
import { UpgradeModal } from "@/components/UpgradeModal";

interface Props {
  plan: Plan;
  guests: Guest[];
  tables: TableDef[];
  assignments: Assignment[];
  constraints: ConstraintDef[];
}

type FormatKey = "floor" | "alpha" | "table" | "place";

const FORMATS: Array<{
  k: FormatKey;
  label: string;
  size: string;
  desc: string;
}> = [
  { k: "floor", label: "Floor plan", size: "A2 landscape", desc: "Wall chart for the venue." },
  { k: "alpha", label: "Alphabetical", size: "A4 · paged", desc: "Find-your-name list at the entry." },
  { k: "table", label: "Per-table cards", size: "A5 · per table", desc: "Adapts to 3–30 seats per table." },
  { k: "place", label: "Place cards", size: "85 × 55 mm", desc: "Folded tents at each setting." },
];

const PAPERS: Array<{ k: PaperColor; label: string; swatch: string }> = [
  { k: "cream", label: "Cream", swatch: "hsl(var(--paper))" },
  { k: "bone", label: "Bone", swatch: "#ece5d3" },
  { k: "ivory", label: "Ivory", swatch: "#f6f0df" },
  { k: "recycled", label: "Recycled", swatch: "#ebe2cd" },
];

export function ExportPanel({ plan, guests, tables, assignments }: Props) {
  const [format, setFormat] = useState<FormatKey>("floor");
  const [paper, setPaper] = useState<PaperColor>("cream");
  const [showMeal, setShowMeal] = useState(true);
  const { isPaid } = useUnlock();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [cutMarks, setCutMarks] = useState(true);
  const [greyscale, setGreyscale] = useState(false);
  const [busy, setBusy] = useState(false);

  const attending = guests.filter(g => g.rsvp === "attending" || g.rsvp === "maybe").length;
  const seated = assignments.length;
  const seatedPct = attending > 0 ? Math.round((seated / attending) * 100) : 100;
  const showSeatingWarning = attending > 0 && seatedPct < 80;

  // ── Preview data ─────────────────────────────────────────────────
  const previewFloorTables = useMemo<FloorPlanTable[]>(() => {
    const seatedByTable = new Map<string, number>();
    for (const a of assignments) {
      seatedByTable.set(a.table_id, (seatedByTable.get(a.table_id) ?? 0) + 1);
    }
    return tables.map((t, i) => ({
      id: t.id,
      num: i + 1,
      x: 150 + (i % 5) * 160,
      y: 270 + Math.floor(i / 5) * 220,
      seats: t.capacity,
      occupied: Math.min(seatedByTable.get(t.id) ?? 0, t.capacity),
      name: t.name,
    }));
  }, [tables, assignments]);

  const previewAlphaEntries = useMemo<AlphaEntry[]>(() => {
    const tableNumByTableId = new Map(tables.map((t, i) => [t.id, i + 1]));
    const guestById = new Map(guests.map(g => [g.id, g]));
    return assignments
      .map((a): AlphaEntry | null => {
        const g = guestById.get(a.guest_id);
        const tableNum = tableNumByTableId.get(a.table_id);
        if (!g || tableNum === undefined) return null;
        const parts = g.name.trim().split(/\s+/);
        const name = parts.length < 2
          ? g.name
          : `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}`;
        return { name, table: tableNum };
      })
      .filter((e): e is AlphaEntry => e !== null)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 56); // first page only in preview
  }, [tables, assignments, guests]);

  const previewTable = useMemo(() => {
    if (tables.length === 0) {
      return { num: 1, name: "Sample table", seats: ["First Last", "Second Last", "Third Last", "Fourth Last", "Fifth Last", "Sixth Last"] };
    }
    const t = tables[0];
    const guestById = new Map(guests.map(g => [g.id, g]));
    const seats = assignments
      .filter(a => a.table_id === t.id)
      .sort((a, b) => (a.seat_index ?? 0) - (b.seat_index ?? 0))
      .map(a => guestById.get(a.guest_id)?.name)
      .filter((n): n is string => !!n);
    return { num: 1, name: t.name, seats: seats.length ? seats : ["(empty)"] };
  }, [tables, assignments, guests]);

  const previewPlaceCard = useMemo(() => {
    const guestById = new Map(guests.map(g => [g.id, g]));
    const tableNumByTableId = new Map(tables.map((t, i) => [t.id, i + 1]));
    const first = assignments[0];
    if (first) {
      const g = guestById.get(first.guest_id);
      const num = tableNumByTableId.get(first.table_id);
      if (g && num !== undefined) {
        return { name: g.name, table: num, meal: g.meal ?? null };
      }
    }
    return { name: "Eleanor Albertson", table: 5, meal: "fish" };
  }, [tables, assignments, guests]);

  // ── Preview render ──────────────────────────────────────────────
  const preview = (() => {
    switch (format) {
      case "floor":
        return (
          <Scaled w={1100} h={780} scale={0.55}>
            <FloorPlanPDF
              coupleName={plan.name}
              eventDate={plan.event_date}
              planCode={plan.code}
              totalGuests={guests.length}
              totalTables={tables.length}
              tables={previewFloorTables}
              paper={paper}
              cutMarks={cutMarks}
            />
          </Scaled>
        );
      case "alpha":
        return (
          <Scaled w={480} h={680} scale={0.78}>
            <AlphabeticalIndex
              coupleName={plan.name}
              eventDate={plan.event_date}
              planCode={plan.code}
              entries={previewAlphaEntries}
              pageIndex={1}
              pageCount={Math.max(1, Math.ceil(assignments.length / 84))}
              paper={paper}
              cutMarks={cutMarks}
            />
          </Scaled>
        );
      case "table":
        return (
          <Scaled w={380} h={540} scale={0.95}>
            <PerTableCard
              num={previewTable.num}
              name={previewTable.name}
              seats={previewTable.seats}
              coupleName={plan.name}
              eventDate={plan.event_date}
              paper={paper}
              cutMarks={cutMarks}
            />
          </Scaled>
        );
      case "place":
        return (
          <Scaled w={600} h={200} scale={0.95}>
            <PlaceCard
              name={previewPlaceCard.name}
              table={previewPlaceCard.table}
              meal={previewPlaceCard.meal}
              showMeal={showMeal}
              paper={paper}
              cutMarks={cutMarks}
            />
          </Scaled>
        );
    }
  })();

  // ── Download handlers ──────────────────────────────────────────
  const handleDownload = async () => {
    if (!isPaid) { setUpgradeOpen(true); return; }
    setBusy(true);
    try {
      switch (format) {
        case "floor":
          await exportFloorPlan({ plan, tables, guests, assignments, paper, cutMarks });
          break;
        case "alpha":
          await exportAlphabeticalIndex({ plan, tables, guests, assignments, paper, cutMarks });
          break;
        case "table":
          await exportPerTableCards({ plan, tables, guests, assignments, paper, cutMarks });
          break;
        case "place":
          await exportPlaceCards({ plan, tables, guests, assignments, paper, cutMarks, showMeal });
          break;
      }
    } catch (e) {
      console.error(e);
      toast.error((e as Error)?.message ?? "Couldn't generate the PDF");
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const activeFormat = FORMATS.find(f => f.k === format)!;

  return (
    <div className="overflow-hidden rounded-2xl border hairline bg-paper">
      <div className="grid lg:grid-cols-[320px_1fr]">
        {/* Left panel — chooser */}
        <div className="flex flex-col gap-7 border-b hairline p-6 lg:border-b-0 lg:border-r lg:p-8">
          <div>
            <div className="label-mono mb-2">Export</div>
            <h2 className="m-0 font-display text-[32px] leading-[1.05]">
              Print the <span className="font-display-italic">chart</span>
            </h2>
            <p className="mt-2 text-[12px] leading-[1.6] text-ink-3">
              Four print-ready artifacts. Newsreader on cream paper. Cut marks and bleeds included.
            </p>
            {showSeatingWarning && (
              <div className="mt-4 rounded-lg border border-butter/60 bg-butter/20 px-3 py-2.5">
                <p className="font-mono text-[11px] text-ink-2">
                  <span className="font-semibold text-ink">{seatedPct}% seated</span>
                  {" — "}{seated} of {attending} expected guests have a seat.
                  Export now for a draft, or finish seating first.
                </p>
              </div>
            )}
          </div>

          {/* FORMAT */}
          <div>
            <div className="label-mono mb-3">Format</div>
            <div className="flex flex-col gap-2">
              {FORMATS.map(f => {
                const active = format === f.k;
                return (
                  <button
                    key={f.k}
                    type="button"
                    onClick={() => setFormat(f.k)}
                    className={`rounded-[10px] border p-3.5 text-left transition ${active ? "border-ink bg-paper" : "border-hairline bg-transparent hover:bg-paper-2/40"}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex size-3 shrink-0 rounded-full border border-ink"
                        style={{
                          background: active ? "hsl(var(--ink))" : "transparent",
                          boxShadow: active ? "inset 0 0 0 2.5px hsl(var(--paper))" : "none",
                        }}
                      />
                      <span className="flex-1 text-[13px] font-medium">{f.label}</span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
                        {f.size}
                      </span>
                    </div>
                    <div className="mt-2 pl-6 font-display text-[11px] text-ink-3">
                      {f.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PAPER */}
          <div>
            <div className="label-mono mb-3">Paper</div>
            <div className="flex gap-2">
              {PAPERS.map(p => (
                <button
                  key={p.k}
                  type="button"
                  onClick={() => setPaper(p.k)}
                  className={`flex-1 rounded-[8px] border px-2 py-3 text-center text-[10px] transition ${paper === p.k ? "border-ink" : "border-hairline hover:border-ink/50"}`}
                  style={{ background: p.swatch, borderWidth: paper === p.k ? 1.5 : 1 }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* OPTIONS */}
          <div>
            <div className="label-mono mb-3">Options</div>
            <div className="flex flex-col gap-3 text-[13px]">
              <Toggle
                label="Show meal choice"
                checked={showMeal}
                onChange={setShowMeal}
              />
              <Toggle
                label="Cut marks & bleeds"
                checked={cutMarks}
                onChange={setCutMarks}
              />
              <Toggle
                label="Greyscale"
                checked={greyscale}
                onChange={setGreyscale}
              />
            </div>
          </div>

          {/* Action row */}
          <div className="mt-auto flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-full border-hairline"
                onClick={handlePrint}
                disabled={busy}
              >
                <Printer size={14} className="mr-1.5" />
                Print
              </Button>
              <Button
                className="flex-[2] rounded-full"
                onClick={handleDownload}
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Loader2 size={14} className="mr-1.5 animate-spin" />
                    Rendering…
                  </>
                ) : (
                  <>
                    <Download size={14} className="mr-1.5" />
                    Download PDF
                    <span className="ml-1 font-display-italic">↓</span>
                  </>
                )}
              </Button>
            </div>
            <button
              type="button"
              onClick={() => exportCsv({ planName: plan.name, guests, tables, assignments })}
              className="text-[11px] text-ink-3 underline-offset-4 hover:text-ink hover:underline"
            >
              Or download a caterer&apos;s spreadsheet (CSV) →
            </button>
          </div>
        </div>

        {/* Right preview stage */}
        <div
          className="relative flex min-h-[280px] items-center justify-center overflow-hidden p-6 lg:min-h-[540px] lg:p-10"
          style={{ background: "linear-gradient(180deg, #2b2820 0%, #181610 100%)" }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)",
            }}
          />
          <div
            className="relative"
            style={{ filter: greyscale ? "grayscale(1)" : undefined }}
          >
            {preview ?? (
              <PaperSheet w={400} h={300}>
                <div className="flex h-full items-center justify-center font-display-italic text-ink-3">
                  No preview available.
                </div>
              </PaperSheet>
            )}
          </div>
          <div
            className="absolute left-6 top-5 font-mono uppercase"
            style={{
              fontSize: 10,
              color: "rgba(255,250,235,0.6)",
              letterSpacing: "0.25em",
            }}
          >
            Proof · Preview
          </div>
          <div
            className="absolute bottom-5 right-6 font-mono uppercase"
            style={{
              fontSize: 10,
              color: "rgba(255,250,235,0.6)",
              letterSpacing: "0.25em",
            }}
          >
            {activeFormat.size.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-[13px] text-ink-2">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-4 w-7 items-center rounded-full transition ${checked ? "bg-olive" : "bg-paper-3"}`}
      >
        <span
          className={`inline-block size-3 rounded-full bg-paper transition ${checked ? "translate-x-[14px]" : "translate-x-[2px]"}`}
        />
      </button>
    </label>
  );
}
