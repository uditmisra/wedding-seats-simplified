import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle, RotateCw, Trash2, Wand2, Pencil, Minus, Plus, Maximize2 } from "lucide-react";
import type { TableDef, Shape, Assignment } from "@/lib/types";
import { toast } from "sonner";
import { type RoomConfig, type Fixture, DEFAULT_ROOM_CONFIG, FIXTURE_META, roomLayout } from "@/lib/roomConfig";

const GRID = 20;
const SNAP_TOLERANCE = 8;
const CLEARANCE = 24;
const SHAPES: Shape[] = ["round", "rectangle", "square", "long", "head"];

type SelectionKind = "table" | "fixture" | null;

interface Props {
  planId: string;
  tables: TableDef[];
  assignments: Assignment[];
  roomConfig: RoomConfig | null;
  canEdit: boolean;
  onSavedRoom: (cfg: RoomConfig) => void;
  refresh: () => void;
}

/**
 * The Venue canvas. Tables (from tables_def) and fixtures (from
 * plans.room_config) live on the same surface. Drag to move, rotate handle
 * for spin, inline selection bar for the common edits, double-click table
 * for the rename/capacity modal.
 */
export function VenueCanvas({ planId, tables, assignments, roomConfig, canEdit, onSavedRoom, refresh }: Props) {
  const cfg: RoomConfig = useMemo(() => ({
    width_m: roomConfig?.width_m ?? DEFAULT_ROOM_CONFIG.width_m,
    height_m: roomConfig?.height_m ?? DEFAULT_ROOM_CONFIG.height_m,
    fixtures: Array.isArray(roomConfig?.fixtures) ? roomConfig!.fixtures : DEFAULT_ROOM_CONFIG.fixtures,
  }), [roomConfig]);

  const rl = useMemo(() => roomLayout(cfg, 40, 40, 40), [cfg]);
  const { canvasW, canvasH, roomX, roomY, roomW, roomH } = rl;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selection, setSelection] = useState<{ kind: SelectionKind; id: string | null }>({ kind: null, id: null });

  // Live drag state — pixel coords in canvas space.
  const [tablePos, setTablePos] = useState<Record<string, { x: number; y: number; rotation: number }>>({});
  const [fixturePos, setFixturePos] = useState<Record<string, { x_pct: number; y_pct: number }>>({});
  const [editName, setEditName] = useState<string | null>(null);
  const dragRef = useRef<{
    kind: "table" | "fixture"; id: string; offX: number; offY: number;
  } | null>(null);
  const rotateRef = useRef<{ id: string; cx: number; cy: number; startAngle: number; startRot: number } | null>(null);
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });

  // Lay-out tables stacked at (0,0) — first time a Venue tab loads with
  // legacy data, they pile in the top-left. Spread them across the room.
  useEffect(() => {
    const stacked = tables.filter(t => t.x === 0 && t.y === 0);
    if (stacked.length > 1) {
      stacked.forEach(async (t, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = roomX + 100 + col * 180;
        const y = roomY + 100 + row * 160;
        await supabase.from("tables_def").update({ x, y }).eq("id", t.id);
      });
      setTimeout(refresh, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.length]);

  const seatedByTable = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assignments) m.set(a.table_id, (m.get(a.table_id) ?? 0) + 1);
    return m;
  }, [assignments]);

  const liveTable = (t: TableDef) => tablePos[t.id] ?? { x: t.x, y: t.y, rotation: t.rotation };
  const liveFixture = (f: Fixture) => fixturePos[f.id] ?? { x_pct: f.x_pct, y_pct: f.y_pct };

  /* ----- Geometry helpers ----- */
  const tableSize = (t: TableDef): { w: number; h: number; rounded: string } => {
    if (t.shape === "round") return { w: 120, h: 120, rounded: "rounded-full" };
    if (t.shape === "square") return { w: 110, h: 110, rounded: "rounded-lg" };
    if (t.shape === "head") return { w: 180, h: 70, rounded: "rounded-xl" };
    if (t.shape === "long") return { w: 220, h: 60, rounded: "rounded-md" };
    return { w: 170, h: 90, rounded: "rounded-md" };
  };

  const overlaps = useMemo(() => {
    const positions = tables.map(t => ({ id: t.id, ...liveTable(t), ...tableSize(t) }));
    const hit = new Set<string>();
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i]; const b = positions[j];
        if (
          Math.abs(a.x - b.x) * 2 < a.w + b.w + CLEARANCE * 2 &&
          Math.abs(a.y - b.y) * 2 < a.h + b.h + CLEARANCE * 2
        ) { hit.add(a.id); hit.add(b.id); }
      }
    }
    return hit;
  }, [tables, tablePos]);

  /* ----- Pointer helpers ----- */
  const eventToCanvas = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const scale = rect.width / canvasW;
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  };

  /* ----- Drag tables ----- */
  const onPointerDownTable = (e: React.PointerEvent, t: TableDef) => {
    if (!canEdit) return;
    e.stopPropagation();
    setSelection({ kind: "table", id: t.id });
    const { x: px, y: py } = eventToCanvas(e);
    const cur = liveTable(t);
    dragRef.current = { kind: "table", id: t.id, offX: px - cur.x, offY: py - cur.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerDownFixture = (e: React.PointerEvent, f: Fixture) => {
    if (!canEdit) return;
    e.stopPropagation();
    setSelection({ kind: "fixture", id: f.id });
    const { x: px, y: py } = eventToCanvas(e);
    const cur = liveFixture(f);
    const cx = roomX + cur.x_pct * roomW;
    const cy = roomY + cur.y_pct * roomH;
    dragRef.current = { kind: "fixture", id: f.id, offX: px - cx, offY: py - cy };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerDownRotate = (e: React.PointerEvent, t: TableDef) => {
    if (!canEdit) return;
    e.stopPropagation();
    const cur = liveTable(t);
    const { x: px, y: py } = eventToCanvas(e);
    const startAngle = Math.atan2(py - cur.y, px - cur.x) * 180 / Math.PI;
    rotateRef.current = { id: t.id, cx: cur.x, cy: cur.y, startAngle, startRot: cur.rotation };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const rot = rotateRef.current;
    if (rot) {
      const { x: px, y: py } = eventToCanvas(e);
      const angle = Math.atan2(py - rot.cy, px - rot.cx) * 180 / Math.PI;
      let rotation = ((rot.startRot + (angle - rot.startAngle)) % 360 + 360) % 360;
      if (!e.shiftKey) rotation = Math.round(rotation / 15) * 15;
      setTablePos(p => ({ ...p, [rot.id]: { ...(p[rot.id] ?? { x: 0, y: 0, rotation: 0 }), rotation } }));
      return;
    }
    const d = dragRef.current;
    if (!d) return;
    const { x: px, y: py } = eventToCanvas(e);
    if (d.kind === "table") {
      const t = tables.find(x => x.id === d.id); if (!t) return;
      let x = clamp(px - d.offX, roomX + 40, roomX + roomW - 40);
      let y = clamp(py - d.offY, roomY + 40, roomY + roomH - 40);
      const useSnap = !e.shiftKey;
      const av: number[] = []; const ah: number[] = [];
      if (useSnap) {
        let bestX: { v: number; d: number } | null = null;
        let bestY: { v: number; d: number } | null = null;
        for (const other of tables) {
          if (other.id === d.id) continue;
          const op = liveTable(other);
          const dx = Math.abs(op.x - x);
          if (dx < SNAP_TOLERANCE && (!bestX || dx < bestX.d)) bestX = { v: op.x, d: dx };
          const dy = Math.abs(op.y - y);
          if (dy < SNAP_TOLERANCE && (!bestY || dy < bestY.d)) bestY = { v: op.y, d: dy };
        }
        const cx = roomX + roomW / 2, cy = roomY + roomH / 2;
        if (Math.abs(cx - x) < SNAP_TOLERANCE && (!bestX || Math.abs(cx - x) < bestX.d)) bestX = { v: cx, d: Math.abs(cx - x) };
        if (Math.abs(cy - y) < SNAP_TOLERANCE && (!bestY || Math.abs(cy - y) < bestY.d)) bestY = { v: cy, d: Math.abs(cy - y) };
        if (bestX) { x = bestX.v; av.push(bestX.v); } else { x = Math.round(x / GRID) * GRID; }
        if (bestY) { y = bestY.v; ah.push(bestY.v); } else { y = Math.round(y / GRID) * GRID; }
      }
      setGuides({ v: av, h: ah });
      const cur = liveTable(t);
      setTablePos(p => ({ ...p, [d.id]: { ...cur, x, y } }));
    } else {
      // fixture
      const f = cfg.fixtures.find(x => x.id === d.id); if (!f) return;
      const cx = clamp(px - d.offX, roomX, roomX + roomW);
      const cy = clamp(py - d.offY, roomY, roomY + roomH);
      const x_pct = clamp((cx - roomX) / roomW, 0, 1);
      const y_pct = clamp((cy - roomY) / roomH, 0, 1);
      setFixturePos(p => ({ ...p, [d.id]: { x_pct, y_pct } }));
    }
  };

  const onPointerUp = async () => {
    setGuides({ v: [], h: [] });
    if (rotateRef.current) {
      const id = rotateRef.current.id;
      const final = tablePos[id];
      rotateRef.current = null;
      if (final) {
        await supabase.from("tables_def").update({ rotation: Math.round(final.rotation) }).eq("id", id);
        setTablePos(p => { const { [id]: _, ...rest } = p; return rest; });
        refresh();
      }
      return;
    }
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    if (d.kind === "table") {
      const final = tablePos[d.id];
      if (final) {
        await supabase.from("tables_def").update({ x: Math.round(final.x), y: Math.round(final.y) }).eq("id", d.id);
        setTablePos(p => { const { [d.id]: _, ...rest } = p; return rest; });
        refresh();
      }
    } else {
      const final = fixturePos[d.id];
      if (final) {
        const next: RoomConfig = {
          ...cfg,
          fixtures: cfg.fixtures.map(f => f.id === d.id ? { ...f, x_pct: final.x_pct, y_pct: final.y_pct } : f),
        };
        await saveRoom(next);
        setFixturePos(p => { const { [d.id]: _, ...rest } = p; return rest; });
      }
    }
  };

  const saveRoom = async (next: RoomConfig) => {
    const { error } = await supabase.from("plans").update({ room_config: next as unknown as null }).eq("id", planId);
    if (error) { toast.error(error.message); return; }
    onSavedRoom(next);
  };

  /* ----- Inline edits ----- */
  const renameTable = async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) { setEditName(null); return; }
    const clash = tables.some(t => t.id !== id && t.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (clash) {
      toast.error("A table with that name already exists.");
      setEditName(null);
      return;
    }
    await supabase.from("tables_def").update({ name: trimmed }).eq("id", id);
    setEditName(null);
    refresh();
  };
  const setTableCapacity = async (id: string, capacity: number) => {
    await supabase.from("tables_def").update({ capacity: Math.max(1, Math.min(30, capacity)) }).eq("id", id);
    refresh();
  };
  const setTableShape = async (id: string, shape: Shape) => {
    await supabase.from("tables_def").update({ shape }).eq("id", id);
    refresh();
  };
  const deleteTable = async (id: string) => {
    const seated = seatedByTable.get(id) ?? 0;
    if (seated > 0 && !confirm(`${seated} guest${seated === 1 ? "" : "s"} seated here. Delete anyway?`)) return;
    await supabase.from("tables_def").delete().eq("id", id);
    setSelection({ kind: null, id: null });
    refresh();
  };

  const renameFixture = async (id: string, label: string) => {
    const next: RoomConfig = { ...cfg, fixtures: cfg.fixtures.map(f => f.id === id ? { ...f, label } : f) };
    setEditName(null);
    await saveRoom(next);
  };
  const deleteFixture = async (id: string) => {
    const next: RoomConfig = { ...cfg, fixtures: cfg.fixtures.filter(f => f.id !== id) };
    setSelection({ kind: null, id: null });
    await saveRoom(next);
  };

  /* ----- Auto-separate ----- */
  const autoSeparate = async () => {
    if (overlaps.size === 0) return;
    const pos = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const t of tables) {
      const p = liveTable(t); const sz = tableSize(t);
      pos.set(t.id, { x: p.x, y: p.y, w: sz.w, h: sz.h });
    }
    const ids = Array.from(pos.keys());
    for (let iter = 0; iter < 80; iter++) {
      let moved = false;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = pos.get(ids[i])!; const b = pos.get(ids[j])!;
          const minX = (a.w + b.w) / 2 + CLEARANCE;
          const minY = (a.h + b.h) / 2 + CLEARANCE;
          const dx = b.x - a.x, dy = b.y - a.y;
          if (Math.abs(dx) >= minX || Math.abs(dy) >= minY) continue;
          const ox = minX - Math.abs(dx), oy = minY - Math.abs(dy);
          if (ox < oy) { const push = (ox / 2) * (dx >= 0 ? 1 : -1); a.x -= push; b.x += push; }
          else { const push = (oy / 2) * (dy >= 0 ? 1 : -1); a.y -= push; b.y += push; }
          a.x = clamp(a.x, roomX + 40, roomX + roomW - 40);
          a.y = clamp(a.y, roomY + 40, roomY + roomH - 40);
          b.x = clamp(b.x, roomX + 40, roomX + roomW - 40);
          b.y = clamp(b.y, roomY + 40, roomY + roomH - 40);
          moved = true;
        }
      }
      if (!moved) break;
    }
    const updates = tables.map(t => {
      const p = pos.get(t.id)!;
      const x = Math.round(p.x / GRID) * GRID;
      const y = Math.round(p.y / GRID) * GRID;
      return { id: t.id, x, y };
    });
    await Promise.all(updates.map(u =>
      supabase.from("tables_def").update({ x: u.x, y: u.y }).eq("id", u.id)
    ));
    toast.success("Nudged tables apart");
    refresh();
  };

  const dims = { width_m: cfg.width_m, height_m: cfg.height_m };

  const selectedTable = selection.kind === "table" ? tables.find(t => t.id === selection.id) ?? null : null;
  const selectedFixture = selection.kind === "fixture" ? cfg.fixtures.find(f => f.id === selection.id) ?? null : null;

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerDown={() => setSelection({ kind: null, id: null })}
        className="relative w-full overflow-hidden rounded-2xl border hairline bg-paper paper-grain touch-none select-none"
        style={{ aspectRatio: `${canvasW} / ${canvasH}` }}
      >
        {/* Grid background */}
        <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox={`0 0 ${canvasW} ${canvasH}`} preserveAspectRatio="none" aria-hidden>
          <defs>
            <pattern id="venue-grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
              <circle cx="0.5" cy="0.5" r="0.6" fill="hsl(var(--ink))" opacity="0.22" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#venue-grid)" />
          {/* Room outline */}
          <rect x={roomX} y={roomY} width={roomW} height={roomH} fill="none" stroke="hsl(var(--ink))" strokeWidth={1.2} opacity={0.7} />
          {/* Guides */}
          {guides.v.map((x, i) => (<line key={`v${i}`} x1={x} y1={roomY} x2={x} y2={roomY + roomH} stroke="hsl(var(--terracotta))" strokeWidth={1} strokeDasharray="6 4" />))}
          {guides.h.map((y, i) => (<line key={`h${i}`} x1={roomX} y1={y} x2={roomX + roomW} y2={y} stroke="hsl(var(--terracotta))" strokeWidth={1} strokeDasharray="6 4" />))}
        </svg>

        {/* Fixtures */}
        {cfg.fixtures.filter(f => f.visible !== false).map(f => {
          const lp = liveFixture(f);
          const meta = FIXTURE_META[f.type];
          const cx = roomX + lp.x_pct * roomW;
          const cy = roomY + lp.y_pct * roomH;
          const w = (f.w_pct ?? 0.1) * roomW;
          const h = (f.h_pct ?? 0.06) * roomH;
          const isSel = selection.kind === "fixture" && selection.id === f.id;
          if (f.type === "compass") {
            return (
              <div
                key={f.id}
                className="absolute flex h-10 w-10 cursor-grab items-center justify-center"
                style={{ left: `${(cx / canvasW) * 100}%`, top: `${(cy / canvasH) * 100}%`, transform: "translate(-50%, -50%)" }}
                onPointerDown={(e) => onPointerDownFixture(e, f)}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-full border ${isSel ? "border-terracotta ring-2 ring-terracotta/30" : "border-ink/40"} bg-paper/80 font-mono text-[10px]`}>{f.label || "N"}</div>
              </div>
            );
          }
          return (
            <div
              key={f.id}
              className="absolute cursor-grab"
              style={{
                left: `${(cx / canvasW) * 100}%`,
                top: `${(cy / canvasH) * 100}%`,
                width: `${(w / canvasW) * 100}%`,
                height: `${(h / canvasH) * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
              onPointerDown={(e) => onPointerDownFixture(e, f)}
              title={f.label}
            >
              <div
                className={`flex h-full w-full flex-col items-center justify-center rounded-md border-2 px-2 transition ${
                  isSel ? "border-terracotta ring-2 ring-terracotta/30" : "border-dashed border-ink/40 hover:border-ink/70"
                } bg-paper-2/40`}
              >
                <span className="text-[16px] leading-none">{meta?.emoji ?? "▭"}</span>
                <span className="mt-1 truncate font-display-italic text-[12px] text-ink-2">{f.label}</span>
              </div>
            </div>
          );
        })}

        {/* Tables */}
        {tables.map(t => {
          const p = liveTable(t);
          const sz = tableSize(t);
          const seated = seatedByTable.get(t.id) ?? 0;
          const isSel = selection.kind === "table" && selection.id === t.id;
          const over = seated > t.capacity;
          const overlap = overlaps.has(t.id);
          return (
            <div
              key={t.id}
              className="absolute"
              style={{
                left: `${(p.x / canvasW) * 100}%`,
                top: `${(p.y / canvasH) * 100}%`,
                width: `${(sz.w / canvasW) * 100}%`,
                height: `${(sz.h / canvasH) * 100}%`,
                transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`,
              }}
            >
              <div
                onPointerDown={(e) => onPointerDownTable(e, t)}
                onDoubleClick={() => setEditName(t.id)}
                className={`relative flex h-full w-full cursor-move flex-col items-center justify-center border-2 bg-paper shadow-sm transition ${sz.rounded} ${
                  isSel ? "border-terracotta ring-4 ring-terracotta/15"
                  : overlap ? "border-rose ring-2 ring-rose/30"
                  : over ? "border-terracotta"
                  : "border-ink/30 hover:border-ink/60"
                }`}
              >
                <div className="truncate px-2 text-center font-display text-[13px] leading-tight">{t.name}</div>
                <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
                  {seated} / {t.capacity}
                </div>
                {overlap && (
                  <div
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose text-paper shadow"
                    style={{ transform: `rotate(${-p.rotation}deg)` }}
                    title="Overlaps another table"
                  ><AlertTriangle size={11} /></div>
                )}
              </div>
              {isSel && canEdit && (
                <button
                  onPointerDown={(e) => onPointerDownRotate(e, t)}
                  className="absolute left-1/2 top-0 flex h-7 w-7 -translate-x-1/2 -translate-y-[140%] cursor-grab items-center justify-center rounded-full bg-ink text-paper shadow"
                  style={{ transform: `translate(-50%, -140%) rotate(${-p.rotation}deg)` }}
                  aria-label="Rotate"
                  title="Drag to rotate"
                ><RotateCw size={12} /></button>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {tables.length === 0 && cfg.fixtures.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <Maximize2 size={28} className="mb-2 opacity-50" />
            <div className="font-display text-[17px]">Your room is empty</div>
            <div className="text-[13px] text-ink-3">Add a table from the left rail to start.</div>
          </div>
        )}
      </div>

      {/* Bottom chrome */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-end justify-between px-3">
        <div className="pointer-events-auto flex items-center gap-2">
          {canEdit ? (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-full border hairline bg-paper/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 hover:text-ink">
                  {dims.width_m}m × {dims.height_m}m
                  <Pencil size={10} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64">
                <div className="label-mono mb-2">Room size</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[12px] text-ink-3">
                    Width (m)
                    <Input
                      type="number" min={4} max={100}
                      value={dims.width_m}
                      onChange={(e) => saveRoom({ ...cfg, width_m: Math.max(4, Number(e.target.value) || 4) })}
                      className="mt-1 h-9"
                    />
                  </label>
                  <label className="text-[12px] text-ink-3">
                    Length (m)
                    <Input
                      type="number" min={4} max={100}
                      value={dims.height_m}
                      onChange={(e) => saveRoom({ ...cfg, height_m: Math.max(4, Number(e.target.value) || 4) })}
                      className="mt-1 h-9"
                    />
                  </label>
                </div>
                <p className="mt-2 font-mono text-[10px] text-ink-3">~{Math.round(cfg.width_m * 3.28)}ft × {Math.round(cfg.height_m * 3.28)}ft</p>
              </PopoverContent>
            </Popover>
          ) : (
            <div className="rounded-full border hairline bg-paper/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              {dims.width_m}m × {dims.height_m}m
            </div>
          )}
          <div className="hidden rounded-full border hairline bg-paper/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 sm:block">
            {tables.length} tables · {tables.reduce((s, t) => s + t.capacity, 0)} seats · {cfg.fixtures.length} features
          </div>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {overlaps.size > 0 && canEdit && (
            <Button size="sm" variant="outline" className="h-8 gap-1 rounded-full border-hairline bg-paper/90 px-3 text-[11px]" onClick={autoSeparate}>
              <Wand2 size={12} /> Auto-separate
            </Button>
          )}
        </div>
      </div>

      {/* Selection bar */}
      {selectedTable && canEdit && (
        <SelectionBar
          title={editName === selectedTable.id ? (
            <Input
              autoFocus
              defaultValue={selectedTable.name}
              onBlur={(e) => renameTable(selectedTable.id, e.target.value || selectedTable.name)}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditName(null); }}
              className="h-7 w-40 px-2 text-[13px]"
            />
          ) : (
            <button className="font-display text-[14px] hover:underline" onClick={() => setEditName(selectedTable.id)}>{selectedTable.name}</button>
          )}
          extras={
            <>
              <select
                value={selectedTable.shape}
                onChange={(e) => setTableShape(selectedTable.id, e.target.value as Shape)}
                className="h-7 rounded border hairline bg-paper px-2 text-[12px] capitalize"
              >
                {SHAPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="flex items-center gap-1 rounded border hairline bg-paper px-1">
                <button className="h-6 w-6" onClick={() => setTableCapacity(selectedTable.id, selectedTable.capacity - 1)} aria-label="Fewer seats"><Minus size={11} /></button>
                <span className="min-w-[2ch] text-center font-mono text-[12px] tabular-nums">{selectedTable.capacity}</span>
                <button className="h-6 w-6" onClick={() => setTableCapacity(selectedTable.id, selectedTable.capacity + 1)} aria-label="More seats"><Plus size={11} /></button>
              </div>
            </>
          }
          onDelete={() => deleteTable(selectedTable.id)}
        />
      )}
      {selectedFixture && canEdit && (
        <SelectionBar
          title={editName === selectedFixture.id ? (
            <Input
              autoFocus
              defaultValue={selectedFixture.label}
              onBlur={(e) => renameFixture(selectedFixture.id, e.target.value || selectedFixture.label)}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditName(null); }}
              className="h-7 w-44 px-2 text-[13px]"
            />
          ) : (
            <button className="font-display text-[14px] hover:underline" onClick={() => setEditName(selectedFixture.id)}>{selectedFixture.label}</button>
          )}
          extras={
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">{selectedFixture.type.replace(/_/g, " ")}</span>
          }
          onDelete={() => deleteFixture(selectedFixture.id)}
        />
      )}
    </div>
  );
}

function SelectionBar({ title, extras, onDelete }: { title: React.ReactNode; extras?: React.ReactNode; onDelete: () => void }) {
  return (
    <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border hairline bg-paper/95 px-3 py-1.5 shadow-sm backdrop-blur">
      {title}
      {extras}
      <button
        onClick={onDelete}
        className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-3 hover:bg-rose/10 hover:text-rose"
        aria-label="Delete"
        title="Delete"
      ><Trash2 size={12} /></button>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }