import { useEffect, useMemo, useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Guest, TableDef, Assignment, ConstraintDef } from "@/lib/types";
import { tableConflicts } from "@/lib/seating";
import { Plus, Minus, Maximize2, RotateCcw } from "lucide-react";
import { SeatMenu } from "./SeatMenu";

interface Props {
  tables: TableDef[];
  assignments: Assignment[];
  guests: Guest[];
  constraints: ConstraintDef[];
  highlights?: Map<string, "added" | "removed" | "changed">;
  scenarioId?: string;
  onUnassign: (a: Assignment) => void;
  onTogglePin: (a: Assignment) => void;
  onMoveTo: (a: Assignment, tableId: string) => void;
  onSwapWith: (a: Assignment, b: Assignment) => void;
}

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;

export function FloorPlan({ tables, assignments, guests, constraints, highlights, scenarioId, onUnassign, onTogglePin, onMoveTo, onSwapWith }: Props) {
  const guestById = useMemo(() => new Map(guests.map(g => [g.id, g])), [guests]);

  const cellW = 280;
  const cellH = 280;
  const cols = tables.length <= 2 ? Math.max(1, tables.length) : tables.length <= 6 ? 3 : 4;
  const rows = Math.max(1, Math.ceil(tables.length / Math.max(1, cols)));
  const width = cols * cellW;
  const height = rows * cellH;

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stateKey = `floorplan:view:${scenarioId ?? "default"}`;

  const [view, setView] = useState<{ x: number; y: number; z: number }>(() => {
    if (typeof window === "undefined") return { x: 0, y: 0, z: 1 };
    try {
      const raw = localStorage.getItem(`floorplan:view:${scenarioId ?? "default"}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { x: 0, y: 0, z: 1 };
  });
  const [animate, setAnimate] = useState(false);
  const [panning, setPanning] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const panRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    try { localStorage.setItem(stateKey, JSON.stringify(view)); } catch {}
  }, [view, stateKey]);

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
  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = viewportRef.current!.getBoundingClientRect();
      zoomBy(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
    } else {
      e.preventDefault();
      setView(v => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    }
  };
  const onPointerDown = (e: React.PointerEvent) => {
    const isPan = e.button === 1 || spaceDown || (e.button === 0 && (e.target === viewportRef.current || (e.target as HTMLElement).dataset.canvasBg === "1"));
    if (!isPan) return;
    setPanning(true);
    panRef.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!panning || !panRef.current) return;
    const { sx, sy, ox, oy } = panRef.current;
    setView(v => ({ ...v, x: ox + (e.clientX - sx), y: oy + (e.clientY - sy) }));
  };
  const onPointerUp = () => { setPanning(false); panRef.current = null; };

  const cursor = panning ? "grabbing" : spaceDown ? "grab" : "default";
  const dotSize = 24 * view.z;

  // Pre-compute table positions/seats once
  const layout = tables.map((t, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = col * cellW + cellW / 2;
    const cy = row * cellH + cellH / 2;
    return { t, i, cx, cy, seats: computeSeats(t, cx, cy), box: tableBox(t) };
  });

  return (
    <div className="relative rounded-2xl border hairline overflow-hidden bg-card">
      <div
        ref={viewportRef}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-canvas-bg="1"
        className="relative w-full overflow-hidden touch-none select-none"
        style={{
          height: "70vh", minHeight: 420, cursor,
          backgroundImage: "radial-gradient(circle, hsl(var(--foreground) / 0.08) 1px, transparent 1px)",
          backgroundSize: `${dotSize}px ${dotSize}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
        }}
      >
        {tables.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-center text-muted-foreground p-16">
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
                <radialGradient id="tableSheen" cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="hsl(var(--card))" stopOpacity="1"/>
                  <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="1"/>
                </radialGradient>
                <filter id="tableShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                  <feOffset dx="0" dy="3" result="off"/>
                  <feComponentTransfer><feFuncA type="linear" slope="0.25"/></feComponentTransfer>
                  <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              {layout.map(({ t, i, cx, cy }) => {
                const seated = assignments.filter(a => a.table_id === t.id);
                const conflict = tableConflicts(t.id, assignments, constraints).length > 0;
                const over = seated.length > t.capacity;
                return (
                  <TableShapeBg
                    key={t.id} index={i} table={t} cx={cx} cy={cy}
                    seated={seated} conflict={conflict} over={over}
                    diff={highlights?.get(t.id) ?? null}
                  />
                );
              })}
            </svg>

            {/* Drop zones + seats overlay (sharing transform) */}
            <div className="absolute inset-0 pointer-events-none">
              {layout.map(({ t, cx, cy, box }) => (
                <TableDropZone
                  key={t.id}
                  tableId={t.id}
                  style={{ left: cx - box.w / 2 - 30, top: cy - box.h / 2 - 30, width: box.w + 60, height: box.h + 60, position: "absolute" }}
                />
              ))}
              {layout.map(({ t, seats }) => {
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
                    />
                  );
                });
              })}
              {/* Table label centred */}
              {layout.map(({ t, cx, cy }) => {
                const seated = assignments.filter(a => a.table_id === t.id);
                return (
                  <div key={`lbl-${t.id}`} className="absolute pointer-events-none text-center" style={{ left: cx, top: cy, transform: "translate(-50%, -50%)" }}>
                    <div className="font-display text-[13px] leading-none">{t.name}</div>
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1 tabular-nums">{seated.length} / {t.capacity}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Zoom + view controls */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-card/90 backdrop-blur rounded-full border hairline shadow-sm px-1 py-1">
          <button onClick={() => zoomBy(1/1.2)} className="w-7 h-7 rounded-full hover:bg-surface-hover flex items-center justify-center text-soft" aria-label="Zoom out"><Minus size={13}/></button>
          <button onClick={reset} className="px-2 text-xs tabular-nums text-soft hover:text-foreground min-w-[42px]" aria-label="Reset zoom">{Math.round(view.z * 100)}%</button>
          <button onClick={() => zoomBy(1.2)} className="w-7 h-7 rounded-full hover:bg-surface-hover flex items-center justify-center text-soft" aria-label="Zoom in"><Plus size={13}/></button>
          <span className="w-px h-4 bg-border mx-0.5"/>
          <button onClick={fit} className="w-7 h-7 rounded-full hover:bg-surface-hover flex items-center justify-center text-soft" aria-label="Fit to content" title="Fit to content"><Maximize2 size={12}/></button>
          <button onClick={reset} className="w-7 h-7 rounded-full hover:bg-surface-hover flex items-center justify-center text-soft" aria-label="Reset view" title="Reset view"><RotateCcw size={12}/></button>
        </div>

        <div className="absolute bottom-3 left-3 flex gap-3 text-[10px] uppercase tracking-wider text-muted-foreground bg-card/80 backdrop-blur rounded-full px-3 py-1.5 border border-border/60">
          <span className="flex items-center gap-1"><Dot color="hsl(var(--sage))"/>seated</span>
          <span className="flex items-center gap-1"><Dot color="hsl(var(--muted-foreground))"/>empty</span>
          <span className="flex items-center gap-1"><Dot color="hsl(var(--destructive))"/>conflict</span>
        </div>
      </div>
    </div>
  );
}

function tableBox(t: TableDef): { w: number; h: number } {
  if (t.shape === "round") return { w: 200, h: 200 };
  if (t.shape === "square") return { w: 200, h: 200 };
  if (t.shape === "head") return { w: 220, h: 120 };
  if (t.shape === "long") return { w: 240, h: 120 };
  return { w: 200, h: 140 };
}

function TableDropZone({ tableId, style }: { tableId: string; style: React.CSSProperties }) {
  const { setNodeRef, isOver } = useDroppable({ id: `table:${tableId}` });
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl pointer-events-auto transition ${isOver ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
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
}

function Seat({ tableId, seatIndex, x, y, assignment, guest, table, allTables, tableSeated, guestById, onUnassign, onTogglePin, onMoveTo, onSwapWith }: SeatProps) {
  const dropId = `seat:${tableId}:${seatIndex}`;
  const { setNodeRef: dropRef, isOver } = useDroppable({ id: dropId });
  const occupied = !!assignment && !!guest;
  const swapPreview = isOver && occupied;

  return (
    <div
      ref={dropRef}
      style={{ left: x, top: y, position: "absolute", transform: "translate(-50%, -50%)", width: 30, height: 30 }}
      className="pointer-events-auto"
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
      ) : (
        <div
          className={`w-full h-full rounded-full border transition flex items-center justify-center text-[9px] text-muted-foreground ${
            isOver ? "bg-primary/20 border-primary scale-110" : "bg-muted/40 border-border hover:border-foreground/30"
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
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`w-full h-full rounded-full flex items-center justify-center text-[10px] font-semibold cursor-grab active:cursor-grabbing transition shadow-soft
        ${swapPreview ? "ring-2 ring-warning bg-warning/20 scale-110" : "bg-sage/90 hover:bg-sage text-foreground ring-1 ring-foreground/10"}
        ${isDragging ? "opacity-30" : ""}`}
      style={{ background: swapPreview ? undefined : "hsl(var(--sage) / 0.85)" }}
      aria-label={`${guest.name}${pinned ? " (pinned)" : ""}`}
    >
      {initials(guest.name)}
      {pinned && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary ring-1 ring-card"/>}
    </button>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }}/>;
}

interface ShapeProps {
  table: TableDef; index: number; cx: number; cy: number;
  seated: Assignment[]; conflict: boolean; over: boolean;
  diff?: "added" | "removed" | "changed" | null;
}

function TableShapeBg({ table, index, cx, cy, seated, conflict, over, diff }: ShapeProps) {
  const diffColor =
    diff === "added" ? "hsl(var(--sage))" :
    diff === "removed" ? "hsl(var(--muted-foreground))" :
    diff === "changed" ? "hsl(var(--primary))" : null;
  const stroke = diffColor ?? (conflict ? "hsl(var(--destructive))" : over ? "hsl(var(--warning))" : "hsl(var(--border))");
  const strokeWidth = diffColor ? 3 : (conflict || over ? 2 : 1);
  const dash = diff === "removed" ? "6 4" : undefined;

  let shape: JSX.Element;
  if (table.shape === "round") {
    shape = <circle cx={cx} cy={cy} r={60} fill="url(#tableSheen)" stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dash} filter="url(#tableShadow)"/>;
  } else if (table.shape === "square") {
    shape = <rect x={cx - 55} y={cy - 55} width={110} height={110} rx={8} fill="url(#tableSheen)" stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dash} filter="url(#tableShadow)"/>;
  } else if (table.shape === "head") {
    shape = <rect x={cx - 90} y={cy - 32} width={180} height={64} rx={10} fill="url(#tableSheen)" stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dash} filter="url(#tableShadow)"/>;
  } else if (table.shape === "long") {
    shape = <rect x={cx - 100} y={cy - 30} width={200} height={60} rx={6} fill="url(#tableSheen)" stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dash} filter="url(#tableShadow)"/>;
  } else {
    shape = <rect x={cx - 80} y={cy - 45} width={160} height={90} rx={6} fill="url(#tableSheen)" stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dash} filter="url(#tableShadow)"/>;
  }

  return (
    <g style={{ animation: `floorplan-rise 360ms cubic-bezier(0.22,1,0.36,1) ${index * 40}ms both`, transformOrigin: `${cx}px ${cy}px` }}>
      <style>{`@keyframes floorplan-rise { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }`}</style>
      {shape}
    </g>
  );
}

function computeSeats(t: TableDef, cx: number, cy: number): { x: number; y: number }[] {
  const cap = Math.max(1, t.capacity);
  if (t.shape === "round" || t.shape === "square") {
    const r = t.shape === "round" ? 78 : 82;
    return Array.from({ length: cap }, (_, i) => {
      const a = (i / cap) * Math.PI * 2 - Math.PI / 2;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    });
  }
  const w = t.shape === "head" ? 180 : t.shape === "long" ? 200 : 160;
  const h = t.shape === "head" ? 64 : t.shape === "long" ? 60 : 90;
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
  placeRow(top, cy - h / 2 - 18);
  placeRow(bot, cy + h / 2 + 18);
  if (useEnds) {
    seats.push({ x: cx - w / 2 - 18, y: cy });
    seats.push({ x: cx + w / 2 + 18, y: cy });
  }
  return seats.slice(0, cap);
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() ?? "").join("");
}
