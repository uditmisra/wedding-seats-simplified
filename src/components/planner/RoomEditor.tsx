import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Plus, RotateCw, Trash2, X, Maximize2, Magnet, AlertTriangle, Wand2 } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import type { TableDef, Shape, Assignment } from "@/lib/types";
import { toast } from "sonner";

const SHAPES: Shape[] = ["round", "rectangle", "square", "long", "head"];
const CANVAS_W = 1400;
const CANVAS_H = 900;
const GRID = 20;            // canvas units
const SNAP_TOLERANCE = 8;   // canvas units — how close before alignment guide engages
const CLEARANCE = 24;       // canvas units of breathing room around each table (chairs/aisle)

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
  const [drag, setDrag] = useState<{ id: string; mode: "move" | "rotate"; offsetX: number; offsetY: number; startAngle: number; startRot: number; shift: boolean } | null>(null);
  // Pending edits: drag/rotate state that hasn't been committed to the DB yet.
  // Mirrored to localStorage so a refresh mid-drag never loses the change.
  const pendingKey = `roomEditor:pending:${scenarioId}`;
  const [localPos, setLocalPos] = useState<Record<string, { x: number; y: number; rotation: number }>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(`roomEditor:pending:${scenarioId}`);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const [snap, setSnap] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  // active alignment guides while dragging — canvas-unit coords
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });

  // Mirror in-progress edits to localStorage for crash/refresh recovery
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (Object.keys(localPos).length === 0) localStorage.removeItem(pendingKey);
    else localStorage.setItem(pendingKey, JSON.stringify(localPos));
  }, [localPos, pendingKey]);

  // On mount (or scenario switch): if we have stashed edits that differ from
  // the saved DB values, flush them so the canvas matches what the user last saw.
  // Only fires once per scenario (guarded by a ref) and waits for `tables` to load.
  const flushedFor = useRef<string | null>(null);
  useEffect(() => {
    if (flushedFor.current === scenarioId) return;
    if (tables.length === 0) return; // wait until tables have loaded
    flushedFor.current = scenarioId;
    const entries = Object.entries(localPos);
    if (entries.length === 0) return;
    const toFlush = entries.filter(([id, p]) => {
      const t = tables.find(x => x.id === id);
      if (!t) return false;
      return Math.round(t.x) !== Math.round(p.x)
          || Math.round(t.y) !== Math.round(p.y)
          || Math.round(t.rotation) !== Math.round(p.rotation);
    });
    if (toFlush.length === 0) {
      // nothing pending — clear the stash
      setLocalPos({});
      return;
    }
    (async () => {
      await Promise.all(toFlush.map(([id, p]) =>
        supabase.from("tables_def")
          .update({ x: Math.round(p.x), y: Math.round(p.y), rotation: Math.round(p.rotation) })
          .eq("id", id)
      ));
      toast.message(`Restored ${toFlush.length} unsaved table change${toFlush.length === 1 ? "" : "s"}`);
      setLocalPos({});
      refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, tables.length]);

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

  // Compute which tables currently overlap (AABB with chair clearance)
  const overlaps = useMemo(() => {
    const positions = tables.map(t => ({ id: t.id, ...tableAt(t), ...tableSize(t) }));
    const hit = new Set<string>();
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        if (boxesOverlap(positions[i], positions[j], CLEARANCE)) {
          hit.add(positions[i].id); hit.add(positions[j].id);
          pairs.push([positions[i].id, positions[j].id]);
        }
      }
    }
    return { ids: hit, pairs };
    // recompute when tables OR live drag positions change
  }, [tables, localPos]);

  const onPointerDownTable = (e: React.PointerEvent, t: TableDef) => {
    e.stopPropagation();
    setSelectedId(t.id);
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const scale = rect.width / CANVAS_W;
    const px = (e.clientX - rect.left) / scale;
    const py = (e.clientY - rect.top) / scale;
    const pos = tableAt(t);
    setDrag({ id: t.id, mode: "move", offsetX: px - pos.x, offsetY: py - pos.y, startAngle: 0, startRot: pos.rotation, shift: e.shiftKey });
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
    setDrag({ id: t.id, mode: "rotate", offsetX: 0, offsetY: 0, startAngle, startRot: pos.rotation, shift: e.shiftKey });
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
    // Hold Shift to temporarily disable snapping
    const useSnap = snap && !e.shiftKey;
    if (drag.mode === "move") {
      let x = clamp(px - drag.offsetX, 60, CANVAS_W - 60);
      let y = clamp(py - drag.offsetY, 60, CANVAS_H - 60);
      const activeV: number[] = [];
      const activeH: number[] = [];
      if (useSnap) {
        // 1) Alignment to other tables' centers (highest priority)
        let bestX: { v: number; d: number } | null = null;
        let bestY: { v: number; d: number } | null = null;
        for (const other of tables) {
          if (other.id === drag.id) continue;
          const op = tableAt(other);
          const dx = Math.abs(op.x - x);
          if (dx < SNAP_TOLERANCE && (!bestX || dx < bestX.d)) bestX = { v: op.x, d: dx };
          const dy = Math.abs(op.y - y);
          if (dy < SNAP_TOLERANCE && (!bestY || dy < bestY.d)) bestY = { v: op.y, d: dy };
        }
        // 2) Canvas center alignment
        if (Math.abs(CANVAS_W / 2 - x) < SNAP_TOLERANCE && (!bestX || Math.abs(CANVAS_W / 2 - x) < bestX.d)) bestX = { v: CANVAS_W / 2, d: Math.abs(CANVAS_W / 2 - x) };
        if (Math.abs(CANVAS_H / 2 - y) < SNAP_TOLERANCE && (!bestY || Math.abs(CANVAS_H / 2 - y) < bestY.d)) bestY = { v: CANVAS_H / 2, d: Math.abs(CANVAS_H / 2 - y) };

        if (bestX) { x = bestX.v; activeV.push(bestX.v); }
        else { x = Math.round(x / GRID) * GRID; }
        if (bestY) { y = bestY.v; activeH.push(bestY.v); }
        else { y = Math.round(y / GRID) * GRID; }
      }
      setGuides({ v: activeV, h: activeH });
      setLocalPos(p => ({ ...p, [drag.id]: { ...cur, x, y } }));
    } else {
      const angle = Math.atan2(py - cur.y, px - cur.x) * 180 / Math.PI;
      let rotation = ((drag.startRot + (angle - drag.startAngle)) % 360 + 360) % 360;
      if (useSnap) rotation = Math.round(rotation / 15) * 15; // 15° increments
      else rotation = Math.round(rotation);
      setLocalPos(p => ({ ...p, [drag.id]: { ...cur, rotation } }));
    }
  };

  const onPointerUp = async () => {
    if (!drag) return;
    const id = drag.id;
    const final = localPos[id];
    setDrag(null);
    setGuides({ v: [], h: [] });
    if (final) {
      await supabase.from("tables_def")
        .update({ x: Math.round(final.x), y: Math.round(final.y), rotation: Math.round(final.rotation) })
        .eq("id", id);
      setLocalPos(p => { const { [id]: _, ...rest } = p; return rest; });
      refresh();
    }
  };

  const autoSeparate = async () => {
    if (overlaps.ids.size === 0) return;
    // Build mutable position map; iteratively push overlapping pairs apart
    const pos = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const t of tables) {
      const p = tableAt(t); const sz = tableSize(t);
      pos.set(t.id, { x: p.x, y: p.y, w: sz.w, h: sz.h });
    }
    const ids = Array.from(pos.keys());
    for (let iter = 0; iter < 80; iter++) {
      let moved = false;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = pos.get(ids[i])!; const b = pos.get(ids[j])!;
          if (!boxesOverlap(a, b, CLEARANCE)) continue;
          const dx = b.x - a.x; const dy = b.y - a.y;
          const minX = (a.w + b.w) / 2 + CLEARANCE;
          const minY = (a.h + b.h) / 2 + CLEARANCE;
          const overlapX = minX - Math.abs(dx);
          const overlapY = minY - Math.abs(dy);
          // push along the axis of least penetration (cheapest separation)
          if (overlapX < overlapY) {
            const push = (overlapX / 2) * (dx >= 0 ? 1 : -1);
            a.x -= push; b.x += push;
          } else {
            const push = (overlapY / 2) * (dy >= 0 ? 1 : -1);
            a.y -= push; b.y += push;
          }
          // keep inside canvas
          a.x = clamp(a.x, 60, CANVAS_W - 60); a.y = clamp(a.y, 60, CANVAS_H - 60);
          b.x = clamp(b.x, 60, CANVAS_W - 60); b.y = clamp(b.y, 60, CANVAS_H - 60);
          moved = true;
        }
      }
      if (!moved) break;
    }
    // Snap to grid + persist all changed positions
    const updates = tables.map(t => {
      const p = pos.get(t.id)!;
      const x = Math.round(p.x / GRID) * GRID;
      const y = Math.round(p.y / GRID) * GRID;
      return { id: t.id, x, y, changed: x !== Math.round(t.x) || y !== Math.round(t.y) };
    }).filter(u => u.changed);
    if (updates.length === 0) {
      toast.message("Couldn't separate further — try resizing the room or removing a table.");
      return;
    }
    await Promise.all(updates.map(u =>
      supabase.from("tables_def").update({ x: u.x, y: u.y }).eq("id", u.id)
    ));
    toast.success(`Nudged ${updates.length} table${updates.length === 1 ? "" : "s"} apart`);
    refresh();
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
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="text-sm text-muted-foreground">
            Drag to move · hold <kbd className="px-1 rounded bg-muted text-[10px]">Shift</kbd> for free placement
          </div>
          <div className="flex items-center gap-1">
            {overlaps.ids.size > 0 && (
              <div className="flex items-center gap-1.5 mr-1">
                <span className="flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/30 rounded-full px-2 py-1">
                  <AlertTriangle size={12}/> {overlaps.ids.size} overlapping
                </span>
                <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={autoSeparate} title="Nudge overlapping tables apart">
                  <Wand2 size={12} className="mr-1"/>Auto-separate
                </Button>
              </div>
            )}
            <Toggle
              size="sm"
              pressed={snap}
              onPressedChange={setSnap}
              aria-label="Snap to grid and align"
              title="Snap to grid and align with other tables"
              className="h-8 px-2 text-xs"
            >
              <Magnet size={13} className="mr-1"/>Snap
            </Toggle>
            <Toggle
              size="sm"
              pressed={showGrid}
              onPressedChange={setShowGrid}
              aria-label="Show grid"
              title="Show grid"
              className="h-8 px-2 text-xs"
            >
              Grid
            </Toggle>
            <Button size="sm" onClick={addTable}><Plus size={14} className="mr-1.5"/>Add table</Button>
          </div>
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
          {/* Background: subtle grid (when enabled) or parquet */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} preserveAspectRatio="none">
            <defs>
              <pattern id="parquet-edit" width="40" height="40" patternUnits="userSpaceOnUse">
                <rect width="40" height="40" fill="transparent"/>
                <path d="M0 0L40 40M40 0L0 40" stroke="hsl(var(--foreground))" strokeOpacity="0.05" strokeWidth="0.5"/>
              </pattern>
              <pattern id="grid-edit" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                <path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.07" strokeWidth="1"/>
              </pattern>
              <pattern id="grid-major" width={GRID * 5} height={GRID * 5} patternUnits="userSpaceOnUse">
                <path d={`M ${GRID * 5} 0 L 0 0 0 ${GRID * 5}`} fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.12" strokeWidth="1"/>
              </pattern>
            </defs>
            {showGrid ? (
              <>
                <rect width="100%" height="100%" fill="url(#grid-edit)"/>
                <rect width="100%" height="100%" fill="url(#grid-major)"/>
              </>
            ) : (
              <rect width="100%" height="100%" fill="url(#parquet-edit)"/>
            )}
            {/* Alignment guides */}
            {guides.v.map((x, i) => (
              <line key={`v${i}`} x1={x} y1={0} x2={x} y2={CANVAS_H} stroke="hsl(var(--primary))" strokeWidth={1.5} strokeDasharray="6 4"/>
            ))}
            {guides.h.map((y, i) => (
              <line key={`h${i}`} x1={0} y1={y} x2={CANVAS_W} y2={y} stroke="hsl(var(--primary))" strokeWidth={1.5} strokeDasharray="6 4"/>
            ))}
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
                overlap={overlaps.ids.has(t.id)}
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

