import { useMemo, useState } from "react";
import { DndContext, useDraggable, useDroppable, DragOverlay, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import type { Guest, TableDef, Assignment, ConstraintDef } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Pin, X, LayoutGrid, UserPlus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { tableConflicts } from "@/lib/seating";
import { FloorPlan } from "./FloorPlan";
import { LayoutDashboard, List as ListIcon } from "lucide-react";

interface Props {
  planId: string;
  scenarioId: string;
  guests: Guest[];
  tables: TableDef[];
  assignments: Assignment[];
  constraints: ConstraintDef[];
  refresh: () => void;
  onGoToGuests?: () => void;
  onGoToTables?: () => void;
}

export function SeatingView({ planId, scenarioId, guests, tables, assignments, constraints, refresh, onGoToGuests, onGoToTables }: Props) {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "floor">("floor");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const assignedMap = useMemo(() => new Map(assignments.map(a => [a.guest_id, a])), [assignments]);
  const guestById = useMemo(() => new Map(guests.map(g => [g.id, g])), [guests]);

  const unassigned = useMemo(() => {
    const q = search.toLowerCase();
    return guests
      .filter(g => g.rsvp !== "declined" && !assignedMap.has(g.id))
      .filter(g => !q || g.name.toLowerCase().includes(q) || (g.party ?? "").toLowerCase().includes(q))
      .sort((a, b) => (a.party ?? "").localeCompare(b.party ?? "") || a.name.localeCompare(b.name));
  }, [guests, assignedMap, search]);

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const guestId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    if (overId === "__unassign__") {
      await supabase.from("assignments").delete().eq("guest_id", guestId);
      refresh(); return;
    }
    // overId is table id
    const existing = assignedMap.get(guestId);
    if (existing) {
      await supabase.from("assignments").update({ table_id: overId }).eq("id", existing.id);
    } else {
      await supabase.from("assignments").insert({ plan_id: planId, scenario_id: scenarioId, guest_id: guestId, table_id: overId });
    }
    refresh();
  };

  const togglePin = async (a: Assignment) => {
    await supabase.from("assignments").update({ pinned: !a.pinned }).eq("id", a.id);
    refresh();
  };

  return (
    <DndContext sensors={sensors} onDragStart={e => setActiveId(String(e.active.id))} onDragEnd={onDragEnd}>
      <TooltipProvider delayDuration={200}>
        <div className="flex justify-end mb-4">
          <div className="inline-flex rounded-lg border-hairline border bg-card p-0.5">
            <Tooltip><TooltipTrigger asChild>
              <button
                onClick={() => setView("floor")}
                aria-label="Floor plan view"
                className={`p-1.5 rounded-md transition ${view === "floor" ? "bg-primary text-primary-foreground" : "text-soft hover:text-foreground"}`}
              ><LayoutDashboard size={15}/></button>
            </TooltipTrigger><TooltipContent>Floor plan</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <button
                onClick={() => setView("list")}
                aria-label="List view"
                className={`p-1.5 rounded-md transition ${view === "list" ? "bg-primary text-primary-foreground" : "text-soft hover:text-foreground"}`}
              ><ListIcon size={15}/></button>
            </TooltipTrigger><TooltipContent>List view</TooltipContent></Tooltip>
          </div>
        </div>
      </TooltipProvider>

      {view === "floor" ? (
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          <UnassignedPanel guests={unassigned} search={search} setSearch={setSearch} totalGuests={guests.length} onAddGuest={onGoToGuests}/>
          <FloorPlan tables={tables} assignments={assignments} guests={guests} constraints={constraints}/>
        </div>
      ) : (
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <UnassignedPanel guests={unassigned} search={search} setSearch={setSearch} totalGuests={guests.length} onAddGuest={onGoToGuests}/>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {tables.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed hairline bg-surface/50 p-12 text-center">
              <LayoutGrid className="mx-auto text-soft" size={24}/>
              <div className="font-display text-lg mt-4">No tables yet</div>
              <Button onClick={onGoToTables}>Add tables</Button>
            </div>
          )}
          {tables.map(t => {
            const seated = assignments.filter(a => a.table_id === t.id);
            const conflicts = tableConflicts(t.id, assignments, constraints);
            return (
              <TableCard key={t.id} table={t} seated={seated} guestById={guestById} hasConflict={conflicts.length > 0} onTogglePin={togglePin}/>
            );
          })}
        </div>
      </div>
      )}
      <DragOverlay>
        {activeId ? <GuestPill guest={guestById.get(activeId)!} dragging/> : null}
      </DragOverlay>
    </DndContext>
  );
}

