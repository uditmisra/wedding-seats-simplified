import { Button } from "@/components/ui/button";
import { Upload, UserPlus, LayoutGrid, Download, Sparkles } from "lucide-react";

interface Props {
  onImport: () => void;
  onAddGuest: () => void;
  onAddTable: () => void;
  onBulkTables: () => void;
  onDownloadTemplate: () => void;
}

export function GetStarted({ onImport, onAddGuest, onAddTable, onBulkTables, onDownloadTemplate }: Props) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary" size={20}/>
        <h2 className="font-display text-2xl md:text-3xl">Let's get your plan started</h2>
      </div>
      <p className="text-muted-foreground mt-1">Just describe it — we'll do the rest.</p>

      <div className="grid md:grid-cols-2 gap-3 mt-6">
        <button onClick={onAddGuest} className="text-left rounded-xl border border-border/60 hover:border-primary/60 transition p-5 bg-background/50">
          <UserPlus className="text-primary" size={22}/>
          <div className="font-display text-lg mt-2">Add your guests</div>
          <div className="text-sm text-muted-foreground mt-1">Paste a list, an RSVP email, or type names. AI will structure it.</div>
        </button>
        <button onClick={onAddTable} className="text-left rounded-xl border border-border/60 hover:border-primary/60 transition p-5 bg-background/50">
          <LayoutGrid className="text-primary" size={22}/>
          <div className="font-display text-lg mt-2">Describe your tables</div>
          <div className="text-sm text-muted-foreground mt-1">"10 rounds of 8 + a head table for 6" — done.</div>
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-5 items-center text-sm">
        <span className="text-muted-foreground">Have a spreadsheet?</span>
        <Button variant="outline" size="sm" onClick={onImport}><Upload size={14} className="mr-1.5"/>Import CSV / Excel</Button>
        <Button variant="ghost" size="sm" onClick={onDownloadTemplate}><Download size={14} className="mr-1"/>Download template</Button>
      </div>
    </div>
  );
}