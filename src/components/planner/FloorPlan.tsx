import { useEffect, useMemo, useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Guest, TableDef, Assignment, ConstraintDef } from "@/lib/types";
import { tableConflicts } from "@/lib/seating";
import { Plus, Minus, Maximize2, RotateCcw } from "lucide-react";

interface Props {
  tables: TableDef[];
  assignments: Assignment[];
  guests: Guest[];
  constraints: ConstraintDef[];
  highlights?: Map<string, "added" | "removed" | "changed">;
  scenarioId?: string;
}

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;

/**
 * Miro-style pan/zoom floor plan. Tables are arranged on a virtual canvas
 * that the user can drag, scroll-zoom, and frame with on-screen controls.
 */
export function FloorPlan({ tables, assignments, guests, constraints, highlights, scenarioId }: Props) {
  const guestById = useMemo(() => new Map(guests.map(g => [g.id, g])), [guests]);
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);

  // Layout tables into virtual world coordinates
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

  // Space-to-pan
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target as HTMLElement)?.closest("input,textarea,[contenteditable]")) {
        setSpaceDown(true);
        e.preventDefault();
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
    setAnimate(true);
    setView({ x, y, z: zc });
    window.setTimeout(() => setAnimate(false), 320);
  };

  const reset = () => {
    setAnimate(true);
    setView({ x: 0, y: 0, z: 1 });
    window.setTimeout(() => setAnimate(false), 320);
  };

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
      // trackpad two-finger pan
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
          height: "70vh",
          minHeight: 420,
          cursor,
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
              width,
              height,
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

              {tables.map((t, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const cx = col * cellW + cellW / 2;
                const cy = row * cellH + cellH / 2;
                const seated = assignments.filter(a => a.table_id === t.id);
                const conflict = tableConflicts(t.id, assignments, constraints).length > 0;
                const over = seated.length > t.capacity;
                return (
                  <TableShape
                    key={t.id}
                    index={i}
                    table={t}
                    cx={cx}
                    cy={cy}
                    seated={seated}
                    guestById={guestById}
                    conflict={conflict}
                    over={over}
                    onHover={setHover}
                    diff={highlights?.get(t.id) ?? null}
                  />
                );
              })}
            </svg>

            {/* Drop zones + seat handles, sharing the same transform */}
            <div className="absolute inset-0 pointer-events-none">
              {tables.map((t, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const cx = col * cellW + cellW / 2;
                const cy = row * cellH + cellH / 2;
                const { w: tw, h: th } = tableBox(t);
                return (
                  <TableDropZone
                    key={t.id}
                    tableId={t.id}
                    style={{ left: cx - tw / 2, top: cy - th / 2, width: tw, height: th, position: "absolute" }}
                  />
                );
              })}
              {tables.map((t, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const cx = col * cellW + cellW / 2;
                const cy = row * cellH + cellH / 2;
                const seats = computeSeats(t, cx, cy);
                const seated = assignments.filter(a => a.table_id === t.id);
                return seated.map((a, si) => {
                  const s = seats[si]; if (!s) return null;
                  return <SeatDragHandle key={a.id} guestId={a.guest_id} style={{ left: s.x, top: s.y, position: "absolute" }}/>;
                });
              })}
            </div>
          </div>
        )}

        {hover && (
          <div
            className="pointer-events-none absolute z-10 bg-foreground text-background text-xs rounded-md px-2 py-1 shadow-lg whitespace-nowrap"
            style={{ left: view.x + hover.x * view.z, top: view.y + hover.y * view.z, transform: "translate(-50%, -130%)" }}
          >
            {hover.text}
          </div>
        )}

        {/* Zoom + view controls (Miro-style cluster) */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-card/90 backdrop-blur rounded-full border hairline shadow-sm px-1 py-1">
          <button onClick={() => zoomBy(1/1.2)} className="w-7 h-7 rounded-full hover:bg-surface-hover flex items-center justify-center text-soft" aria-label="Zoom out"><Minus size={13}/></button>
          <button onClick={reset} className="px-2 text-xs tabular-nums text-soft hover:text-foreground min-w-[42px]" aria-label="Reset zoom">{Math.round(view.z * 100)}%</button>
          <button onClick={() => zoomBy(1.2)} className="w-7 h-7 rounded-full hover:bg-surface-hover flex items-center justify-center text-soft" aria-label="Zoom in"><Plus size={13}/></button>
          <span className="w-px h-4 bg-border mx-0.5"/>
          <button onClick={fit} className="w-7 h-7 rounded-full hover:bg-surface-hover flex items-center justify-center text-soft" aria-label="Fit to content" title="Fit to content"><Maximize2 size={12}/></button>
          <button onClick={reset} className="w-7 h-7 rounded-full hover:bg-surface-hover flex items-center justify-center text-soft" aria-label="Reset view" title="Reset view"><RotateCcw size={12}/></button>
        </div>

        {/* Legend */}
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
  const { setNodeRef, isOver } = useDroppable({ id: tableId });
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl pointer-events-auto transition ${isOver ? "ring-4 ring-primary/60 bg-primary/5" : ""}`}
    />
  );
}

function SeatDragHandle({ guestId, style }: { guestId: string; style: React.CSSProperties }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: guestId });
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ ...style, transform: "translate(-50%, -50%)", width: 24, height: 24 }}
      className={`rounded-full pointer-events-auto cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30" : "opacity-0 hover:opacity-20 hover:bg-primary"}`}
      aria-label="Drag guest"
    />
  );
}

