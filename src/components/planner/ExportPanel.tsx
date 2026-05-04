import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import { FileDown, FileText, Printer, Download } from "lucide-react";
import type { Guest, TableDef, Assignment } from "@/lib/types";
import { PaperTable } from "@/components/PaperTable";

interface Props {
  plan: { name: string };
  guests: Guest[];
  tables: TableDef[];
  assignments: Assignment[];
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

export function ExportPanel({ plan, guests, tables, assignments }: Props) {
  const [opts, setOpts] = useState<OptionState>(DEFAULT_OPTIONS);
  const [selected, setSelected] = useState<string>("master");

  const guestById = useMemo(() => new Map(guests.map(g => [g.id, g])), [guests]);
  const tableById = useMemo(() => new Map(tables.map(t => [t.id, t])), [tables]);
  const seatedByTable = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assignments) m.set(a.table_id, (m.get(a.table_id) ?? 0) + 1);
    return m;
  }, [assignments]);

  const masterChartPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(20); doc.text(plan.name, 20, 20);
    doc.setFontSize(13); doc.text("Seating Chart", 20, 28);
    doc.setFontSize(11);
    let y = 40;
    const sorted = [...assignments].sort((a, b) => {
      const ga = guestById.get(a.guest_id)?.name ?? "";
      const gb = guestById.get(b.guest_id)?.name ?? "";
      return ga.localeCompare(gb);
    });
    for (const a of sorted) {
      const g = guestById.get(a.guest_id); const t = tableById.get(a.table_id);
      if (!g || !t) continue;
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(`${g.name}`, 20, y);
      if (opts.showTableNames) doc.text(`${t.name}`, 140, y);
      y += 7;
    }
    doc.save(`${plan.name}-seating-chart.pdf`);
  };

  const byTablePdf = () => {
    const doc = new jsPDF();
    let first = true;
    for (const t of tables) {
      if (!first) doc.addPage(); first = false;
      doc.setFontSize(22); doc.text(t.name, 20, 25);
      if (opts.showCapacity) {
        doc.setFontSize(11); doc.text(`${t.shape} · ${t.capacity} seats`, 20, 33);
      }
      let y = 50;
      const seated = assignments.filter(a => a.table_id === t.id);
      for (const a of seated) {
        const g = guestById.get(a.guest_id);
        if (!g) continue;
        const meal = opts.showDietary && g.meal ? `  —  ${g.meal}` : "";
        doc.text(`• ${g.name}${meal}`, 25, y);
        y += 8;
      }
    }
    doc.save(`${plan.name}-by-table.pdf`);
  };

  const placeCardsPdf = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 99, H = 67;
    const cols = 2, rows = 4;
    let i = 0;
    for (const a of assignments) {
      const g = guestById.get(a.guest_id); const t = tableById.get(a.table_id);
      if (!g || !t) continue;
      const idx = i % (cols * rows);
      if (i > 0 && idx === 0) doc.addPage();
      const col = idx % cols, row = Math.floor(idx / cols);
      const x = 6 + col * (W + 6); const y = 10 + row * (H + 6);
      doc.setDrawColor(180); doc.rect(x, y, W, H);
      doc.setFontSize(20); doc.text(g.name, x + W / 2, y + H / 2 - 4, { align: "center" });
      if (opts.showTableNames) {
        doc.setFontSize(11); doc.setTextColor(120); doc.text(t.name, x + W / 2, y + H / 2 + 6, { align: "center" });
        doc.setTextColor(0);
      }
      i++;
    }
    doc.save(`${plan.name}-place-cards.pdf`);
  };

  const csvExport = () => {
    const rows = [["Name", "Party", "Table", "Meal", "RSVP", "Notes"]];
    for (const a of assignments) {
      const g = guestById.get(a.guest_id); const t = tableById.get(a.table_id);
      if (!g || !t) continue;
      rows.push([g.name, g.party ?? "", t.name, g.meal ?? "", g.rsvp, g.notes ?? ""]);
    }
    const csv = rows.map(r => r.map(c => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${plan.name}-assignments.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formats = [
    {
      id: "master",
      icon: FileText,
      title: "Big seating chart",
      desc: "An A–Z list of who sits where — for the entrance.",
      size: "A4 · PDF",
      action: masterChartPdf,
    },
    {
      id: "by-table",
      icon: FileText,
      title: "One page per table",
      desc: "For your venue or coordinator.",
      size: "A4 · PDF",
      action: byTablePdf,
    },
    {
      id: "place-cards",
      icon: Printer,
      title: "Place cards",
      desc: "Eight per A4 sheet, ready to cut and fold.",
      size: "A4 · 8-up · PDF",
      action: placeCardsPdf,
    },
    {
      id: "csv",
      icon: FileDown,
      title: "Spreadsheet",
      desc: "For the caterer — names, tables, meals.",
      size: "CSV",
      action: csvExport,
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
          Download {active.size.split(" ").pop()}
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
