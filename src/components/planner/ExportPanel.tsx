import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileDown, FileText, Printer, Download } from "lucide-react";
import type { Guest, TableDef, Assignment, ConstraintDef, Plan } from "@/lib/types";
import { PaperTable } from "@/components/PaperTable";
import { exportSeatingChart } from "@/lib/export/seatingChart";
import { exportAlphabeticalChart } from "@/lib/export/alphabeticalChart";
import { exportByTable } from "@/lib/export/byTable";
import { exportPlaceCards } from "@/lib/export/placeCards";
import { exportCsv } from "@/lib/export/csv";

interface Props {
  plan: Plan;
  guests: Guest[];
  tables: TableDef[];
  assignments: Assignment[];
  constraints: ConstraintDef[];
}

interface OptionState {
  showTableNames: boolean;
  showGuestNames: boolean;
  showCapacity: boolean;
  showDietary: boolean;
}

const DEFAULT_OPTIONS: OptionState = {
  showTableNames: true,
  showGuestNames: true,
  showCapacity: true,
  showDietary: true,
};

export function ExportPanel({ plan, guests, tables, assignments, constraints }: Props) {
  const [opts, setOpts] = useState<OptionState>(DEFAULT_OPTIONS);
  const [selected, setSelected] = useState<string>("visual");

  const seatedByTable = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assignments) m.set(a.table_id, (m.get(a.table_id) ?? 0) + 1);
    return m;
  }, [assignments]);

  const formats = [
    {
      id: "visual",
      icon: LayoutDashboard,
      title: "Visual seating chart",
      desc: "The floor plan, framed for the venue entrance.",
      size: "A4 landscape · PDF",
      action: () => exportSeatingChart({
        planName: plan.name, planCode: plan.code,
        tables, guests, assignments,
        showTableNames: opts.showTableNames,
      }),
    },
    {
      id: "master",
      icon: FileText,
      title: "A to Z list",
      desc: "Alphabetical roster of who sits where.",
      size: "A4 · PDF",
      action: () => exportAlphabeticalChart({
        planName: plan.name, planCode: plan.code,
        guests, tables, assignments, showDietary: opts.showDietary,
      }),
    },
    {
      id: "by-table",
      icon: FileText,
      title: "Table sheets",
      desc: "One designed page per table — for your coordinator.",
      size: "A4 · PDF",
      action: () => exportByTable({
        planName: plan.name, planCode: plan.code,
        guests, tables, assignments, constraints,
        showCapacity: opts.showCapacity, showDietary: opts.showDietary,
      }),
    },
    {
      id: "place-cards",
      icon: Printer,
      title: "Place cards",
      desc: "Four per sheet, double-sided, ready to fold.",
      size: "A4 · 4-up · PDF",
      action: () => exportPlaceCards({
        planName: plan.name,
        tables, guests, assignments,
        showDietary: opts.showDietary,
      }),
    },
    {
      id: "csv",
      icon: FileDown,
      title: "Spreadsheet",
      desc: "Full roster — for the caterer or planner.",
      size: "CSV",
      action: () => exportCsv({ planName: plan.name, guests, tables, assignments }),
    },
  ];

  const active = formats.find(f => f.id === selected) ?? formats[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Left — options */}
      <div className="space-y-6">
        <div>
          <h2 className="m-0 font-display text-2xl md:text-[28px]">
            For the <span className="font-display-italic">venue</span>, the <span className="font-display-italic">planner</span>, your fridge.
          </h2>
          <p className="mt-1 text-[13px] text-ink-3">
            Pick a format. Tweak what shows. Print or send.
          </p>
        </div>

        <div>
          <div className="label-mono mb-3">Format</div>
          <div className="grid grid-cols-2 gap-2">
            {formats.map(f => {
              const isActive = selected === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelected(f.id)}
                  className={`flex flex-col gap-1.5 rounded-xl border p-3 text-left transition ${isActive ? "border-ink bg-paper" : "border-hairline bg-paper-2/30 hover:border-ink/40"}`}
                >
                  <f.icon size={16} className={isActive ? "text-terracotta" : "text-ink-3"} />
                  <div className="font-display text-[15px] leading-tight">{f.title}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">{f.size}</div>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-[12px] text-ink-3 leading-snug">{active.desc}</p>

        <div>
          <div className="label-mono mb-3">Include</div>
          <div className="space-y-2">
            <Toggle
              label="Table numbers"
              checked={opts.showTableNames}
              onChange={v => setOpts({ ...opts, showTableNames: v })}
            />
            <Toggle
              label="Guest names"
              checked={opts.showGuestNames}
              onChange={v => setOpts({ ...opts, showGuestNames: v })}
            />
            <Toggle
              label="Capacity"
              checked={opts.showCapacity}
              onChange={v => setOpts({ ...opts, showCapacity: v })}
            />
            <Toggle
              label="Dietary marks"
              checked={opts.showDietary}
              onChange={v => setOpts({ ...opts, showDietary: v })}
            />
          </div>
        </div>

        <Button onClick={active.action} className="w-full rounded-full">
          <Download size={14} className="mr-1.5" />
          Download {active.title}
        </Button>
      </div>

      {/* Right — paper preview */}
      <div className="flex justify-center">
        <PaperPreview
          plan={plan}
          tables={tables}
          guests={guests}
          assignments={assignments}
          opts={opts}
          seatedByTable={seatedByTable}
        />
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 text-[13px] text-ink-2">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${checked ? "bg-ink" : "bg-paper-3"}`}
      >
        <span className={`inline-block size-4 rounded-full bg-paper transition ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

function PaperPreview({
  plan,
  tables,
  guests,
  assignments,
  opts,
  seatedByTable,
}: {
  plan: { name: string };
  tables: TableDef[];
  guests: Guest[];
  assignments: Assignment[];
  opts: OptionState;
  seatedByTable: Map<string, number>;
}) {
  // Lay tables onto a normalized preview grid. Use stored x/y when present; otherwise grid them.
  const layout = useMemo(() => {
    const xs = tables.map(t => t.x);
    const ys = tables.map(t => t.y);
    const useStored = xs.some(x => x !== 0) || ys.some(y => y !== 0);
    const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(tables.length))));
    return tables.map((t, i) => ({
      t,
      cx: useStored ? t.x : (i % cols),
      cy: useStored ? t.y : Math.floor(i / cols),
      seated: seatedByTable.get(t.id) ?? 0,
    }));
  }, [tables, seatedByTable]);

  const bounds = useMemo(() => {
    if (!layout.length) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    return {
      minX: Math.min(...layout.map(l => l.cx)),
      maxX: Math.max(...layout.map(l => l.cx)),
      minY: Math.min(...layout.map(l => l.cy)),
      maxY: Math.max(...layout.map(l => l.cy)),
    };
  }, [layout]);

  const norm = (cx: number, cy: number) => {
    const dx = bounds.maxX - bounds.minX || 1;
    const dy = bounds.maxY - bounds.minY || 1;
    return {
      left: `${((cx - bounds.minX) / dx) * 80 + 10}%`,
      top: `${((cy - bounds.minY) / dy) * 70 + 14}%`,
    };
  };

  return (
    <div
      className="paper-grain w-full max-w-[520px] rounded border hairline shadow-elegant"
      style={{ aspectRatio: "1 / 1.4" }}
    >
      <div className="flex h-full w-full flex-col">
        <div className="flex items-baseline justify-between border-b hairline px-5 py-3">
          <div>
            <div className="font-display text-[20px] leading-tight">{plan.name}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Seating · Fig. 01</div>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            {tables.length} tables · {assignments.length}/{guests.length} seated
          </div>
        </div>
        <div className="relative flex-1">
          {tables.length === 0 ? (
            <div className="flex h-full items-center justify-center font-display-italic text-[14px] text-ink-3">
              Add tables to preview your chart.
            </div>
          ) : (
            layout.map(({ t, cx, cy, seated }) => {
              const pos = norm(cx, cy);
              const previewSeats = Math.min(10, Math.max(4, t.capacity));
              const previewOccupied = Math.min(previewSeats, Math.round((seated / Math.max(1, t.capacity)) * previewSeats));
              return (
                <div
                  key={t.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: pos.left, top: pos.top }}
                >
                  <PaperTable
                    size={50}
                    seats={previewSeats}
                    occupied={previewOccupied}
                    label={opts.showTableNames ? t.name : undefined}
                  />
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between border-t hairline px-5 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">seatly</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">page 1 of 1</span>
        </div>
      </div>
    </div>
  );
}
