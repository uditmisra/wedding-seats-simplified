import { useEffect, useMemo, useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Guest, TableDef, Assignment, ConstraintDef } from "@/lib/types";
import { tableConflicts } from "@/lib/seating";
import { Plus, Minus, Maximize2, RotateCcw } from "lucide-react";
import { SeatMenu } from "./SeatMenu";
import { SeatPicker } from "./SeatPicker";

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
}

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;

const noop = () => {};
export function FloorPlan({ tables, assignments, guests, constraints, highlights, scenarioId, onUnassign = noop, onTogglePin = noop, onMoveTo = noop, onSwapWith = noop, unassigned = [], onAssign, canEdit = true }: Props) {
  const guestById = useMemo(() => new Map(guests.map(g => [g.id, g])), [guests]);

  // Cell size grows with the largest table on the floor so big tables don't crowd neighbours.
  const dims = tables.map(tableDims);
  const maxW = Math.max(220, ...dims.map(d => d.box.w + 80));
  const maxH = Math.max(220, ...dims.map(d => d.box.h + 80));
  const cellW = Math.ceil(maxW);
  const cellH = Math.ceil(maxH);
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
    const d = dims[i];
    return { t, i, cx, cy, seats: computeSeats(t, cx, cy, d), box: d.box, dims: d };
  });

  return (
    <div className="relative rounded-2xl border hairline overflow-hidden bg-paper">
      <div
        ref={viewportRef}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-canvas-bg="1"
        className="paper-grain relative w-full overflow-hidden touch-none select-none"
        style={{
          height: "70vh", minHeight: 420, cursor,
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

              {/* Room geometry — outline, fixtures, compass, annotation */}
              <RoomGeometry width={width} height={height} />

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
                    <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3 mt-1 tabular-nums">{seated.length} / {t.capacity}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Zoom + view controls */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-paper/90 backdrop-blur rounded-full border hairline shadow-soft px-1 py-1">
          <button onClick={() => zoomBy(1/1.2)} className="w-7 h-7 rounded-full hover:bg-paper-2 flex items-center justify-center text-ink-3" aria-label="Zoom out"><Minus size={13}/></button>
          <button onClick={reset} className="px-2 font-mono text-[11px] tabular-nums text-ink-3 hover:text-ink min-w-[42px]" aria-label="Reset zoom">{Math.round(view.z * 100)}%</button>
          <button onClick={() => zoomBy(1.2)} className="w-7 h-7 rounded-full hover:bg-paper-2 flex items-center justify-center text-ink-3" aria-label="Zoom in"><Plus size={13}/></button>
          <span className="w-px h-4 bg-hairline mx-0.5"/>
          <button onClick={fit} className="w-7 h-7 rounded-full hover:bg-paper-2 flex items-center justify-center text-ink-3" aria-label="Fit to content" title="Fit to content"><Maximize2 size={12}/></button>
          <button onClick={reset} className="w-7 h-7 rounded-full hover:bg-paper-2 flex items-center justify-center text-ink-3" aria-label="Reset view" title="Reset view"><RotateCcw size={12}/></button>
        </div>

        <div className="absolute bottom-3 left-3 flex gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3 bg-paper/85 backdrop-blur rounded-full px-3 py-1.5 border hairline">
          <span className="flex items-center gap-1.5"><Dot color="hsl(var(--olive))" filled/>full</span>
          <span className="flex items-center gap-1.5"><Dot color="hsl(var(--terracotta))" filled/>seating</span>
          <span className="flex items-center gap-1.5"><Dot color="hsl(var(--rose))" filled/>conflict</span>
          <span className="flex items-center gap-1.5"><Dot color="hsl(var(--ink-4))"/>open</span>
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
            className={`w-[30px] h-[30px] rounded-full border transition-[transform,background-color,border-color] duration-100 flex items-center justify-center font-mono text-[9px] text-ink-3 ${
              isOver ? "bg-terracotta/15 border-terracotta scale-110" : "border-ink/40 bg-paper/60 hover:border-ink/70 hover:bg-paper"
            }`}
            aria-label={`Seat ${seatIndex + 1} — empty. Click to assign.`}
          >
            {seatIndex + 1}
          </button>
        </SeatPicker>
      ) : (
        <div
          className={`w-[30px] h-[30px] rounded-full border transition-[transform,background-color,border-color] duration-100 flex items-center justify-center font-mono text-[9px] text-ink-3 ${
            isOver ? "bg-terracotta/15 border-terracotta scale-110" : "border-ink/40 bg-paper/60"
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
      style={{ touchAction: "none" }}
      className={`relative w-full h-full rounded-full flex items-center justify-center font-mono text-[10px] font-medium cursor-grab active:cursor-grabbing transition-colors duration-150
        ${swapPreview
          ? "ring-2 ring-butter bg-butter/40 text-ink scale-110"
          : "bg-terracotta text-paper ring-1 ring-ink/20 hover:bg-terracotta-2"}
        ${isDragging ? "opacity-30" : ""}`}
      aria-label={`${guest.name}${pinned ? " (pinned)" : ""}`}
    >
      {initials(guest.name)}
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

/**
 * Decorative room geometry — outline, fixtures (dance floor / DJ / bar / entry),
 * a hand-written annotation, and a compass. None of this is in the data model;
 * it grounds the floor-plan metaphor visually. Positions are relative to the
 * laid-out table grid.
 */
function RoomGeometry({ width, height }: { width: number; height: number }) {
  // Insets so the room outline frames the tables with breathing room.
  const padX = 60, padTop = 80, padBottom = 100;
  const x = padX, y = padTop;
  const w = Math.max(200, width - padX * 2);
  const h = Math.max(200, height - padTop - padBottom);

  // Fixture placements relative to the room rect.
  const danceX = x + w - 160, danceY = y + h - 200, danceW = 130, danceH = 180;
  const djX = x + w - 90, djY = y + 24, djW = 70, djH = 36;
  const barX = x + 30, barY = y + h - 60, barW = 130, barH = 36;
  const entryX = x + w / 2 - 50, entryY = y - 8, entryW = 100, entryH = 16;

  return (
    <g pointerEvents="none">
      {/* Room outline */}
      <rect
        x={x} y={y} width={w} height={h}
        fill="none"
        stroke="hsl(var(--ink))"
        strokeWidth={1.2}
        opacity={0.6}
      />

      {/* Entry */}
      <rect x={entryX} y={entryY} width={entryW} height={entryH}
        fill="hsl(var(--paper))" stroke="hsl(var(--ink))" strokeWidth={1} opacity={0.85} />
      <text x={entryX + entryW / 2} y={entryY + entryH - 5}
        textAnchor="middle"
        fontFamily='"Geist Mono", monospace'
        fontSize={9}
        letterSpacing="0.16em"
        fill="hsl(var(--ink-2))">ENTRY</text>

      {/* DJ booth */}
      <rect x={djX} y={djY} width={djW} height={djH}
        fill="hsl(var(--paper-2))" stroke="hsl(var(--ink))" strokeWidth={0.8} />
      <text x={djX + djW / 2} y={djY + djH / 2 + 3}
        textAnchor="middle"
        fontFamily='"Geist Mono", monospace'
        fontSize={9}
        letterSpacing="0.18em"
        fill="hsl(var(--ink-2))">DJ</text>

      {/* Bar */}
      <rect x={barX} y={barY} width={barW} height={barH}
        fill="hsl(var(--paper-2))" stroke="hsl(var(--ink))" strokeWidth={0.8} />
      <text x={barX + barW / 2} y={barY + barH / 2 + 4}
        textAnchor="middle"
        fontFamily="Newsreader, serif"
        fontStyle="italic"
        fontSize={13}
        fill="hsl(var(--ink-2))">bar</text>

      {/* Dance floor */}
      <rect
        x={danceX} y={danceY} width={danceW} height={danceH}
        fill="hsl(var(--terracotta) / 0.06)"
        stroke="hsl(var(--terracotta))"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <text
        x={danceX + danceW / 2}
        y={danceY + danceH / 2 + 6}
        textAnchor="middle"
        fontFamily="Newsreader, serif"
        fontStyle="italic"
        fontSize={14}
        fill="hsl(var(--terracotta))"
      >dance floor</text>

      {/* Compass — top-right of the room */}
      <g transform={`translate(${x + w - 30}, ${y + 28})`}>
        <circle r={14} fill="none" stroke="hsl(var(--ink-3))" strokeWidth={0.6} />
        <path d="M 0 -11 L 3 4 L 0 0 L -3 4 Z" fill="hsl(var(--ink))" />
        <text y={-17} textAnchor="middle"
          fontFamily='"Geist Mono", monospace'
          fontSize={9} fill="hsl(var(--ink-3))">N</text>
      </g>

      {/* Hand-written annotation */}
      <g transform={`translate(${x + w - 220}, ${y + 90}) rotate(-3)`}>
        <text
          fontFamily="Newsreader, serif"
          fontStyle="italic"
          fontSize={14}
          fill="hsl(var(--terracotta))"
          opacity={0.85}
        >
          <tspan x={0} dy={0}>let&apos;s keep the college tables</tspan>
          <tspan x={0} dy={18}>close to the bar</tspan>
        </text>
        <path
          d="M -10 30 Q 20 50, 60 65"
          stroke="hsl(var(--terracotta))"
          fill="none"
          strokeWidth={1}
          opacity={0.7}
        />
        <path
          d="M 54 60 L 60 65 L 53 68"
          stroke="hsl(var(--terracotta))"
          fill="none"
          strokeWidth={1}
          opacity={0.7}
        />
      </g>
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
