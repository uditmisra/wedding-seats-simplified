import { useMemo, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Guest, TableDef, Assignment, ConstraintDef } from "@/lib/types";
import { tableConflicts } from "@/lib/seating";

interface Props {
  tables: TableDef[];
  assignments: Assignment[];
  guests: Guest[];
  constraints: ConstraintDef[];
}

/**
 * A top-down SVG "floor plan" view: tables drawn to scale with seats
 * arranged around them. Hover any seat to see who's sitting there.
 */
export function FloorPlan({ tables, assignments, guests, constraints }: Props) {
  const guestById = useMemo(() => new Map(guests.map(g => [g.id, g])), [guests]);
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);

  // Layout: pack tables into a responsive grid in SVG units
  const cellW = 280;
  const cellH = 280;
  const cols = tables.length <= 2 ? tables.length : tables.length <= 6 ? 3 : 4;
  const rows = Math.max(1, Math.ceil(tables.length / Math.max(1, cols)));
  const width = cols * cellW;
  const height = rows * cellH;

  return (
    <div className="relative rounded-2xl border border-border/60 overflow-hidden"
         style={{ background: "var(--gradient-soft)" }}>
      {/* Decorative parquet floor */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none" aria-hidden>
        <defs>
          <pattern id="parquet" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="currentColor"/>
            <path d="M0 0L40 40M40 0L0 40" stroke="hsl(var(--foreground))" strokeOpacity="0.5" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#parquet)"/>
      </svg>

      {tables.length === 0 ? (
        <div className="relative p-16 text-center text-muted-foreground">
          Add a few tables and your room will come to life here.
        </div>
      ) : (
        <div className="relative w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ minHeight: 360, maxHeight: "70vh" }}>
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
                  table={t}
                  cx={cx}
                  cy={cy}
                  seated={seated}
                  guestById={guestById}
                  conflict={conflict}
                  over={over}
                  onHover={setHover}
                />
              );
            })}
          </svg>

          {/* Drag-and-drop overlay layer aligned to the SVG via percentages */}
          <div className="absolute inset-0 pointer-events-none">
            {tables.map((t, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              const cx = col * cellW + cellW / 2;
              const cy = row * cellH + cellH / 2;
              const { w: tw, h: th } = tableBox(t);
              const left = ((cx - tw / 2) / width) * 100;
              const top = ((cy - th / 2) / height) * 100;
              const w = (tw / width) * 100;
              const h = (th / height) * 100;
              const seated = assignments.filter(a => a.table_id === t.id);
              return (
                <TableDropZone
                  key={t.id}
                  tableId={t.id}
                  style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%` }}
                />
              );
            })}
            {/* Draggable seat handles for assigned guests */}
            {tables.map((t, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              const cx = col * cellW + cellW / 2;
              const cy = row * cellH + cellH / 2;
              const seats = computeSeats(t, cx, cy);
              const seated = assignments.filter(a => a.table_id === t.id);
              return seated.map((a, si) => {
                const s = seats[si];
                if (!s) return null;
                const left = (s.x / width) * 100;
                const top = (s.y / height) * 100;
                return (
                  <SeatDragHandle key={a.id} guestId={a.guest_id} style={{ left: `${left}%`, top: `${top}%` }}/>
                );
              });
            })}
          </div>

          {hover && (
            <div
              className="pointer-events-none absolute z-10 bg-foreground text-background text-xs rounded-md px-2 py-1 shadow-lg whitespace-nowrap"
              style={{ left: hover.x, top: hover.y, transform: "translate(-50%, -130%)" }}
            >
              {hover.text}
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-3 right-3 flex gap-3 text-[10px] uppercase tracking-wider text-muted-foreground bg-card/80 backdrop-blur rounded-full px-3 py-1.5 border border-border/60">
            <span className="flex items-center gap-1"><Dot color="hsl(var(--sage))"/>seated</span>
            <span className="flex items-center gap-1"><Dot color="hsl(var(--muted-foreground))"/>empty</span>
            <span className="flex items-center gap-1"><Dot color="hsl(var(--destructive))"/>conflict</span>
          </div>
        </div>
      )}
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
      className={`absolute rounded-2xl pointer-events-auto transition ${isOver ? "ring-4 ring-primary/60 bg-primary/5" : ""}`}
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
      style={{ ...style, transform: "translate(-50%, -50%)" }}
      className={`absolute w-6 h-6 rounded-full pointer-events-auto cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30" : "opacity-0 hover:opacity-20 hover:bg-primary"}`}
      aria-label="Drag guest"
    />
  );
}

function Dot({ color }: { color: string }) {
  return <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }}/>;
}

