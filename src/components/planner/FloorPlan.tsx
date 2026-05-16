import { useEffect, useMemo, useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Guest, TableDef, Assignment, ConstraintDef } from "@/lib/types";
import { tableConflicts } from "@/lib/seating";
import { Plus, Minus, Maximize2, RotateCcw, Move } from "lucide-react";
import { SeatMenu } from "./SeatMenu";
import { SeatPicker } from "./SeatPicker";
import { guestColor } from "@/lib/guestColor";
import { type RoomConfig, type Fixture, DEFAULT_ROOM_CONFIG, roomLayout } from "@/lib/roomConfig";

interface Props {
  tables: TableDef[];
  assignments: Assignment[];
  guests: Guest[];
  constraints: ConstraintDef[];
  highlights?: Map<string, "added" | "removed" | "changed">;
  scenarioId?: string;
  onUnassign?: (a: Assignment) => void;
  onTogglePin?: (a: Assignment) => void;
  onMoveTo?: (a: Assignment, tableId: string) => void;
  onSwapWith?: (a: Assignment, b: Assignment) => void;
  unassigned?: Guest[];
  onAssign?: (guestId: string, tableId: string, seatIndex: number) => void;
  canEdit?: boolean;
  /** When true, tables can be dragged to new positions */
  arrangeMode?: boolean;
  onTableMove?: (id: string, x: number, y: number) => void;
  roomConfig?: RoomConfig | null;
  /** Pixels of viewport chrome to subtract from 100vh. Default 240 (Planner). */
  chromeHeight?: number;
  /** Force fit-to-viewport on mount, regardless of saved state. Used by /demo. */
  autoFit?: boolean;
}

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;

const PAD_X = 70;
const PAD_TOP = 90;
const PAD_BOTTOM = 110;
const TABLE_GAP = 44; // breathing room between table bounding boxes in auto-grid

