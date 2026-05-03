import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Layers } from "lucide-react";
import type { TableDef, Shape, Assignment } from "@/lib/types";
import { toast } from "sonner";

const SHAPES: Shape[] = ["round", "rectangle", "square", "long", "head"];

interface Props {
  planId: string;
  tables: TableDef[];
  assignments: Assignment[];
  refresh: () => void;
  autoOpen?: "new" | "bulk" | null;
  onAutoOpenHandled?: () => void;
}

export function TablesTab({ planId, tables, assignments, refresh, autoOpen, onAutoOpenHandled }: Props) {
  const [editing, setEditing] = useState<TableDef | "new" | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    if (autoOpen === "new") { setEditing("new"); onAutoOpenHandled?.(); }
    else if (autoOpen === "bulk") { setBulkOpen(true); onAutoOpenHandled?.(); }
  }, [autoOpen, onAutoOpenHandled]);

  const seatedCount = (tid: string) => assignments.filter(a => a.table_id === tid).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setEditing("new")}><Plus size={16} className="mr-1.5"/>Add table</Button>
        <Button variant="outline" onClick={() => setBulkOpen(true)}><Layers size={16} className="mr-1.5"/>Bulk add</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tables.length === 0 && <div className="text-muted-foreground p-8 col-span-full text-center">No tables yet.</div>}
        {tables.map(t => {
          const fill = seatedCount(t.id);
          const over = fill > t.capacity;
          return (
            <div key={t.id} className="rounded-xl border border-border/60 bg-card p-4 flex items-center justify-between">
              <div>
                <div className="font-display text-lg">{t.name}</div>
                <div className="text-xs text-muted-foreground capitalize">{t.shape} · {t.capacity} seats</div>
                <div className={`text-sm mt-1 ${over ? "text-destructive" : "text-muted-foreground"}`}>{fill} / {t.capacity} seated</div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(t)}><Pencil size={14}/></Button>
                <Button variant="ghost" size="sm" onClick={async () => {
                  if (fill > 0 && !confirm(`${fill} guests are seated at this table. Delete anyway?`)) return;
                  await supabase.from("tables_def").delete().eq("id", t.id); refresh();
                }}><Trash2 size={14}/></Button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && <TableEditor planId={planId} table={editing === "new" ? null : editing} count={tables.length} onClose={() => { setEditing(null); refresh(); }}/>}
      {bulkOpen && <BulkAddDialog planId={planId} count={tables.length} onClose={() => { setBulkOpen(false); refresh(); }}/>}
    </div>
  );
}

function TableEditor({ planId, table, count, onClose }: { planId: string; table: TableDef | null; count: number; onClose: () => void }) {
  const [name, setName] = useState(table?.name ?? `Table ${count + 1}`);
  const [capacity, setCapacity] = useState(table?.capacity ?? 8);
  const [shape, setShape] = useState<Shape>(table?.shape ?? "round");
  const save = async () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    if (table) await supabase.from("tables_def").update({ name, capacity, shape }).eq("id", table.id);
    else await supabase.from("tables_def").insert({ plan_id: planId, name, capacity, shape });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{table ? "Edit table" : "Add table"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Capacity</Label><Input type="number" min={1} max={30} value={capacity} onChange={e => setCapacity(parseInt(e.target.value) || 1)}/></div>
            <div>
              <Label>Shape</Label>
              <Select value={shape} onValueChange={(v) => setShape(v as Shape)}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{SHAPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkAddDialog({ planId, count, onClose }: { planId: string; count: number; onClose: () => void }) {
  const [howMany, setHowMany] = useState(10);
  const [capacity, setCapacity] = useState(8);
  const [shape, setShape] = useState<Shape>("round");
  const [prefix, setPrefix] = useState("Table");
  const create = async () => {
    const rows = Array.from({ length: howMany }, (_, i) => ({
      plan_id: planId,
      name: `${prefix} ${count + i + 1}`,
      capacity, shape,
      x: (i % 5) * 180,
      y: Math.floor(i / 5) * 180,
    }));
    await supabase.from("tables_def").insert(rows);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Bulk add tables</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div><Label>How many</Label><Input type="number" min={1} max={50} value={howMany} onChange={e => setHowMany(parseInt(e.target.value)||1)}/></div>
            <div><Label>Seats each</Label><Input type="number" min={1} max={30} value={capacity} onChange={e => setCapacity(parseInt(e.target.value)||1)}/></div>
            <div>
              <Label>Shape</Label>
              <Select value={shape} onValueChange={(v) => setShape(v as Shape)}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{SHAPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Name prefix</Label><Input value={prefix} onChange={e => setPrefix(e.target.value)}/></div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={create}>Create {howMany} tables</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}