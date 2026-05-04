import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Layers } from "lucide-react";
import type { TableDef, Shape, Assignment } from "@/lib/types";
import { toast } from "sonner";
import { SmartTableInput } from "./SmartTableInput";
import { RoomEditor } from "./RoomEditor";
import { PaperTable } from "@/components/PaperTable";

const SHAPES: Shape[] = ["round", "rectangle", "square", "long", "head"];

interface Props {
  planId: string;
  scenarioId: string;
  tables: TableDef[];
  assignments: Assignment[];
  refresh: () => void;
  autoOpen?: "new" | "bulk" | null;
  onAutoOpenHandled?: () => void;
}

export function TablesTab({ planId, scenarioId, tables, assignments, refresh, autoOpen, onAutoOpenHandled }: Props) {
  const [editing, setEditing] = useState<TableDef | "new" | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [view, setView] = useState<"setup" | "room">(tables.length > 0 ? "room" : "setup");

  useEffect(() => {
    if (autoOpen === "new") { setView("setup"); setEditing("new"); onAutoOpenHandled?.(); }
    else if (autoOpen === "bulk") { setView("setup"); setBulkOpen(true); onAutoOpenHandled?.(); }
  }, [autoOpen, onAutoOpenHandled]);

  const seatedByTable = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments) map.set(a.table_id, (map.get(a.table_id) ?? 0) + 1);
    return map;
  }, [assignments]);

  const totals = useMemo(() => {
    const totalSeats = tables.reduce((s, t) => s + t.capacity, 0);
    const seated = assignments.length;
    const open = Math.max(0, totalSeats - seated);
    return { count: tables.length, seats: totalSeats, seated, open };
  }, [tables, assignments]);

  return (
    <div className="space-y-5">
      {/* View toggle */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-full border-hairline border bg-paper p-0.5 text-sm">
          <button
            onClick={() => setView("room")}
            className={`rounded-full px-3 py-1 transition ${view === "room" ? "bg-ink text-paper" : "text-ink-3 hover:text-ink"}`}
          >Arrange room</button>
          <button
            onClick={() => setView("setup")}
            className={`rounded-full px-3 py-1 transition ${view === "setup" ? "bg-ink text-paper" : "text-ink-3 hover:text-ink"}`}
          >Quick setup</button>
        </div>
      </div>

      {view === "room" ? (
        <RoomEditor planId={planId} scenarioId={scenarioId} tables={tables} assignments={assignments} refresh={refresh} />
      ) : (
        <>
          {/* Totals strip */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border hairline bg-hairline-2 sm:grid-cols-4">
            <Stat label="Tables" value={totals.count} />
            <Stat label="Seats" value={totals.seats} />
            <Stat label="Seated" value={`${totals.seated} / ${totals.seats || 0}`} />
            <Stat label="Open" value={totals.open} />
          </div>

          {/* Main grid + right rail */}
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="m-0 font-display text-2xl md:text-[28px]">
                  Set the <span className="font-display-italic">room.</span>
                </h2>
                <div className="hidden items-center gap-2 sm:flex">
                  <Button size="sm" variant="outline" className="rounded-full border-hairline" onClick={() => setBulkOpen(true)}>
                    <Layers size={14} className="mr-1.5" />Bulk add
                  </Button>
                  <Button size="sm" className="rounded-full" onClick={() => setEditing("new")}>
                    <Plus size={14} className="mr-1.5" />Add table
                  </Button>
                </div>
              </div>

              {tables.length === 0 ? (
                <div className="rounded-2xl border border-dashed hairline bg-paper-2/40 p-12 text-center">
                  <p className="m-0 font-display-italic text-lg text-ink-2">No tables yet.</p>
                  <p className="mt-1 text-sm text-ink-3">Describe your room on the right, or add one by hand.</p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button size="sm" variant="outline" className="rounded-full border-hairline" onClick={() => setBulkOpen(true)}>
                      <Layers size={14} className="mr-1.5" />Bulk add
                    </Button>
                    <Button size="sm" className="rounded-full" onClick={() => setEditing("new")}>
                      <Plus size={14} className="mr-1.5" />Add table
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {tables.map(t => (
                    <TableCard
                      key={t.id}
                      table={t}
                      seated={seatedByTable.get(t.id) ?? 0}
                      onEdit={() => setEditing(t)}
                      onDelete={async () => {
                        const fill = seatedByTable.get(t.id) ?? 0;
                        if (fill > 0 && !confirm(`${fill} guests are seated at this table. Delete anyway?`)) return;
                        await supabase.from("tables_def").delete().eq("id", t.id);
                        refresh();
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setEditing("new")}
                    className="group flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-hairline bg-paper-2/30 p-5 text-ink-3 transition hover:border-terracotta/60 hover:text-terracotta"
                  >
                    <Plus size={20} className="transition group-hover:scale-110" />
                    <span className="font-display-italic text-[15px]">Add another table</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right rail — Smart bulk add */}
            <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <div className="rounded-2xl border hairline bg-paper-2/40 p-5">
                <div className="label-mono mb-2">Smart bulk add</div>
                <p className="m-0 mb-3 font-display-italic text-[13px] leading-snug text-ink-2">
                  Describe the room — we&apos;ll lay it out.
                </p>
                <SmartTableInput planId={planId} scenarioId={scenarioId} existingCount={tables.length} onDone={refresh} />
              </div>
            </aside>
          </div>
        </>
      )}

      {editing && <TableEditor planId={planId} scenarioId={scenarioId} table={editing === "new" ? null : editing} count={tables.length} onClose={() => { setEditing(null); refresh(); }} />}
      {bulkOpen && <BulkAddDialog planId={planId} scenarioId={scenarioId} count={tables.length} onClose={() => { setBulkOpen(false); refresh(); }} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-paper p-4">
      <div className="label-mono">{label}</div>
      <div className="mt-1.5 font-display text-2xl tabular-nums leading-none">{value}</div>
    </div>
  );
}

function TableCard({
  table,
  seated,
  onEdit,
  onDelete,
}: {
  table: TableDef;
  seated: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const over = seated > table.capacity;
  const ratio = Math.min(1, seated / Math.max(1, table.capacity));
  const accent = over ? "hsl(var(--terracotta))" : seated === table.capacity ? "hsl(var(--olive))" : "hsl(var(--terracotta))";
  const previewSeats = Math.min(12, Math.max(4, table.capacity));
  const previewOccupied = Math.min(previewSeats, Math.round((seated / Math.max(1, table.capacity)) * previewSeats));
  return (
    <div className="group relative flex min-h-[180px] flex-col rounded-2xl border hairline bg-paper p-4 transition hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-display text-[20px] leading-tight">{table.name}</div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
            {table.shape} · {table.capacity} seats
          </div>
        </div>
        <PaperTable size={56} seats={previewSeats} occupied={previewOccupied} accent={accent} />
      </div>

      <div className="mt-auto pt-4">
        <div className="flex items-baseline justify-between">
          <span className={`font-mono text-[11px] tabular-nums ${over ? "text-terracotta" : "text-ink-3"}`}>
            {seated} / {table.capacity} seated
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-4">
            {Math.round(ratio * 100)}%
          </span>
        </div>
        <div className="mt-1.5 h-[3px] rounded-full bg-paper-3">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${ratio * 100}%`, background: over ? "hsl(var(--terracotta))" : "hsl(var(--olive))" }}
          />
        </div>
      </div>

      <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          aria-label="Edit"
          onClick={onEdit}
          className="inline-flex size-7 items-center justify-center rounded-full bg-paper/90 text-ink-3 hover:text-ink"
        >
          <Pencil size={12} />
        </button>
        <button
          aria-label="Delete"
          onClick={onDelete}
          className="inline-flex size-7 items-center justify-center rounded-full bg-paper/90 text-ink-3 hover:text-terracotta"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function TableEditor({ planId, scenarioId, table, count, onClose }: { planId: string; scenarioId: string; table: TableDef | null; count: number; onClose: () => void }) {
  const [name, setName] = useState(table?.name ?? `Table ${count + 1}`);
  const [capacity, setCapacity] = useState(table?.capacity ?? 8);
  const [shape, setShape] = useState<Shape>(table?.shape ?? "round");
  const save = async () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    if (table) await supabase.from("tables_def").update({ name, capacity, shape }).eq("id", table.id);
    else await supabase.from("tables_def").insert({ plan_id: planId, scenario_id: scenarioId, name, capacity, shape });
    onClose();
  };
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{table ? "Edit table" : "Add table"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Capacity</Label><Input type="number" min={1} max={30} value={capacity} onChange={e => setCapacity(parseInt(e.target.value) || 1)} /></div>
            <div>
              <Label>Shape</Label>
              <Select value={shape} onValueChange={v => setShape(v as Shape)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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

function BulkAddDialog({ planId, scenarioId, count, onClose }: { planId: string; scenarioId: string; count: number; onClose: () => void }) {
  const [howMany, setHowMany] = useState(10);
  const [capacity, setCapacity] = useState(8);
  const [shape, setShape] = useState<Shape>("round");
  const [prefix, setPrefix] = useState("Table");
  const create = async () => {
    const rows = Array.from({ length: howMany }, (_, i) => ({
      plan_id: planId,
      scenario_id: scenarioId,
      name: `${prefix} ${count + i + 1}`,
      capacity, shape,
      x: (i % 5) * 180,
      y: Math.floor(i / 5) * 180,
    }));
    await supabase.from("tables_def").insert(rows);
    onClose();
  };
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Bulk add tables</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div><Label>How many</Label><Input type="number" min={1} max={50} value={howMany} onChange={e => setHowMany(parseInt(e.target.value) || 1)} /></div>
            <div><Label>Seats each</Label><Input type="number" min={1} max={30} value={capacity} onChange={e => setCapacity(parseInt(e.target.value) || 1)} /></div>
            <div>
              <Label>Shape</Label>
              <Select value={shape} onValueChange={v => setShape(v as Shape)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SHAPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Name prefix</Label><Input value={prefix} onChange={e => setPrefix(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={create}>Create {howMany} tables</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