const noop = () => {};
export function FloorPlan({ tables, assignments, guests, constraints, highlights, scenarioId, onUnassign = noop, onTogglePin = noop, onMoveTo = noop, onSwapWith = noop, unassigned = [], onAssign, canEdit = true, arrangeMode = false, onTableMove, roomConfig, chromeHeight = 240, autoFit = false }: Props) {
  const guestById = useMemo(() => new Map(guests.map(g => [g.id, g])), [guests]);

  // Cell size grows with the largest table so big tables don't crowd neighbours.
  const dims = tables.map(tableDims);
  const maxW = Math.max(180, ...dims.map(d => d.box.w));
  const maxH = Math.max(180, ...dims.map(d => d.box.h));
  const cols = tables.length <= 2 ? Math.max(1, tables.length) : tables.length <= 6 ? 3 : 4;
  const rows = Math.max(1, Math.ceil(tables.length / Math.max(1, cols)));

  // Resolve canvas dimensions and room rectangle.
  // When roomConfig is provided, canvas scales from real-world dimensions.
  // Otherwise, size to fit the table grid with proper padding so tables land inside the room outline.
  // A roomConfig stored without fixtures (e.g. AI room-parse fallback or partial save) would
  // crash RoomGeometry on render, blanking the canvas — backfill defaults to stay resilient.
  const cfg: RoomConfig = {
    width_m: roomConfig?.width_m ?? DEFAULT_ROOM_CONFIG.width_m,
    height_m: roomConfig?.height_m ?? DEFAULT_ROOM_CONFIG.height_m,
    fixtures: Array.isArray(roomConfig?.fixtures) ? roomConfig!.fixtures : DEFAULT_ROOM_CONFIG.fixtures,
  };
  const rl = roomLayout(cfg, PAD_X, PAD_TOP, PAD_BOTTOM);

  // If any table has a stored position, use the configured canvas.
  // Otherwise use an auto-sized canvas that guarantees tables fit inside the room outline.
  const hasCustomPos = tables.some(t => t.x > 0 || t.y > 0);
  let width: number, height: number, roomX: number, roomY: number, roomW: number, roomH: number;
  if (hasCustomPos || roomConfig) {
    ({ canvasW: width, canvasH: height, roomX, roomY, roomW, roomH } = rl);
  } else {
    // Auto-size: room must contain all tables with TABLE_GAP breathing room
    roomW = Math.max(cols * (maxW + TABLE_GAP) - TABLE_GAP, 400);
    roomH = Math.max(rows * (maxH + TABLE_GAP) - TABLE_GAP, 300);
    roomX = PAD_X;
    roomY = PAD_TOP;
    width  = roomW + 2 * PAD_X;
    height = roomH + PAD_TOP + PAD_BOTTOM;
  }

  // Live positions during arrange-mode drag (overrides stored positions while dragging)
  const [livePos, setLivePos] = useState<Map<string, { cx: number; cy: number }>>(new Map());
  const tableDragRef = useRef<{
    id: string; startCx: number; startCy: number; startPx: number; startPy: number
  } | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const { setNodeRef: setCanvasDropRef } = useDroppable({ id: "__canvas__" });
  const setViewportRef = (el: HTMLDivElement | null) => {
    viewportRef.current = el;
    setCanvasDropRef(el);
  };
  const stateKey = `floorplan:view:${scenarioId ?? "default"}`;

  const [view, setView] = useState<{ x: number; y: number; z: number }>(() => {
    const fallback = { x: 0, y: 0, z: 1 };
    if (typeof window === "undefined") return fallback;
    try {
      const raw = localStorage.getItem(`floorplan:view:${scenarioId ?? "default"}`);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as { x?: unknown; y?: unknown; z?: unknown };
      // A corrupted z of 0 or NaN would scale the whole canvas to invisible —
      // reject anything outside the legal zoom range and start fresh.
      const x = Number.isFinite(parsed.x) ? Number(parsed.x) : 0;
      const y = Number.isFinite(parsed.y) ? Number(parsed.y) : 0;
      const z = Number.isFinite(parsed.z) && Number(parsed.z) > 0 ? Number(parsed.z) : 1;
      return { x, y, z: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z)) };
    } catch {}
    return fallback;
  });
  const [animate, setAnimate] = useState(false);
  const [panning, setPanning] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const panRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const pinchRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);

  useEffect(() => {
    try { localStorage.setItem(stateKey, JSON.stringify(view)); } catch {}
  }, [view, stateKey]);

  // Clear live positions when leaving arrange mode
  useEffect(() => {
    if (!arrangeMode) setLivePos(new Map());
  }, [arrangeMode]);

  // Auto-fit on mount when:
  //   - autoFit prop is true (demo route — always fresh, ignores saved state)
  //   - mobile + no saved state (legacy behaviour)
  // Runs after mount so the viewport is measurable.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.innerWidth < 768;
    if (!autoFit && !isMobile) return;
    if (!autoFit) {
      try { if (localStorage.getItem(stateKey)) return; } catch {}
    }
    const id = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFit]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target as HTMLElement)?.closest("input,textarea,[contenteditable]")) {
        setSpaceDown(true); e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => { if (e.code === "Space") setSpaceDown(false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const fit = () => {
    const vp = viewportRef.current; if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const pad = 60;
    const z = Math.min((rect.width - pad * 2) / width, (rect.height - pad * 2) / height, 1.5);
    const zc = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
    const x = (rect.width - width * zc) / 2;
    const y = (rect.height - height * zc) / 2;
    setAnimate(true); setView({ x, y, z: zc });
    window.setTimeout(() => setAnimate(false), 320);
  };
  const reset = () => { setAnimate(true); setView({ x: 0, y: 0, z: 1 }); window.setTimeout(() => setAnimate(false), 320); };
  const zoomBy = (factor: number, cx?: number, cy?: number) => {
    const vp = viewportRef.current; if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const px = cx ?? rect.width / 2;
    const py = cy ?? rect.height / 2;
    setView(v => {
      const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.z * factor));
      const k = nz / v.z;
      return { x: px - (px - v.x) * k, y: py - (py - v.y) * k, z: nz };
    });
  };

  // Stable ref keeps zoomBy current without re-adding the listener on every render
  const zoomByRef = useRef(zoomBy);
  zoomByRef.current = zoomBy;

  // Native (non-passive) wheel handler — React's synthetic onWheel is passive by
  // default so e.preventDefault() there is a no-op, causing the page to scroll.
  useEffect(() => {
    const el = viewportRef.current; if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        zoomByRef.current(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
      } else {
        setView(v => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []); // stable — uses refs and functional setView

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const isInteractive = !!target.closest("button, input, select, textarea, [data-interactive]");
    const isPan = e.button === 1 || spaceDown || (e.button === 0 && !isInteractive);
    if (!isPan) return;
    setPanning(true);
    panRef.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
    viewportRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!panning || !panRef.current) return;
    const { sx, sy, ox, oy } = panRef.current;
    setView(v => ({ ...v, x: ox + (e.clientX - sx), y: oy + (e.clientY - sy) }));
  };
  const onPointerUp = () => { setPanning(false); panRef.current = null; };

  // Pinch-to-zoom — only fires when 2 fingers are on the canvas.
  // Single-touch drags still reach @dnd-kit's TouchSensor unaffected.
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t0 = e.touches[0], t1 = e.touches[1];
      pinchRef.current = {
        dist: Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY),
        midX: (t0.clientX + t1.clientX) / 2,
        midY: (t0.clientY + t1.clientY) / 2,
      };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchRef.current) return;
    e.preventDefault();
    const t0 = e.touches[0], t1 = e.touches[1];
    const newDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
    const factor = newDist / pinchRef.current.dist;
    const rect = viewportRef.current!.getBoundingClientRect();
    zoomBy(factor, pinchRef.current.midX - rect.left, pinchRef.current.midY - rect.top);
    pinchRef.current = { ...pinchRef.current, dist: newDist };
  };
  const onTouchEnd = () => { pinchRef.current = null; };

  const cursor = panning ? "grabbing" : spaceDown ? "grab" : "default";
  const dotSize = 24 * view.z;

  // Pre-compute table positions/seats once.
  // Priority: live drag position → stored DB position → auto-grid (inside room bounds).
  const layout = tables.map((t, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // Auto-grid: divide room rectangle into equal cells, center table in each cell
    const gridCellW = roomW / cols;
    const gridCellH = roomH / rows;
    const gridCx = roomX + col * gridCellW + gridCellW / 2;
    const gridCy = roomY + row * gridCellH + gridCellH / 2;
    const live = livePos.get(t.id);
    const stored = (t.x > 0 || t.y > 0) ? { cx: t.x, cy: t.y } : null;
    const cx = live?.cx ?? stored?.cx ?? gridCx;
    const cy = live?.cy ?? stored?.cy ?? gridCy;
    const d = dims[i];
    return { t, i, cx, cy, seats: computeSeats(t, cx, cy, d), box: d.box, dims: d };
  });

  return (
    <div className="relative rounded-2xl border hairline overflow-hidden bg-paper">
      <div
        ref={setViewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="paper-grain relative w-full overflow-hidden touch-none select-none"
        style={{
          height: `calc(100vh - ${chromeHeight}px)`, minHeight: 400, cursor,
        }}
      >
        {tables.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-center text-ink-3 p-16 font-display-italic">
            Add a few tables and your room will come to life here.
          </div>
        ) : (
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{
              width, height,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`,
              transition: animate ? "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
            }}
          >
            <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="block">
              <defs>
                <filter id="tableShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                  <feOffset dx="0" dy="2" result="off"/>
                  <feComponentTransfer><feFuncA type="linear" slope="0.18"/></feComponentTransfer>
                  <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              {/* Room geometry — outline + data-driven fixtures */}
              <RoomGeometry roomX={roomX} roomY={roomY} roomW={roomW} roomH={roomH} fixtures={cfg.fixtures} />

              {layout.map(({ t, i, cx, cy, dims: d }) => {
                const seated = assignments.filter(a => a.table_id === t.id);
                const conflict = tableConflicts(t.id, assignments, constraints).length > 0;
                const over = seated.length > t.capacity;
                return (
                  <TableShapeBg
                    key={t.id} index={i} table={t} cx={cx} cy={cy}
                    seated={seated} conflict={conflict} over={over}
                    diff={highlights?.get(t.id) ?? null}
                    dims={d}
                  />
                );
              })}
            </svg>

            {/* Seat drop zones + seats overlay (sharing transform) */}
            <div className="absolute inset-0 pointer-events-none">
              {!arrangeMode && layout.map(({ t, seats }) => {
                const seated = assignments.filter(a => a.table_id === t.id);
                const seatMap = new Map<number, Assignment>();
                seated.forEach(a => { if (a.seat_index != null) seatMap.set(a.seat_index, a); });
                const tableSeated = seated;
                return seats.map((s, idx) => {
                  const a = seatMap.get(idx);
                  const guest = a ? guestById.get(a.guest_id) : undefined;
                  return (
                    <Seat
                      key={`${t.id}-${idx}`}
                      tableId={t.id}
                      seatIndex={idx}
                      x={s.x} y={s.y}
                      assignment={a}
                      guest={guest}
                      table={t}
                      allTables={tables}
                      tableSeated={tableSeated}
                      guestById={guestById}
                      onUnassign={onUnassign}
                      onTogglePin={onTogglePin}
                      onMoveTo={onMoveTo}
                      onSwapWith={onSwapWith}
                      unassigned={unassigned}
                      constraints={constraints}
                      onAssign={onAssign}
                      canEdit={canEdit}
                    />
                  );
                });
              })}
              {/* Table label centred */}
              {layout.map(({ t, cx, cy }) => {
                const seated = assignments.filter(a => a.table_id === t.id);
                return (
                  <div key={`lbl-${t.id}`} className="absolute pointer-events-none text-center" style={{ left: cx, top: cy, transform: "translate(-50%, -50%)" }}>
                    <div className="font-display text-[14px] leading-none text-ink">{t.name}</div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-2 mt-1 tabular-nums">{seated.length} / {t.capacity}</div>
                  </div>
                );
              })}
              {/* Arrange mode drag handles — cover each table, capture pointer for dragging */}
              {arrangeMode && layout.map(({ t, i, cx, cy, box }) => {
                const isDragging = tableDragRef.current?.id === t.id;
                return (
                  <div
                    key={`arrange-${t.id}`}
                    className="absolute pointer-events-auto flex items-center justify-center rounded-xl transition-[border-color,box-shadow]"
                    style={{
                      left: cx, top: cy,
                      width: box.w + 24, height: box.h + 24,
                      transform: "translate(-50%, -50%)",
                      border: isDragging
                        ? "2px dashed hsl(var(--terracotta))"
                        : "2px dashed hsl(var(--hairline))",
                      cursor: isDragging ? "grabbing" : "grab",
                      background: isDragging ? "hsl(var(--terracotta) / 0.04)" : "transparent",
                      boxShadow: isDragging ? "0 8px 24px -8px hsl(var(--terracotta) / 0.3)" : "none",
                      touchAction: "none",
                      userSelect: "none",
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const startCx = livePos.get(t.id)?.cx ?? cx;
                      const startCy = livePos.get(t.id)?.cy ?? cy;
                      tableDragRef.current = { id: t.id, startCx, startCy, startPx: e.clientX, startPy: e.clientY };
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      if (!tableDragRef.current || tableDragRef.current.id !== t.id) return;
                      const { startCx, startCy, startPx, startPy } = tableDragRef.current;
                      const dx = (e.clientX - startPx) / view.z;
                      const dy = (e.clientY - startPy) / view.z;
                      setLivePos(m => new Map(m).set(t.id, { cx: startCx + dx, cy: startCy + dy }));
                    }}
                    onPointerUp={() => {
                      if (!tableDragRef.current || tableDragRef.current.id !== t.id) return;
                      const pos = livePos.get(t.id);
                      if (pos) onTableMove?.(t.id, pos.cx, pos.cy);
                      tableDragRef.current = null;
                    }}
                    onPointerCancel={() => { tableDragRef.current = null; }}
                  >
                    <Move size={14} className="text-ink-3 opacity-50 pointer-events-none" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Arrange mode hint banner */}
        {arrangeMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full bg-ink/90 backdrop-blur px-4 py-2 text-paper pointer-events-none">
            <Move size={12} />
            <span className="font-mono text-[11px] uppercase tracking-[0.12em]">Drag tables to arrange</span>
          </div>
        )}

        {/* Zoom + view controls */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-paper/95 backdrop-blur rounded-full border border-ink/15 shadow-soft px-1 py-1">
          <button onClick={() => zoomBy(1/1.2)} className="w-10 h-10 rounded-full hover:bg-paper-2 flex items-center justify-center text-ink-2 hover:text-ink" aria-label="Zoom out"><Minus size={14}/></button>
          <button onClick={reset} className="px-2 font-mono text-[11px] tabular-nums text-ink-2 hover:text-ink min-w-[42px]" aria-label="Reset zoom">{Math.round(view.z * 100)}%</button>
          <button onClick={() => zoomBy(1.2)} className="w-10 h-10 rounded-full hover:bg-paper-2 flex items-center justify-center text-ink-2 hover:text-ink" aria-label="Zoom in"><Plus size={14}/></button>
          <span className="w-px h-4 bg-hairline mx-0.5"/>
          <button onClick={fit} className="w-10 h-10 rounded-full hover:bg-paper-2 flex items-center justify-center text-ink-2 hover:text-ink" aria-label="Fit to content" title="Fit to content"><Maximize2 size={13}/></button>
          <button onClick={reset} className="w-10 h-10 rounded-full hover:bg-paper-2 flex items-center justify-center text-ink-2 hover:text-ink" aria-label="Reset view" title="Reset view"><RotateCcw size={13}/></button>
        </div>

        {/* Legend — hidden on mobile to avoid overlap with FAB and zoom controls */}
        <div className="absolute bottom-3 left-3 hidden sm:flex gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-2 bg-paper/95 backdrop-blur rounded-full px-3 py-1.5 border border-ink/15 shadow-soft">
          <span className="flex items-center gap-1.5"><Dot color="hsl(var(--olive))" filled/>full</span>
          <span className="flex items-center gap-1.5"><Dot color="hsl(var(--terracotta))" filled/>seating</span>
          <span className="flex items-center gap-1.5"><Dot color="hsl(var(--rose))" filled/>conflict</span>
          <span className="flex items-center gap-1.5"><Dot color="hsl(var(--ink-3))"/>open</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Compute table dimensions and inner shape size that scale with capacity so
 * seats never overlap. Seats are ~30px and need ~36px spacing (centre-to-centre).
 */
export interface TableDims {
  /** Hit / drop-zone box including seat halo. */
  box: { w: number; h: number };
  /** Drawn shape width (rect) or unused (round = use radius). */
  shapeW: number;
  /** Drawn shape height. */
  shapeH: number;
  /** Radius for round/square inscribed circle. */
  radius: number;
}

const SEAT_PITCH = 36;   // min centre-to-centre seat spacing
const SEAT_SIZE = 30;    // seat diameter
const SEAT_GAP = 18;     // gap from table edge to seat centre

function tableDims(t: TableDef): TableDims {
  const cap = Math.max(1, t.capacity);
  if (t.shape === "round") {
    // Circumference must fit cap seats at SEAT_PITCH apart.
    const seatRing = (cap * SEAT_PITCH) / (2 * Math.PI);
    const radius = Math.max(60, seatRing - SEAT_GAP);
    const outer = radius + SEAT_GAP + SEAT_SIZE / 2;
    return { box: { w: outer * 2, h: outer * 2 }, shapeW: radius * 2, shapeH: radius * 2, radius };
  }
  if (t.shape === "square") {
    // Seats wrap around perimeter; perimeter / cap >= SEAT_PITCH.
    const side = Math.max(110, (cap * SEAT_PITCH) / 4);
    const outer = side / 2 + SEAT_GAP + SEAT_SIZE / 2;
    return { box: { w: outer * 2, h: outer * 2 }, shapeW: side, shapeH: side, radius: side / 2 };
  }
  // Rectangular variants — top/bottom rows + optional end seats.
  const useEnds = cap >= 4;
  const sideTotal = useEnds ? cap - 2 : cap;
  const top = Math.ceil(sideTotal / 2);
  const bot = sideTotal - top;
  const perRow = Math.max(top, bot, 1);
  // width must fit perRow seats: (perRow + 1) gaps along the row inside w
  const minW =
    t.shape === "head" ? 180 :
    t.shape === "long" ? 200 : 160;
  const minH =
    t.shape === "head" ? 64 :
    t.shape === "long" ? 60 : 90;
  const shapeW = Math.max(minW, (perRow + 1) * SEAT_PITCH);
  const shapeH = minH;
  const padX = (useEnds ? SEAT_GAP + SEAT_SIZE / 2 : 0) + 8;
  const padY = SEAT_GAP + SEAT_SIZE / 2;
  return {
    box: { w: shapeW + padX * 2, h: shapeH + padY * 2 },
    shapeW, shapeH, radius: 0,
  };
}

function TableDropZone({ tableId, style }: { tableId: string; style: React.CSSProperties }) {
  const { setNodeRef, isOver } = useDroppable({ id: `table:${tableId}` });
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl pointer-events-auto transition ${isOver ? "ring-2 ring-terracotta/50 bg-terracotta/5" : ""}`}
    />
  );
}

interface SeatProps {
  tableId: string; seatIndex: number; x: number; y: number;
  assignment?: Assignment; guest?: Guest; table: TableDef;
  allTables: TableDef[]; tableSeated: Assignment[]; guestById: Map<string, Guest>;
  onUnassign: (a: Assignment) => void;
  onTogglePin: (a: Assignment) => void;
  onMoveTo: (a: Assignment, tableId: string) => void;
  onSwapWith: (a: Assignment, b: Assignment) => void;
  unassigned: Guest[];
  constraints: ConstraintDef[];
  onAssign?: (guestId: string, tableId: string, seatIndex: number) => void;
  canEdit: boolean;
}

function Seat({ tableId, seatIndex, x, y, assignment, guest, table, allTables, tableSeated, guestById, onUnassign, onTogglePin, onMoveTo, onSwapWith, unassigned, constraints, onAssign, canEdit }: SeatProps) {
  const dropId = `seat:${tableId}:${seatIndex}`;
  const { setNodeRef: dropRef, isOver } = useDroppable({ id: dropId });
  const occupied = !!assignment && !!guest;
  const swapPreview = isOver && occupied;
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div
      ref={dropRef}
      style={{ left: x, top: y, position: "absolute", transform: "translate(-50%, -50%)", width: 44, height: 44 }}
      className="pointer-events-auto flex items-center justify-center"
      title={occupied ? `${guest!.name}${guest!.meal ? ` · ${guest!.meal}` : ""}` : `Seat ${seatIndex + 1} — empty`}
    >
      {occupied ? (
        <SeatMenu
          assignment={assignment!} guest={guest!} table={table}
          allTables={allTables} tableSeated={tableSeated} guestById={guestById}
          onUnassign={onUnassign} onTogglePin={onTogglePin} onMoveTo={onMoveTo} onSwapWith={onSwapWith}
        >
          <SeatedChip
            guestId={guest!.id} guest={guest!} pinned={assignment!.pinned}
            swapPreview={swapPreview}
          />
        </SeatMenu>
      ) : canEdit && onAssign ? (
        <SeatPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          table={table}
          seatIndex={seatIndex}
          tableSeated={tableSeated}
          unassigned={unassigned}
          guestById={guestById}
          constraints={constraints}
          onPick={(guestId) => { onAssign(guestId, tableId, seatIndex); setPickerOpen(false); }}
        >
          <button
            type="button"
            onContextMenu={(e) => { e.preventDefault(); setPickerOpen(true); }}
            className={`w-[30px] h-[30px] rounded-full border transition-[transform,background-color,border-color] duration-100 flex items-center justify-center font-mono text-[9px] text-ink-2 ${
              isOver ? "bg-terracotta/15 border-terracotta scale-110" : "border-ink/60 bg-paper hover:border-ink hover:bg-paper-2"
            }`}
            aria-label={`Seat ${seatIndex + 1} — empty. Click to assign.`}
          >
            {seatIndex + 1}
          </button>
        </SeatPicker>
      ) : (
        <div
          className={`w-[30px] h-[30px] rounded-full border transition-[transform,background-color,border-color] duration-100 flex items-center justify-center font-mono text-[9px] text-ink-2 ${
            isOver ? "bg-terracotta/15 border-terracotta scale-110" : "border-ink/60 bg-paper"
          }`}
        >
          {seatIndex + 1}
        </div>
      )}
    </div>
  );
}

