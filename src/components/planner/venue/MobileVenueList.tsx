import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { TableDef, Shape, Assignment } from "@/lib/types";
import { type RoomConfig, type FixtureType, DEFAULT_ROOM_CONFIG, FIXTURE_META } from "@/lib/roomConfig";

const SHAPES: Shape[] = ["round", "rectangle", "square", "long", "head"];
const FIXTURE_LIST: FixtureType[] = ["bar", "dj", "dance_floor", "stage", "catering", "photo_booth", "bathroom", "coat_check", "entry"];

interface Props {
  planId: string;
  scenarioId: string;
  tables: TableDef[];
  assignments: Assignment[];
  roomConfig: RoomConfig | null;
  canEdit: boolean;
  onSavedRoom: (cfg: RoomConfig) => void;
  refresh: () => void;
}

export function MobileVenueList({ planId, scenarioId, tables, assignments, roomConfig, canEdit, onSavedRoom, refresh }: Props) {
  const cfg: RoomConfig = {
    width_m: roomConfig?.width_m ?? DEFAULT_ROOM_CONFIG.width_m,
    height_m: roomConfig?.height_m ?? DEFAULT_ROOM_CONFIG.height_m,
    fixtures: Array.isArray(roomConfig?.fixtures) ? roomConfig!.fixtures : DEFAULT_ROOM_CONFIG.fixtures,
  };
  const [editing, setEditing] = useState<TableDef | "new" | null>(null);

  const seatedByTable = new Map<string, number>();
  for (const a of assignments) seatedByTable.set(a.table_id, (seatedByTable.get(a.table_id) ?? 0) + 1);

  const saveRoom = async (next: RoomConfig) => {
    const { error } = await supabase.from("plans").update({ room_config: next as unknown as null }).eq("id", planId);
    if (error) { toast.error(error.message); return; }
    onSavedRoom(next);
  };

  const addFixture = async (type: FixtureType) => {
    const meta = FIXTURE_META[type];
    await saveRoom({ ...cfg, fixtures: [...cfg.fixtures, {
      id: `${type}_${Date.now()}`, type, label: meta.label,
      x_pct: 0.5, y_pct: 0.5, w_pct: meta.defaultW, h_pct: meta.defaultH, visible: true,
    }] });
  };
  const removeFixture = (id: string) => saveRoom({ ...cfg, fixtures: cfg.fixtures.filter(f => f.id !== id) });

  const deleteTable = async (t: TableDef) => {
    const seated = seatedByTable.get(t.id) ?? 0;
    if (seated > 0 && !confirm(`${seated} guest${seated === 1 ? "" : "s"} seated. Delete anyway?`)) return;
    await supabase.from("tables_def").delete().eq("id", t.id);
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border hairline bg-paper-2/40 p-4">
        <div className="label-mono mb-2">Room size</div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[12px] text-ink-3">Width (m)
            <Input type="number" min={4} max={100} value={cfg.width_m} disabled={!canEdit}
              onChange={(e) => saveRoom({ ...cfg, width_m: Math.max(4, Number(e.target.value) || 4) })} className="mt-1 h-10" />
          </label>
          <label className="text-[12px] text-ink-3">Length (m)
            <Input type="number" min={4} max={100} value={cfg.height_m} disabled={!canEdit}
              onChange={(e) => saveRoom({ ...cfg, height_m: Math.max(4, Number(e.target.value) || 4) })} className="mt-1 h-10" />
          </label>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          Open on desktop to drag tables and features into place.
        </p>
      </div>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="m-0 font-display text-[18px]">Tables ({tables.length})</h3>
          {canEdit && (
            <Button size="sm" variant="outline" className="h-8 gap-1 rounded-full border-hairline" onClick={() => setEditing("new")}>
              <Plus size={13} /> Add
            </Button>
          )}
        </div>
        {tables.length === 0 ? (
          <p className="rounded-xl border border-dashed hairline bg-paper-2/40 p-6 text-center text-[13px] text-ink-3">No tables yet.</p>
        ) : (
          <div className="space-y-1.5">
            {tables.map(t => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg border hairline bg-paper p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-[15px]">{t.name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                    {t.shape} · {seatedByTable.get(t.id) ?? 0} / {t.capacity}
                  </div>
                </div>
                {canEdit && (
                  <>
                    <button className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-3 hover:bg-paper-2 hover:text-ink" onClick={() => setEditing(t)} aria-label="Edit"><Pencil size={13} /></button>
                    <button className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-3 hover:bg-rose/10 hover:text-rose" onClick={() => deleteTable(t)} aria-label="Delete"><Trash2 size={13} /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="m-0 font-display text-[18px]">Features ({cfg.fixtures.length})</h3>
          {canEdit && (
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1 rounded-full border-hairline"><Plus size={13} /> Add</Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader><SheetTitle>Add feature</SheetTitle></SheetHeader>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {FIXTURE_LIST.map(t => {
                    const meta = FIXTURE_META[t];
                    return (
                      <button key={t} className="flex items-center gap-2 rounded-lg border hairline bg-paper p-3 text-left" onClick={() => addFixture(t)}>
                        <span>{meta.emoji}</span><span className="text-[13px]">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
        {cfg.fixtures.length === 0 ? (
          <p className="rounded-xl border border-dashed hairline bg-paper-2/40 p-6 text-center text-[13px] text-ink-3">No features yet.</p>
        ) : (
          <div className="space-y-1.5">
            {cfg.fixtures.map(f => {
              const meta = FIXTURE_META[f.type];
              return (
                <div key={f.id} className="flex items-center gap-2 rounded-lg border hairline bg-paper p-3">
                  <span className="text-[16px]">{meta.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px]">{f.label}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">{f.type.replace(/_/g, " ")}</div>
                  </div>
                  {canEdit && (
                    <button className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-3 hover:bg-rose/10 hover:text-rose" onClick={() => removeFixture(f.id)} aria-label="Remove"><Trash2 size={13} /></button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {editing && (
        <TableEditor planId={planId} scenarioId={scenarioId}
          table={editing === "new" ? null : editing} count={tables.length}
          onClose={() => { setEditing(null); refresh(); }} />
      )}
    </div>
  );
}

function TableEditor({ planId, scenarioId, table, count, onClose }: {
  planId: string; scenarioId: string; table: TableDef | null; count: number; onClose: () => void;
}) {
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
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader><SheetTitle>{table ? "Edit table" : "Add table"}</SheetTitle></SheetHeader>
        <div className="mt-3 grid gap-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Seats</Label><Input type="number" min={1} max={30} value={capacity} onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 1))} /></div>
            <div><Label>Shape</Label>
              <Select value={shape} onValueChange={(v) => setShape(v as Shape)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SHAPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}