/** Axis-aligned bounding-box overlap test with extra clearance padding. */
function boxesOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  pad = 0,
) {
  return (
    Math.abs(a.x - b.x) * 2 < a.w + b.w + pad * 2 &&
    Math.abs(a.y - b.y) * 2 < a.h + b.h + pad * 2
  );
}

function tableSize(t: TableDef): { w: number; h: number; rounded: string } {
  if (t.shape === "round") return { w: 130, h: 130, rounded: "rounded-full" };
  if (t.shape === "square") return { w: 120, h: 120, rounded: "rounded-lg" };
  if (t.shape === "head") return { w: 200, h: 80, rounded: "rounded-xl" };
  if (t.shape === "long") return { w: 240, h: 70, rounded: "rounded-md" };
  return { w: 180, h: 100, rounded: "rounded-md" };
}

function TableNode({
  table, pos, seated, selected, overlap, onPointerDown, onRotateStart,
}: {
  table: TableDef;
  pos: { x: number; y: number; rotation: number };
  seated: number;
  selected: boolean;
  overlap: boolean;
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
          : overlap ? "border-destructive ring-2 ring-destructive/30"
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
        {overlap && (
          <div
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
            style={{ transform: `rotate(${-pos.rotation}deg)` }}
            title="This table overlaps another"
          >
            <AlertTriangle size={11}/>
          </div>
        )}
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