function SeatedChip({ guestId, guest, pinned, swapPreview }: { guestId: string; guest: Guest; pinned: boolean; swapPreview: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: guestId });
  const color = guestColor(guest);
  const label = guest.name.split(" ")[0].slice(0, 4); // first name, max 4 chars
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ touchAction: "none", background: swapPreview ? "hsl(var(--butter) / 0.4)" : color }}
      className={`relative w-[30px] h-[30px] rounded-full flex items-center justify-center font-mono text-[8px] font-semibold cursor-grab active:cursor-grabbing transition-opacity duration-150 text-paper
        ${swapPreview ? "ring-2 ring-butter text-ink scale-110" : "ring-1 ring-white/20"}
        ${isDragging ? "opacity-30" : ""}`}
      aria-label={`${guest.name}${pinned ? " (pinned)" : ""}`}
      title={`${guest.name}${guest.party ? ` · ${guest.party}` : ""}`}
    >
      {label}
      {pinned && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-olive ring-1 ring-paper"/>}
    </button>
  );
}

function Dot({ color, filled = true }: { color: string; filled?: boolean }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full"
      style={filled
        ? { background: color }
        : { background: "transparent", border: `1px solid ${color}` }}
    />
  );
}

function RoomGeometry({ roomX, roomY, roomW, roomH, fixtures }: { roomX: number; roomY: number; roomW: number; roomH: number; fixtures: Fixture[] }) {
  const toCanvas = (f: Fixture) => ({
    x: roomX + f.x_pct * roomW,
    y: roomY + f.y_pct * roomH,
    w: (f.w_pct ?? 0.1) * roomW,
    h: (f.h_pct ?? 0.06) * roomH,
  });

  return (
    <g pointerEvents="none">
      {/* Room outline */}
      <rect
        x={roomX} y={roomY} width={roomW} height={roomH}
        fill="none"
        stroke="hsl(var(--ink))"
        strokeWidth={1.5}
        opacity={0.85}
      />

      {fixtures.filter(f => f.visible).map(f => {
        const p = toCanvas(f);
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;

        if (f.type === "compass") {
          return (
            <g key={f.id} transform={`translate(${p.x}, ${p.y})`}>
              <circle r={14} fill="none" stroke="hsl(var(--ink-3))" strokeWidth={0.6} />
              <path d="M 0 -11 L 3 4 L 0 0 L -3 4 Z" fill="hsl(var(--ink))" />
              <text y={-17} textAnchor="middle"
                fontFamily='"Geist Mono", monospace'
                fontSize={9} fill="hsl(var(--ink-3))">{f.label}</text>
            </g>
          );
        }

        if (f.type === "dance_floor") {
          return (
            <g key={f.id}>
              <rect x={p.x} y={p.y} width={p.w} height={p.h}
                fill="hsl(var(--terracotta) / 0.06)"
                stroke="hsl(var(--terracotta))"
                strokeWidth={1}
                strokeDasharray="4 4" />
              <text x={cx} y={cy + 5}
                textAnchor="middle"
                fontFamily="Newsreader, serif"
                fontStyle="italic"
                fontSize={13}
                fill="hsl(var(--terracotta))">{f.label}</text>
            </g>
          );
        }

        if (f.type === "entry") {
          return (
            <g key={f.id}>
              <rect x={p.x} y={p.y} width={p.w} height={p.h}
                fill="hsl(var(--paper))" stroke="hsl(var(--ink))" strokeWidth={1} opacity={0.9} />
              <text x={cx} y={p.y + p.h - 4}
                textAnchor="middle"
                fontFamily='"Geist Mono", monospace'
                fontSize={9}
                letterSpacing="0.16em"
                fill="hsl(var(--ink-2))">{f.label}</text>
            </g>
          );
        }

        if (f.type === "dj") {
          return (
            <g key={f.id}>
              <rect x={p.x} y={p.y} width={p.w} height={p.h}
                fill="hsl(var(--paper-2))" stroke="hsl(var(--ink))" strokeWidth={0.8} />
              <text x={cx} y={cy + 4}
                textAnchor="middle"
                fontFamily='"Geist Mono", monospace'
                fontSize={9}
                letterSpacing="0.18em"
                fill="hsl(var(--ink-2))">{f.label}</text>
            </g>
          );
        }

        if (f.type === "annotation") {
          const words = f.label.split(" ");
          const mid = Math.ceil(words.length / 2);
          const line1 = words.slice(0, mid).join(" ");
          const line2 = words.slice(mid).join(" ");
          return (
            <g key={f.id} transform={`translate(${p.x}, ${p.y}) rotate(-2)`}>
              <text
                fontFamily="Newsreader, serif"
                fontStyle="italic"
                fontSize={13}
                fill="hsl(var(--terracotta))"
                opacity={0.85}
              >
                <tspan x={0} dy={0}>{line1}</tspan>
                {line2 && <tspan x={0} dy={17}>{line2}</tspan>}
              </text>
            </g>
          );
        }

        // Default: box fixture (bar, stage, bathroom, catering, coat_check, photo_booth)
        return (
          <g key={f.id}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h}
              fill="hsl(var(--paper-2))" stroke="hsl(var(--ink))" strokeWidth={0.8} rx={3} />
            <text x={cx} y={cy + 4}
              textAnchor="middle"
              fontFamily="Newsreader, serif"
              fontStyle="italic"
              fontSize={12}
              fill="hsl(var(--ink-2))">{f.label}</text>
          </g>
        );
      })}
    </g>
  );
}

