import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import { FileDown, FileText, Printer } from "lucide-react";
import type { Guest, TableDef, Assignment } from "@/lib/types";

interface Props {
  plan: { name: string };
  guests: Guest[];
  tables: TableDef[];
  assignments: Assignment[];
}

export function ExportPanel({ plan, guests, tables, assignments }: Props) {
  const guestById = new Map(guests.map(g => [g.id, g]));
  const tableById = new Map(tables.map(t => [t.id, t]));

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
      doc.text(`${t.name}`, 140, y);
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
      doc.setFontSize(11); doc.text(`${t.shape} · ${t.capacity} seats`, 20, 33);
      let y = 50;
      const seated = assignments.filter(a => a.table_id === t.id);
      for (const a of seated) {
        const g = guestById.get(a.guest_id);
        if (!g) continue;
        doc.text(`• ${g.name}${g.meal ? `  —  ${g.meal}` : ""}`, 25, y);
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
      doc.setFontSize(20); doc.text(g.name, x + W/2, y + H/2 - 4, { align: "center" });
      doc.setFontSize(11); doc.setTextColor(120); doc.text(t.name, x + W/2, y + H/2 + 6, { align: "center" });
      doc.setTextColor(0);
      i++;
    }
    doc.save(`${plan.name}-place-cards.pdf`);
  };

  const csvExport = () => {
    const rows = [["Name","Party","Table","Meal","RSVP","Notes"]];
    for (const a of assignments) {
      const g = guestById.get(a.guest_id); const t = tableById.get(a.table_id);
      if (!g || !t) continue;
      rows.push([g.name, g.party ?? "", t.name, g.meal ?? "", g.rsvp, g.notes ?? ""]);
    }
    const csv = rows.map(r => r.map(c => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${plan.name}-assignments.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const items = [
    { icon: FileText, title: "Big seating chart for the entrance", desc: "An A–Z list of who sits where — print and pop it on an easel by the door.", action: masterChartPdf, label: "Download PDF" },
    { icon: FileText, title: "One page per table", desc: "Hand to your venue or coordinator so they know who goes where.", action: byTablePdf, label: "Download PDF" },
    { icon: Printer, title: "Place cards", desc: "Eight per A4 sheet, name and table — ready to cut and fold.", action: placeCardsPdf, label: "Download PDF" },
    { icon: FileDown, title: "Spreadsheet for the caterer", desc: "Names, tables, meals and dietary notes — straight to your caterer.", action: csvExport, label: "Download CSV" },
  ];

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-border/60 bg-card p-5">
          <it.icon className="text-primary" size={22}/>
          <div className="font-display text-lg mt-2">{it.title}</div>
          <div className="text-sm text-muted-foreground mt-1 mb-4">{it.desc}</div>
          <Button variant="outline" onClick={it.action}>{it.label}</Button>
        </div>
      ))}
    </div>
  );
}