interface ShapeProps {
  table: TableDef;
  cx: number; cy: number;
  seated: Assignment[];
  guestById: Map<string, Guest>;
  conflict: boolean;
  over: boolean;
  onHover: (h: { x: number; y: number; text: string } | null) => void;
}

function TableShape({ table, cx, cy, seated, guestById, conflict, over, onHover }: ShapeProps) {
  const stroke = conflict ? "hsl(var(--destructive))" : over ? "hsl(var(--warning))" : "hsl(var(--border))";
  const strokeWidth = conflict || over ? 2 : 1;

  // Determine shape geometry + seat positions
  const seats = computeSeats(table, cx, cy);

  let shape: JSX.Element;
  if (table.shape === "round") {
    shape = <circle cx={cx} cy={cy} r={60} fill="url(#tableSheen)" stroke={stroke} strokeWidth={strokeWidth} filter="url(#tableShadow)"/>;
  } else if (table.shape === "square") {
    shape = <rect x={cx - 55} y={cy - 55} width={110} height={110} rx={8} fill="url(#tableSheen)" stroke={stroke} strokeWidth={strokeWidth} filter="url(#tableShadow)"/>;
  } else if (table.shape === "head") {
    shape = <rect x={cx - 90} y={cy - 32} width={180} height={64} rx={10} fill="url(#tableSheen)" stroke={stroke} strokeWidth={strokeWidth} filter="url(#tableShadow)"/>;
  } else if (table.shape === "long") {
    shape = <rect x={cx - 100} y={cy - 30} width={200} height={60} rx={6} fill="url(#tableSheen)" stroke={stroke} strokeWidth={strokeWidth} filter="url(#tableShadow)"/>;
  } else { // rectangle
    shape = <rect x={cx - 80} y={cy - 45} width={160} height={90} rx={6} fill="url(#tableSheen)" stroke={stroke} strokeWidth={strokeWidth} filter="url(#tableShadow)"/>;
  }

  const fillRatio = Math.min(1, seated.length / Math.max(1, table.capacity));

  return (
    <g>
      {shape}
      {/* Seats */}
      {seats.map((s, i) => {
        const a = seated[i];
        const guest = a ? guestById.get(a.guest_id) : undefined;
        const seatColor = guest
          ? "hsl(var(--sage))"
          : "hsl(var(--muted))";
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

      {/* Center label */}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="13" fontFamily="var(--font-display, serif)" fill="hsl(var(--foreground))" fontWeight="600">
        {table.name}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))" letterSpacing="0.08em">
        {seated.length} / {table.capacity}
      </text>

      {/* Capacity arc for round tables */}
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
  // rectangle / long / head — seats along long sides + ends
  const w = t.shape === "head" ? 180 : t.shape === "long" ? 200 : 160;
  const h = t.shape === "head" ? 64 : t.shape === "long" ? 60 : 90;
  const longSeats = Math.max(1, Math.ceil((cap - 2) / 2)); // 1 each end, rest split
  const perSide = Math.max(1, Math.ceil((cap - (cap >= 4 ? 2 : 0)) / 2));
  const seats: { x: number; y: number }[] = [];
  // Top side
  for (let i = 0; i < perSide && seats.length < cap; i++) {
    const x = cx - w / 2 + ((i + 1) * w) / (perSide + 1);
    seats.push({ x, y: cy - h / 2 - 18 });
  }
  // Bottom side
  for (let i = 0; i < perSide && seats.length < cap; i++) {
    const x = cx - w / 2 + ((i + 1) * w) / (perSide + 1);
    seats.push({ x, y: cy + h / 2 + 18 });
  }
  // Ends
  if (seats.length < cap) seats.push({ x: cx - w / 2 - 18, y: cy });
  if (seats.length < cap) seats.push({ x: cx + w / 2 + 18, y: cy });
  // Pad any extras around perimeter
  let n = longSeats;
  while (seats.length < cap) {
    seats.push({ x: cx + (n % 2 ? -1 : 1) * (w / 2 + 18 + n * 4), y: cy + (n * 6) });
    n++;
  }
  return seats.slice(0, cap);
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() ?? "").join("");
}