interface ShapeProps {
  table: TableDef; index: number; cx: number; cy: number;
  seated: Assignment[]; conflict: boolean; over: boolean;
  diff?: "added" | "removed" | "changed" | null;
  dims: TableDims;
}

function TableShapeBg({ table, index, cx, cy, conflict, over, diff, dims }: ShapeProps) {
  const diffColor =
    diff === "added" ? "hsl(var(--olive))" :
    diff === "removed" ? "hsl(var(--ink-4))" :
    diff === "changed" ? "hsl(var(--terracotta))" : null;
  const baseStroke = "hsl(var(--ink))";
  const stroke = diffColor ?? (conflict ? "hsl(var(--terracotta))" : over ? "hsl(var(--butter))" : baseStroke);
  const strokeWidth = diffColor ? 2.5 : (conflict || over ? 2 : 1.25);
  const dash = diff === "removed" ? "6 4" : undefined;
  const fill = "hsl(var(--paper))";

  let shape: JSX.Element;
  let innerRing: JSX.Element | null = null;
  if (table.shape === "round") {
    const r = dims.radius;
    shape = <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dash} filter="url(#tableShadow)"/>;
    innerRing = <circle cx={cx} cy={cy} r={Math.max(0, r - 6)} fill="none" stroke={baseStroke} strokeWidth={0.5} opacity={0.35}/>;
  } else if (table.shape === "square") {
    const s = dims.shapeW;
    shape = <rect x={cx - s/2} y={cy - s/2} width={s} height={s} rx={8} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dash} filter="url(#tableShadow)"/>;
    innerRing = <rect x={cx - s/2 + 6} y={cy - s/2 + 6} width={s - 12} height={s - 12} rx={6} fill="none" stroke={baseStroke} strokeWidth={0.5} opacity={0.35}/>;
  } else {
    const w = dims.shapeW, h = dims.shapeH;
    const rx = table.shape === "head" ? 10 : 6;
    shape = <rect x={cx - w/2} y={cy - h/2} width={w} height={h} rx={rx} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dash} filter="url(#tableShadow)"/>;
  }

  return (
    <g style={{ animation: `floorplan-rise 360ms cubic-bezier(0.22,1,0.36,1) ${index * 40}ms both`, transformOrigin: `${cx}px ${cy}px` }}>
      <style>{`@keyframes floorplan-rise { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }`}</style>
      {shape}
      {innerRing}
    </g>
  );
}

