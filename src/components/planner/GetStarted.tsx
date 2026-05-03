import { Button } from "@/components/ui/button";
import { Upload, UserPlus, LayoutGrid, Download } from "lucide-react";

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
      <h2 className="font-display text-2xl md:text-3xl">Let's get your plan started</h2>
      <p className="text-muted-foreground mt-1">Bring in your guests and set up tables — you can do these in any order.</p>

      <div className="grid md:grid-cols-3 gap-3 mt-6">
        <div className="rounded-xl border border-border/60 p-5 flex flex-col">
          <Upload className="text-primary" size={22}/>
          <div className="font-display text-lg mt-2">Import guest list</div>
          <div className="text-sm text-muted-foreground mt-1 flex-1">Upload a CSV or Excel file. We'll let you map your columns.</div>
          <div className="flex gap-2 mt-4">
            <Button onClick={onImport}><Upload size={14} className="mr-1.5"/>Choose file</Button>
            <Button variant="ghost" size="sm" onClick={onDownloadTemplate}><Download size={14} className="mr-1"/>Template</Button>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 p-5 flex flex-col">
          <UserPlus className="text-primary" size={22}/>
          <div className="font-display text-lg mt-2">Add guests manually</div>
          <div className="text-sm text-muted-foreground mt-1 flex-1">Type names one by one. Good for small weddings or last-minute additions.</div>
          <div className="mt-4">
            <Button variant="outline" onClick={onAddGuest}><UserPlus size={14} className="mr-1.5"/>Add a guest</Button>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 p-5 flex flex-col">
          <LayoutGrid className="text-primary" size={22}/>
          <div className="font-display text-lg mt-2">Set up tables</div>
          <div className="text-sm text-muted-foreground mt-1 flex-1">Define each table's name, shape, and how many seats it has.</div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={onAddTable}>Add table</Button>
            <Button variant="ghost" size="sm" onClick={onBulkTables}>Bulk add</Button>
          </div>
        </div>
      </div>
    </div>
  );
}