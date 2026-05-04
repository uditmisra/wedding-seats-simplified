import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Plus, RotateCw, Trash2, X, Maximize2 } from "lucide-react";
import type { TableDef, Shape, Assignment } from "@/lib/types";
import { toast } from "sonner";

const SHAPES: Shape[] = ["round", "rectangle", "square", "long", "head"];
const CANVAS_W = 1400;
const CANVAS_H = 900;

interface Props {
  planId: string;
  scenarioId: string;
  tables: TableDef[];
  assignments: Assignment[];
  refresh: () => void;
}

/**
 * The room editor: an HTML canvas where each table can be dragged to its
 * exact spot, rotated, and edited. Positions live in tables_def.x / .y / .rotation.
 */
export function RoomEditor({ planId, scenarioId, tables, assignments, refresh }: Props) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; mode: "move" | "rotate"; offsetX: number; offsetY: number; startAngle: number; startRot: number } | null>(null);
  // local positions during drag for snappy feedback
  const [localPos, setLocalPos] = useState<Record<string, { x: number; y: number; rotation: number }>>({});

  // Auto-lay-out tables that are stacked at (0,0)
  useEffect(() => {
    const stacked = tables.filter(t => t.x === 0 && t.y === 0);
    if (stacked.length > 1) {
      stacked.forEach(async (t, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 180 + col * 280;
        const y = 180 + row * 240;
        await supabase.from("tables_def").update({ x, y }).eq("id", t.id);
      });
      setTimeout(refresh, 300);
    }
  }, [tables.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const seatedCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assignments) m.set(a.table_id, (m.get(a.table_id) ?? 0) + 1);
    return m;
  }, [assignments]);

  const selected = tables.find(t => t.id === selectedId) ?? null;

  const tableAt = (t: TableDef) => localPos[t.id] ?? { x: t.x, y: t.y, rotation: t.rotation };

  const onPointerDownTable = (e: React.PointerEvent, t: TableDef) => {
    e.stopPropagation();
    setSelectedId(t.id);
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const scale = rect.width / CANVAS_W;
    const px = (e.clientX - rect.left) / scale;
    const py = (e.clientY - rect.top) / scale;
    const pos = tableAt(t);
    setDrag({ id: t.id, mode: "move", offsetX: px - pos.x, offsetY: py - pos.y, startAngle: 0, startRot: pos.rotation });
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerDownRotate = (e: React.PointerEvent, t: TableDef) => {
    e.stopPropagation();
    setSelectedId(t.id);
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const scale = rect.width / CANVAS_W;
    const px = (e.clientX - rect.left) / scale;
    const py = (e.clientY - rect.top) / scale;
    const pos = tableAt(t);
    const startAngle = Math.atan2(py - pos.y, px - pos.x) * 180 / Math.PI;
    setDrag({ id: t.id, mode: "rotate", offsetX: 0, offsetY: 0, startAngle, startRot: pos.rotation });
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const scale = rect.width / CANVAS_W;
    const px = (e.clientX - rect.left) / scale;
    const py = (e.clientY - rect.top) / scale;
    const t = tables.find(x => x.id === drag.id); if (!t) return;
    const cur = tableAt(t);
    if (drag.mode === "move") {
      const x = clamp(px - drag.offsetX, 60, CANVAS_W - 60);
      const y = clamp(py - drag.offsetY, 60, CANVAS_H - 60);
      setLocalPos(p => ({ ...p, [drag.id]: { ...cur, x, y } }));
    } else {
      const angle = Math.atan2(py - cur.y, px - cur.x) * 180 / Math.PI;
      const rotation = Math.round(((drag.startRot + (angle - drag.startAngle)) % 360 + 360) % 360);
      setLocalPos(p => ({ ...p, [drag.id]: { ...cur, rotation } }));
    }
  };

  const onPointerUp = async () => {
    if (!drag) return;
    const id = drag.id;
    const final = localPos[id];
    setDrag(null);
    if (final) {
      await supabase.from("tables_def")
        .update({ x: Math.round(final.x), y: Math.round(final.y), rotation: Math.round(final.rotation) })
        .eq("id", id);
      setLocalPos(p => { const { [id]: _, ...rest } = p; return rest; });
      refresh();
    }
  };

  const addTable = async () => {
    const name = `Table ${tables.length + 1}`;
    const x = 180 + ((tables.length) % 4) * 280;
    const y = 180 + Math.floor(tables.length / 4) * 240;
    const { data } = await supabase.from("tables_def")
      .insert({ plan_id: planId, scenario_id: scenarioId, name, capacity: 8, shape: "round", x, y, rotation: 0 })
      .select().single();
    if (data) setSelectedId(data.id);
    refresh();
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-muted-foreground">
            Drag tables to reposition · click a table to edit · use the handle to rotate
          </div>
          <Button size="sm" onClick={addTable}><Plus size={14} className="mr-1.5"/>Add table</Button>
        </div>
        <div
          ref={canvasRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerDown={() => setSelectedId(null)}
          className="relative w-full rounded-2xl border border-border/60 overflow-hidden bg-card touch-none select-none"
          style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, background: "var(--gradient-soft)" }}
        >
          {/* parquet pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.05] pointer-events-none" aria-hidden>
            <defs>
              <pattern id="parquet-edit" width="40" height="40" patternUnits="userSpaceOnUse">
                <rect width="40" height="40" fill="currentColor"/>
                <path d="M0 0L40 40M40 0L0 40" stroke="hsl(var(--foreground))" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#parquet-edit)"/>
          </svg>

          {tables.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground">
              <Maximize2 size={28} className="opacity-50 mb-2"/>
              <div className="font-medium">Your room is empty</div>
              <div className="text-sm">Add a few tables and arrange them just like the venue.</div>
              <Button size="sm" className="mt-3" onClick={addTable}><Plus size={14} className="mr-1.5"/>Add your first table</Button>
            </div>
          )}

          {tables.map(t => {
            const pos = tableAt(t);
            const seated = seatedCount.get(t.id) ?? 0;
            const isSelected = selectedId === t.id;
            return (
              <TableNode
                key={t.id}
                table={t}
                pos={pos}
                seated={seated}
                selected={isSelected}
                onPointerDown={(e) => onPointerDownTable(e, t)}
                onRotateStart={(e) => onPointerDownRotate(e, t)}
              />
            );
          })}
        </div>
      </div>

      <Inspector
        key={selected?.id ?? "none"}
        table={selected}
        livePos={selected ? tableAt(selected) : null}
        onChange={async (patch) => {
          if (!selected) return;
          await supabase.from("tables_def").update(patch).eq("id", selected.id);
          refresh();
        }}
        onDelete={async () => {
          if (!selected) return;
          const seated = seatedCount.get(selected.id) ?? 0;
          if (seated > 0 && !confirm(`${seated} guests are seated here. Delete anyway?`)) return;
          await supabase.from("tables_def").delete().eq("id", selected.id);
          setSelectedId(null);
          refresh();
          toast.success("Table removed");
        }}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

function tableSize(t: TableDef): { w: number; h: number; rounded: string } {
  if (t.shape === "round") return { w: 130, h: 130, rounded: "rounded-full" };
  if (t.shape === "square") return { w: 120, h: 120, rounded: "rounded-lg" };
  if (t.shape === "head") return { w: 200, h: 80, rounded: "rounded-xl" };
  if (t.shape === "long") return { w: 240, h: 70, rounded: "rounded-md" };
  return { w: 180, h: 100, rounded: "rounded-md" };
}

function TableNode({
  table, pos, seated, selected, onPointerDown, onRotateStart,
}: {
  table: TableDef;
  pos: { x: number; y: number; rotation: number };
  seated: number;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onRotateStart: (e: React.PointerEvent) => void;
}) {
  const { w, h, rounded } = tableSize(table);
  const over = seated > table.capacity;
  return (
    <div
      className="absolute"
      style={{
        left: `${(pos.x / CANVAS_W) * 100}%`,
        top: `${(pos.y / CANVAS_H) * 100}%`,
        width: `${(w / CANVAS_W) * 100}%`,
        height: `${(h / CANVAS_H) * 100}%`,
        transform: `translate(-50%, -50%) rotate(${pos.rotation}deg)`,
        transformOrigin: "center",
      }}
    >
      <div
        onPointerDown={onPointerDown}
        className={`relative w-full h-full ${rounded} bg-card shadow-md flex flex-col items-center justify-center cursor-move transition border-2 ${
          selected ? "border-primary ring-4 ring-primary/20"
          : over ? "border-warning"
          : "border-border hover:border-primary/40"
        }`}
        style={{ background: "linear-gradient(135deg, hsl(var(--card)), hsl(var(--muted)))" }}
      >
        <div className="font-display text-sm font-semibold text-foreground leading-tight px-2 text-center truncate w-full">
          {table.name}
        </div>
        <div className="text-[10px] text-muted-foreground tracking-wider uppercase mt-0.5">
          {seated} / {table.capacity}
        </div>
      </div>
      {selected && (
        <button
          onPointerDown={onRotateStart}
          className="absolute -top-3 left-1/2 -translate-x-1/2 -translate-y-full w-7 h-7 rounded-full bg-primary text-primary-foreground shadow flex items-center justify-center cursor-grab active:cursor-grabbing"
          aria-label="Rotate"
          title="Drag to rotate"
        >
          <RotateCw size={13}/>
        </button>
      )}
    </div>
  );
}

function Inspector({
  table, livePos, onChange, onDelete, onClose,
}: {
  table: TableDef | null;
  livePos: { x: number; y: number; rotation: number } | null;
  onChange: (patch: Partial<TableDef>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Partial<TableDef>>(table ?? {});
  useEffect(() => { setDraft(table ?? {}); }, [table?.id]);

  if (!table || !livePos) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground self-start">
        <div className="font-medium text-foreground mb-1">Click a table to edit it</div>
        Drag any table to move it. Use the rotate handle that appears above it to spin it.
      </div>
    );
  }

  const update = (patch: Partial<TableDef>) => {
    setDraft(d => ({ ...d, ...patch }));
    onChange(patch);
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 self-start space-y-4 sticky top-20">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Editing table</div>
          <div className="font-display text-lg">{draft.name ?? table.name}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}><X size={14}/></Button>
      </div>

      <div>
        <Label>Name</Label>
        <Input
          value={draft.name ?? ""}
          onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          onBlur={() => draft.name !== table.name && onChange({ name: draft.name })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Seats</Label>
          <Input
            type="number" min={1} max={30}
            value={draft.capacity ?? table.capacity}
            onChange={e => update({ capacity: Math.max(1, parseInt(e.target.value) || 1) })}
          />
        </div>
        <div>
          <Label>Shape</Label>
          <Select value={(draft.shape ?? table.shape) as string} onValueChange={(v) => update({ shape: v as Shape })}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>{SHAPES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Position X</Label>
          <Input
            type="number"
            value={Math.round(livePos.x)}
            onChange={e => onChange({ x: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>Position Y</Label>
          <Input
            type="number"
            value={Math.round(livePos.y)}
            onChange={e => onChange({ y: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label>Rotation</Label>
          <span className="text-xs text-muted-foreground tabular-nums">{Math.round(livePos.rotation)}°</span>
        </div>
        <Slider
          value={[Math.round(livePos.rotation)]}
          min={0} max={359} step={1}
          onValueChange={(v) => onChange({ rotation: v[0] })}
          className="mt-2"
        />
      </div>

      <div className="pt-2 border-t border-border/40">
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
          <Trash2 size={14} className="mr-1.5"/>Delete table
        </Button>
      </div>
    </div>
  );
}