function computeSeats(t: TableDef, cx: number, cy: number, dims: TableDims): { x: number; y: number }[] {
  const cap = Math.max(1, t.capacity);
  if (t.shape === "round" || t.shape === "square") {
    const r = (t.shape === "round" ? dims.radius : dims.shapeW / 2) + SEAT_GAP;
    return Array.from({ length: cap }, (_, i) => {
      const a = (i / cap) * Math.PI * 2 - Math.PI / 2;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    });
  }
  const w = dims.shapeW;
  const h = dims.shapeH;
  const seats: { x: number; y: number }[] = [];
  const useEnds = cap >= 4;
  const sideTotal = useEnds ? cap - 2 : cap;
  const top = Math.ceil(sideTotal / 2);
  const bot = sideTotal - top;
  const placeRow = (count: number, y: number) => {
    for (let i = 0; i < count; i++) {
      const x = cx - w / 2 + ((i + 1) * w) / (count + 1);
      seats.push({ x, y });
    }
  };
  placeRow(top, cy - h / 2 - SEAT_GAP);
  placeRow(bot, cy + h / 2 + SEAT_GAP);
  if (useEnds) {
    seats.push({ x: cx - w / 2 - SEAT_GAP, y: cy });
    seats.push({ x: cx + w / 2 + SEAT_GAP, y: cy });
  }
  return seats.slice(0, cap);
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() ?? "").join("");
}