function Dot({ color }: { color: string }) {
  return <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }}/>;
}

interface ShapeProps {
  table: TableDef;
  index: number;
  cx: number; cy: number;
  seated: Assignment[];
  guestById: Map<string, Guest>;
  conflict: boolean;
  over: boolean;
  onHover: (h: { x: number; y: number; text: string } | null) => void;
  diff?: "added" | "removed" | "changed" | null;
}

function TableShape({ table, index, cx, cy, seated, guestById, conflict, over, onHover, diff }: ShapeProps) {
  const diffColor =
    diff === "added" ? "hsl(var(--sage))" :
    diff === "removed" ? "hsl(var(--muted-foreground))" :
    diff === "changed" ? "hsl(var(--primary))" :
    null;
  const stroke = diffColor ?? (conflict ? "hsl(var(--destructive))" : over ? "hsl(var(--warning))" : "hsl(var(--border))");
  const strokeWidth = diffColor ? 3 : (conflict || over ? 2 : 1);
  const dash = diff === "removed" ? "6 4" : undefined;

  const seats = computeSeats(table, cx, cy);

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

  const fillRatio = Math.min(1, seated.length / Math.max(1, table.capacity));

  return (
    <g style={{ animation: `floorplan-rise 360ms cubic-bezier(0.22,1,0.36,1) ${index * 40}ms both`, transformOrigin: `${cx}px ${cy}px` }}>
      <style>{`@keyframes floorplan-rise { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }`}</style>
      {shape}
      {seats.map((s, i) => {
        const a = seated[i];
        const guest = a ? guestById.get(a.guest_id) : undefined;
        const seatColor = guest ? "hsl(var(--sage))" : "hsl(var(--muted))";
        const ringColor = guest ? "hsl(var(--sage-foreground) / 0.4)" : "hsl(var(--border))";
        return (
          <g
            key={i}
            onMouseEnter={() => onHover({ x: s.x, y: s.y, text: guest ? `${guest.name}${guest.meal ? ` · ${guest.meal}` : ""}` : `Seat ${i + 1} — empty` })}
            onMouseLeave={() => onHover(null)}
            style={{ cursor: guest ? "pointer" : "default" }}
          >
            <circle cx={s.x} cy={s.y} r={11} fill={seatColor} stroke={ringColor} strokeWidth={1}/>
            {guest && (
              <text x={s.x} y={s.y + 3} textAnchor="middle" fontSize="9" fontWeight="600" fill="hsl(var(--foreground))">
                {initials(guest.name)}
              </text>
            )}
          </g>
        );
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="13" fontFamily="var(--font-display, serif)" fill="hsl(var(--foreground))" fontWeight="600">
        {table.name}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))" letterSpacing="0.08em">
        {seated.length} / {table.capacity}
      </text>
      {table.shape === "round" && (
        <circle
          cx={cx} cy={cy} r={68}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeOpacity="0.35"
          strokeWidth={2.5}
          strokeDasharray={`${fillRatio * 2 * Math.PI * 68} ${2 * Math.PI * 68}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          strokeLinecap="round"
        />
      )}
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
  // rectangle / long / head — chairs on BOTH long sides, plus end seats when capacity ≥ 4
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