function UnassignedPanel({ guests, search, setSearch, totalGuests, onAddGuest }: { guests: Guest[]; search: string; setSearch: (s: string) => void; totalGuests: number; onAddGuest?: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: "__unassign__" });
  return (
    <div ref={setNodeRef} className={`rounded-2xl border bg-card p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto transition ${isOver ? "border-primary ring-2 ring-primary/20" : "hairline"}`}>
      <div className="flex items-baseline justify-between mb-3 px-1">
        <h3 className="font-display text-base">Guests to seat</h3>
        <span className="text-xs text-soft tabular-nums">{guests.length}</span>
      </div>
      <div className="relative mb-3 border-b hairline">
        <Search className="absolute left-1 top-2 text-soft" size={13}/>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" className="pl-6 h-8 text-sm border-0 rounded-none focus-visible:ring-0 bg-transparent"/>
      </div>
      <div className="space-y-1">
        {guests.map(g => <GuestPill key={g.id} guest={g}/>)}
        {guests.length === 0 && totalGuests === 0 && (
          <div className="text-center py-6">
            <UserPlus className="mx-auto text-soft mb-2" size={18}/>
            <Button size="sm" variant="outline" onClick={onAddGuest}>Add guests</Button>
          </div>
        )}
        {guests.length === 0 && totalGuests > 0 && <div className="text-xs text-soft py-6 text-center">All seated</div>}
      </div>
    </div>
  );
}

function GuestPill({ guest, dragging, pinned, onTogglePin }: { guest: Guest; dragging?: boolean; pinned?: boolean; onTogglePin?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: guest.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm cursor-grab active:cursor-grabbing transition
        ${isDragging ? "opacity-30" : ""} ${dragging ? "shadow-elegant bg-card ring-1 ring-primary/40" : "hover:bg-surface-hover"}`}>
      <div className="flex-1 min-w-0 truncate">
        <span className="font-medium">{guest.name}</span>
        {guest.party && <span className="text-soft text-xs ml-1.5">{guest.party}</span>}
      </div>
      {guest.meal && <span className="w-1.5 h-1.5 rounded-full bg-accent" title={guest.meal}/>}
      {onTogglePin && (
        <button onClick={(e) => { e.stopPropagation(); onTogglePin(); }} className={`opacity-0 group-hover:opacity-100 ${pinned ? "opacity-100 text-primary" : "text-soft"}`}>
          <Pin size={12}/>
        </button>
      )}
    </div>
  );
}

function TableCard({ table, seated, guestById, hasConflict, onTogglePin }: {
  table: TableDef; seated: Assignment[]; guestById: Map<string, Guest>; hasConflict: boolean; onTogglePin: (a: Assignment) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: table.id });
  const over = seated.length > table.capacity;
  const empties = Math.max(0, table.capacity - seated.length);
  const fillRatio = Math.min(1, seated.length / Math.max(1, table.capacity));
  return (
    <div ref={setNodeRef}
      className={`rounded-2xl border bg-card p-4 transition
        ${isOver ? "border-primary ring-2 ring-primary/20" : hasConflict ? "border-destructive/60" : over ? "border-warning/60" : "hairline"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-lg leading-tight">{table.name}</div>
        <CapacityRing seated={seated.length} capacity={table.capacity} ratio={fillRatio} over={over}/>
      </div>
      {hasConflict && <div className="text-xs text-destructive mb-2 flex items-center gap-1"><X size={12}/>Conflict at this table</div>}
      <div className="space-y-1">
        {seated.map(a => {
          const g = guestById.get(a.guest_id);
          if (!g) return null;
          return <GuestPill key={a.id} guest={g} pinned={a.pinned} onTogglePin={() => onTogglePin(a)}/>;
        })}
        {Array.from({ length: empties }).map((_, i) => (
          <div key={i} className="h-7 rounded-lg border border-dashed hairline"/>
        ))}
      </div>
    </div>
  );
}

function CapacityRing({ seated, capacity, ratio, over }: { seated: number; capacity: number; ratio: number; over: boolean }) {
  const r = 13;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-9 h-9 shrink-0" title={`${seated} / ${capacity} seated`}>
      <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
        <circle cx="16" cy="16" r={r} fill="none" stroke="hsl(var(--hairline))" strokeWidth="2"/>
        <circle cx="16" cy="16" r={r} fill="none"
          stroke={over ? "hsl(var(--warning))" : "hsl(var(--primary))"}
          strokeWidth="2" strokeLinecap="round"
          strokeDasharray={`${c * ratio} ${c}`}/>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium tabular-nums text-soft">{seated}/{capacity}</span>
    </div>
  );
}