import { useMemo, useState } from "react";
import { DndContext, useDraggable, useDroppable, DragOverlay, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import type { Guest, TableDef, Assignment, ConstraintDef } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Pin, X, LayoutGrid, UserPlus } from "lucide-react";
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
  const [view, setView] = useState<"list" | "floor">("list");
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
      <div className="flex justify-end mb-3">
        <div className="inline-flex rounded-full border border-border/60 bg-card p-0.5 text-sm">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <ListIcon size={14}/> List
          </button>
          <button
            onClick={() => setView("floor")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition ${view === "floor" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutDashboard size={14}/> Floor plan
          </button>
        </div>
      </div>

      {view === "floor" ? (
        <div className="grid lg:grid-cols-[280px_1fr] gap-4">
          <UnassignedPanel guests={unassigned} search={search} setSearch={setSearch} totalGuests={guests.length} onAddGuest={onGoToGuests}/>
          <FloorPlan tables={tables} assignments={assignments} guests={guests} constraints={constraints}/>
        </div>
      ) : (
      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        <UnassignedPanel guests={unassigned} search={search} setSearch={setSearch} totalGuests={guests.length} onAddGuest={onGoToGuests}/>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {tables.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
              <LayoutGrid className="mx-auto text-muted-foreground" size={28}/>
              <div className="font-display text-lg mt-3">No tables yet</div>
              <div className="text-sm text-muted-foreground mt-1 mb-4">Set up your reception tables before assigning seats.</div>
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
    <div ref={setNodeRef} className={`rounded-xl border bg-card p-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto ${isOver ? "border-primary" : "border-border/60"}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Unassigned ({guests.length})</div>
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14}/>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-8 h-8 text-sm"/>
      </div>
      <div className="space-y-1">
        {guests.map(g => <GuestPill key={g.id} guest={g}/>)}
        {guests.length === 0 && totalGuests === 0 && (
          <div className="text-center py-4">
            <UserPlus className="mx-auto text-muted-foreground mb-2" size={20}/>
            <div className="text-xs text-muted-foreground mb-2">No guests yet</div>
            <Button size="sm" variant="outline" onClick={onAddGuest}>Add guests</Button>
          </div>
        )}
        {guests.length === 0 && totalGuests > 0 && <div className="text-xs text-muted-foreground py-4 text-center">All seated 🎉</div>}
      </div>
    </div>
  );
}

function GuestPill({ guest, dragging, pinned, onTogglePin }: { guest: Guest; dragging?: boolean; pinned?: boolean; onTogglePin?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: guest.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg border bg-background text-sm cursor-grab active:cursor-grabbing
        ${isDragging ? "opacity-30" : ""} ${dragging ? "shadow-lg border-primary" : "border-border/60 hover:border-primary/40"}`}>
      <div className="flex-1 min-w-0 truncate">
        <span className="font-medium">{guest.name}</span>
        {guest.party && <span className="text-muted-foreground text-xs ml-1.5">· {guest.party}</span>}
      </div>
      {guest.meal && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{guest.meal}</span>}
      {onTogglePin && (
        <button onClick={(e) => { e.stopPropagation(); onTogglePin(); }} className={`opacity-0 group-hover:opacity-100 ${pinned ? "opacity-100 text-primary" : "text-muted-foreground"}`}>
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
  return (
    <div ref={setNodeRef}
      className={`rounded-xl border bg-card p-3 transition
        ${isOver ? "border-primary ring-2 ring-primary/20" : hasConflict ? "border-destructive/60" : over ? "border-warning/60" : "border-border/60"}`}>
      <div className="flex items-baseline justify-between mb-2">
        <div className="font-display text-lg">{table.name}</div>
        <div className="text-xs text-muted-foreground">{seated.length}/{table.capacity} · {table.shape}</div>
      </div>
      {hasConflict && <div className="text-xs text-destructive mb-2 flex items-center gap-1"><X size={12}/>Has conflicting guests</div>}
      <div className="space-y-1">
        {seated.map(a => {
          const g = guestById.get(a.guest_id);
          if (!g) return null;
          return <GuestPill key={a.id} guest={g} pinned={a.pinned} onTogglePin={() => onTogglePin(a)}/>;
        })}
        {Array.from({ length: empties }).map((_, i) => (
          <div key={i} className="text-xs text-muted-foreground/60 px-2 py-1.5 rounded-lg border border-dashed border-border/50">empty</div>
        ))}
      </div>
    </div>
  );
}