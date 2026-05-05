import { useEffect, useMemo, useState } from "react";
import { DndContext, useDraggable, useDroppable, DragOverlay, type DragEndEvent, type CollisionDetection, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, pointerWithin, closestCenter } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import type { Guest, TableDef, Assignment, ConstraintDef } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Pin, UserPlus, X } from "lucide-react";
import { tableConflicts } from "@/lib/seating";
import { FloorPlan } from "./FloorPlan";
import { SeatMenu } from "./SeatMenu";
import { EmptyCanvas } from "./EmptyCanvas";
import { Users as UsersIcon } from "lucide-react";
import { GroupedClusters } from "./GroupedClusters";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { useBelowLg } from "@/hooks/use-mobile";
import { guestColor } from "@/lib/guestColor";

interface Props {
  planId: string;
  scenarioId: string;
  guests: Guest[];
  tables: TableDef[];
  assignments: Assignment[];
  setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
  constraints: ConstraintDef[];
  refresh: () => void;
  canEdit?: boolean;
  onGoToGuests?: () => void;
  onGoToTables?: () => void;
}

// Composite collision strategy:
// 1. Unassign panel — strict pointer-within (intentional gesture).
// 2. Floor plan canvas — pointer-within the canvas wrapper, then closest-center
//    among seats (Voronoi-style: no pixel precision required).
// 3. List view seat rows — pointer-within individual rows (full-width, easy to hit).
const seatingCollision: CollisionDetection = (args) => {
  const unassignHit = pointerWithin({
    ...args,
    droppableContainers: args.droppableContainers.filter(c => c.id === "__unassign__"),
  });
  if (unassignHit.length > 0) return unassignHit;

  const canvasContainers = args.droppableContainers.filter(c => c.id === "__canvas__");
  if (canvasContainers.length > 0) {
    const inCanvas = pointerWithin({ ...args, droppableContainers: canvasContainers });
    if (!inCanvas.length) return [];
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter(c => String(c.id).startsWith("seat:")),
    });
  }

  return pointerWithin({
    ...args,
    droppableContainers: args.droppableContainers.filter(c => String(c.id).startsWith("seat:")),
  });
};

function firstFreeSeat(table: TableDef, seated: Assignment[], excludeId?: string): number | null {
  const taken = new Set(seated.filter(a => a.id !== excludeId && a.seat_index != null).map(a => a.seat_index!));
  for (let i = 0; i < table.capacity; i++) if (!taken.has(i)) return i;
  return null;
}

export function SeatingView({ planId, scenarioId, guests, tables, assignments, setAssignments, constraints, refresh, onGoToGuests, onGoToTables, canEdit = true }: Props) {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "floor" | "grouped">("floor");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const isBelowLg = useBelowLg();

  const assignedMap = useMemo(() => new Map(assignments.map(a => [a.guest_id, a])), [assignments]);
  const guestById = useMemo(() => new Map(guests.map(g => [g.id, g])), [guests]);
  const tableById = useMemo(() => new Map(tables.map(t => [t.id, t])), [tables]);

  // Lazy backfill: assign seat_index to legacy rows missing one. Owners only —
  // viewers can't UPDATE under RLS, and the previous version mutated assignment
  // objects in place + called refresh() unconditionally, which made seats
  // appear filled for a frame then snap back to empty (the "vanish" bug).
  useEffect(() => {
    if (!canEdit) return;
    const orphans = assignments.filter(a => a.seat_index == null);
    if (orphans.length === 0) return;
    const updates: { id: string; seat_index: number }[] = [];
    const byTable = new Map<string, Assignment[]>();
    assignments.forEach(a => {
      if (!byTable.has(a.table_id)) byTable.set(a.table_id, []);
      byTable.get(a.table_id)!.push(a);
    });
    for (const a of orphans) {
      const tbl = tableById.get(a.table_id); if (!tbl) continue;
      const seated = byTable.get(a.table_id) ?? [];
      const idx = firstFreeSeat(tbl, seated.filter(x => x.id !== a.id && x.seat_index != null));
      if (idx != null) {
        updates.push({ id: a.id, seat_index: idx });
        a.seat_index = idx; // mutate locally so subsequent loops see it
      }
    }
    if (updates.length === 0) return;
    Promise.all(
      updates.map(u =>
        supabase.from("assignments").update({ seat_index: u.seat_index }).eq("id", u.id),
      ),
    ).then(results => {
      // Only refresh if every update actually persisted. If any failed (e.g.
      // a transient RLS edge case), leave the locally-mutated state alone so
      // the UI doesn't snap back to "unseated".
      const allOk = results.every(r => !r.error);
      if (allOk) refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, canEdit]);

  const unassigned = useMemo(() => {
    const q = search.toLowerCase();
    return guests
      .filter(g => g.rsvp !== "declined" && !assignedMap.has(g.id))
      .filter(g => !q || g.name.toLowerCase().includes(q) || (g.party ?? "").toLowerCase().includes(q))
      .sort((a, b) => (a.party ?? "").localeCompare(b.party ?? "") || a.name.localeCompare(b.name));
  }, [guests, assignedMap, search]);

  const allUnassigned = useMemo(
    () => guests
      .filter(g => g.rsvp !== "declined" && !assignedMap.has(g.id))
      .sort((a, b) => (a.party ?? "").localeCompare(b.party ?? "") || a.name.localeCompare(b.name)),
    [guests, assignedMap],
  );

  const placeGuestAtSeat = async (guestId: string, tableId: string, seatIndex: number | null) => {
    const existing = assignedMap.get(guestId);
    const tbl = tableById.get(tableId); if (!tbl) return;
    const tableSeated = assignments.filter(a => a.table_id === tableId);

    let targetIdx = seatIndex;
    if (targetIdx == null) targetIdx = firstFreeSeat(tbl, tableSeated, existing?.id);

    const occupant = targetIdx != null
      ? tableSeated.find(a => a.seat_index === targetIdx && a.guest_id !== guestId)
      : undefined;

    // ── Optimistic update — instant UI ────────────────────────
    setAssignments(prev => {
      let next = prev.filter(a => a.guest_id !== guestId);
      if (occupant) {
        if (existing) {
          next = next.map(a => a.id === occupant.id
            ? { ...a, table_id: existing.table_id, seat_index: existing.seat_index ?? null }
            : a);
        } else {
          next = next.filter(a => a.id !== occupant.id);
        }
      }
      if (existing) {
        next.push({ ...existing, table_id: tableId, seat_index: targetIdx });
      } else {
        next.push({ id: `opt-${guestId}`, plan_id: planId, scenario_id: scenarioId, guest_id: guestId, table_id: tableId, seat_index: targetIdx, pinned: false });
      }
      return next;
    });

    // ── Background persist ────────────────────────────────────
    const ops: PromiseLike<unknown>[] = [];
    if (occupant) {
      if (existing) {
        ops.push(supabase.from("assignments").update({ table_id: existing.table_id, seat_index: existing.seat_index }).eq("id", occupant.id));
      } else {
        ops.push(supabase.from("assignments").delete().eq("id", occupant.id));
      }
    }
    if (existing) {
      ops.push(supabase.from("assignments").update({ table_id: tableId, seat_index: targetIdx }).eq("id", existing.id));
    } else {
      ops.push(supabase.from("assignments").insert({ plan_id: planId, scenario_id: scenarioId, guest_id: guestId, table_id: tableId, seat_index: targetIdx }));
    }
    const results = await Promise.all(ops);
    if (results.some((r: any) => r?.error)) { toast.error("Couldn't update seating"); refresh(); return; }
    refresh(); // background sync to replace optimistic IDs
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    if (!canEdit) return;
    const guestId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    if (overId === "__unassign__") {
      setAssignments(prev => prev.filter(a => a.guest_id !== guestId));
      await supabase.from("assignments").delete().eq("guest_id", guestId).eq("scenario_id", scenarioId);
      refresh(); return;
    }
    if (overId.startsWith("seat:")) {
      const [, tid, idxStr] = overId.split(":");
      await placeGuestAtSeat(guestId, tid, parseInt(idxStr, 10));
    }
  };

  const handleUnassign = async (a: Assignment) => {
    if (!canEdit) return;
    await supabase.from("assignments").delete().eq("id", a.id);
    refresh();
  };
  const handleTogglePin = async (a: Assignment) => {
    if (!canEdit) return;
    await supabase.from("assignments").update({ pinned: !a.pinned }).eq("id", a.id);
    refresh();
  };
  const handleMoveTo = async (a: Assignment, targetTableId: string) => {
    if (!canEdit) return;
    const tbl = tableById.get(targetTableId); if (!tbl) return;
    const seated = assignments.filter(x => x.table_id === targetTableId);
    const idx = firstFreeSeat(tbl, seated);
    await supabase.from("assignments").update({ table_id: targetTableId, seat_index: idx }).eq("id", a.id);
    refresh();
  };
  const handleSwap = async (a: Assignment, b: Assignment) => {
    if (!canEdit) return;
    await Promise.all([
      supabase.from("assignments").update({ table_id: b.table_id, seat_index: b.seat_index }).eq("id", a.id),
      supabase.from("assignments").update({ table_id: a.table_id, seat_index: a.seat_index }).eq("id", b.id),
    ]);
    refresh();
  };

  if (tables.length === 0 && guests.length === 0) {
    return (
      <EmptyCanvas
        onAddTables={() => onGoToTables?.()}
        onAddGuests={() => onGoToGuests?.()}
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={seatingCollision}
      onDragStart={e => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      autoScroll={{ threshold: { x: 0.1, y: 0.15 } }}
    >
      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-full border-hairline border bg-paper p-0.5 text-[13px]">
          <button onClick={() => setView("floor")}
            className={`rounded-full px-3.5 py-1 transition ${view === "floor" ? "bg-ink text-paper" : "text-ink-3 hover:text-ink"}`}>
            Plan
          </button>
          <button onClick={() => setView("grouped")}
            className={`rounded-full px-3.5 py-1 transition ${view === "grouped" ? "bg-ink text-paper" : "text-ink-3 hover:text-ink"}`}>
            Grouped
          </button>
          <button onClick={() => setView("list")}
            className={`rounded-full px-3.5 py-1 transition ${view === "list" ? "bg-ink text-paper" : "text-ink-3 hover:text-ink"}`}>
            List
          </button>
        </div>
      </div>

      {view === "floor" ? (
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {!isBelowLg && (
            <UnassignedPanel guests={unassigned} search={search} setSearch={setSearch} totalGuests={guests.length} onAddGuest={onGoToGuests}/>
          )}
          <FloorPlan
            tables={tables} assignments={assignments} guests={guests} constraints={constraints} scenarioId={scenarioId}
            onUnassign={handleUnassign} onTogglePin={handleTogglePin} onMoveTo={handleMoveTo} onSwapWith={handleSwap}
            unassigned={allUnassigned}
            canEdit={canEdit}
            onAssign={async (guestId, tableId, seatIndex) => {
              const g = guestById.get(guestId);
              const t = tableById.get(tableId);
              await placeGuestAtSeat(guestId, tableId, seatIndex);
              if (g && t) toast.success(`${g.name} seated at ${t.name} · Seat ${seatIndex + 1}`);
            }}
          />
          {isBelowLg && (
            <UnassignedDrawerTrigger count={unassigned.length}>
              <UnassignedPanel guests={unassigned} search={search} setSearch={setSearch} totalGuests={guests.length} onAddGuest={onGoToGuests}/>
            </UnassignedDrawerTrigger>
          )}
        </div>
      ) : view === "grouped" ? (
        <GroupedClusters guests={guests} tables={tables} assignments={assignments} />
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {!isBelowLg && (
            <UnassignedPanel guests={unassigned} search={search} setSearch={setSearch} totalGuests={guests.length} onAddGuest={onGoToGuests}/>
          )}
          {isBelowLg && (
            <UnassignedDrawerTrigger count={unassigned.length}>
              <UnassignedPanel guests={unassigned} search={search} setSearch={setSearch} totalGuests={guests.length} onAddGuest={onGoToGuests}/>
            </UnassignedDrawerTrigger>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {tables.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed hairline bg-surface/50 p-12 text-center">
                <div className="font-display text-lg mt-4">No tables yet</div>
                <Button onClick={onGoToTables}>Add tables</Button>
              </div>
            )}
            {tables.map(t => {
              const seated = assignments.filter(a => a.table_id === t.id);
              const conflicts = tableConflicts(t.id, assignments, constraints);
              return (
                <TableCard
                  key={t.id} table={t} seated={seated} guestById={guestById} tables={tables}
                  hasConflict={conflicts.length > 0}
                  onUnassign={handleUnassign} onTogglePin={handleTogglePin} onMoveTo={handleMoveTo} onSwapWith={handleSwap}
                />
              );
            })}
          </div>
        </div>
      )}
      <DragOverlay>
        {activeId ? <GuestPill guest={guestById.get(activeId)!} dragging overlay/> : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Mobile-only floating button + Vaul drawer that surfaces the unseated panel
 * (the entire panel is passed in as children so drag-source droppable wiring
 * is preserved). Hidden at lg+.
 */
function UnassignedDrawerTrigger({ count, children }: { count: number; children: React.ReactNode }) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="fixed bottom-5 left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-3 font-mono text-[12px] uppercase tracking-[0.12em] text-paper shadow-elegant lg:hidden"
        >
          <UsersIcon size={14} />
          Guests to seat
          <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-paper font-mono text-[10px] text-ink">
            {count}
          </span>
        </button>
      </DrawerTrigger>
      <DrawerContent className="bg-paper">
        <div className="max-h-[80vh] overflow-y-auto p-4 pb-10">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function UnassignedPanel({ guests, search, setSearch, totalGuests, onAddGuest }: { guests: Guest[]; search: string; setSearch: (s: string) => void; totalGuests: number; onAddGuest?: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: "__unassign__" });
  return (
    <div
      ref={setNodeRef}
      className={`paper-grain rounded-2xl border p-4 transition lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto ${isOver ? "border-terracotta ring-2 ring-terracotta/20" : "hairline"}`}
    >
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h3 className="m-0 font-display text-[20px] leading-none">
          Guests to <span className="font-display-italic">seat</span>
        </h3>
        <span className="font-mono text-[11px] tabular-nums text-ink-3">{guests.length}</span>
      </div>
      <div className="relative mb-3 border-b hairline">
        <Search className="absolute left-1 top-2 text-ink-3" size={13} />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search"
          className="h-8 rounded-none border-0 bg-transparent pl-6 text-sm focus-visible:ring-0"
        />
      </div>
      <div className="space-y-0.5">
        {guests.map(g => <GuestPill key={g.id} guest={g} />)}
        {guests.length === 0 && totalGuests === 0 && (
          <div className="py-6 text-center">
            <UserPlus className="mx-auto mb-2 text-ink-3" size={18} />
            <Button size="sm" variant="outline" className="rounded-full border-hairline" onClick={onAddGuest}>Add guests</Button>
          </div>
        )}
        {guests.length === 0 && totalGuests > 0 && (
          <div className="py-6 text-center font-display-italic text-[13px] text-ink-3">All seated.</div>
        )}
      </div>
    </div>
  );
}

function GuestPill({ guest, dragging, pinned, overlay }: { guest: Guest; dragging?: boolean; pinned?: boolean; overlay?: boolean }) {
  const dot = <span className="inline-block w-2 h-2 shrink-0 rounded-full" style={{ background: guestColor(guest) }} />;
  if (overlay) {
    return (
      <div
        className="group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm border border-hairline bg-paper shadow-elegant cursor-grabbing"
        style={{ transform: "rotate(-3deg)", willChange: "transform" }}
      >
        {dot}
        <div className="min-w-0 flex-1 truncate">
          <span className="font-medium">{guest.name}</span>
          {guest.party && <span className="ml-1.5 text-xs text-ink-3">{guest.party}</span>}
        </div>
        {guest.meal && <span className="size-1.5 rounded-full bg-terracotta" title={guest.meal} />}
        {pinned && <Pin size={11} className="text-olive" />}
      </div>
    );
  }
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: guest.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group flex cursor-grab items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm active:cursor-grabbing transition-colors
        ${isDragging ? "opacity-30" : ""}
        ${dragging
          ? "border border-hairline bg-paper shadow-elegant"
          : "hover:bg-paper-2/60"}`}
      style={{ touchAction: "none" }}
    >
      {dot}
      <div className="min-w-0 flex-1 truncate">
        <span className="font-medium">{guest.name}</span>
        {guest.party && <span className="ml-1.5 text-xs text-ink-3">{guest.party}</span>}
      </div>
      {guest.meal && <span className="size-1.5 rounded-full bg-terracotta" title={guest.meal} />}
      {pinned && <Pin size={11} className="text-olive" />}
    </div>
  );
}

function SeatRow({ table, seatIndex, assignment, guest, allTables, tableSeated, guestById, onUnassign, onTogglePin, onMoveTo, onSwapWith }: {
  table: TableDef; seatIndex: number; assignment?: Assignment; guest?: Guest;
  allTables: TableDef[]; tableSeated: Assignment[]; guestById: Map<string, Guest>;
  onUnassign: (a: Assignment) => void;
  onTogglePin: (a: Assignment) => void;
  onMoveTo: (a: Assignment, tableId: string) => void;
  onSwapWith: (a: Assignment, b: Assignment) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `seat:${table.id}:${seatIndex}` });
  const occupied = !!assignment && !!guest;
  return (
    <div ref={setNodeRef}
      className={`flex items-center gap-2 rounded-lg transition px-1 py-0.5
        ${isOver ? (occupied ? "bg-terracotta/10 ring-1 ring-terracotta/40" : "bg-olive/10 ring-1 ring-olive/30") : ""}`}>
      <span className="w-5 shrink-0 text-[10px] text-soft tabular-nums text-center">{seatIndex + 1}</span>
      <div className="flex-1 min-w-0">
        {occupied ? (
          <SeatMenu
            assignment={assignment!} guest={guest!} table={table}
            allTables={allTables} tableSeated={tableSeated} guestById={guestById}
            onUnassign={onUnassign} onTogglePin={onTogglePin} onMoveTo={onMoveTo} onSwapWith={onSwapWith}
          >
            <div><GuestPill guest={guest!} pinned={assignment!.pinned}/></div>
          </SeatMenu>
        ) : (
          <div className={`h-7 rounded-lg border border-dashed transition ${isOver ? "border-olive/60 bg-olive/5" : "hairline"}`}/>
        )}
      </div>
    </div>
  );
}

function TableCard({ table, seated, guestById, tables, hasConflict, onUnassign, onTogglePin, onMoveTo, onSwapWith }: {
  table: TableDef; seated: Assignment[]; guestById: Map<string, Guest>; tables: TableDef[]; hasConflict: boolean;
  onUnassign: (a: Assignment) => void;
  onTogglePin: (a: Assignment) => void;
  onMoveTo: (a: Assignment, tableId: string) => void;
  onSwapWith: (a: Assignment, b: Assignment) => void;
}) {
  const over = seated.length > table.capacity;
  const fillRatio = Math.min(1, seated.length / Math.max(1, table.capacity));
  const seatMap = new Map<number, Assignment>();
  seated.forEach(a => { if (a.seat_index != null) seatMap.set(a.seat_index, a); });
  const overflow = seated.filter(a => a.seat_index == null || a.seat_index >= table.capacity);
  return (
    <div
      className={`rounded-2xl border bg-card p-4 transition
        ${hasConflict ? "border-destructive/60" : over ? "border-warning/60" : "hairline"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-lg leading-tight">{table.name}</div>
        <CapacityRing seated={seated.length} capacity={table.capacity} ratio={fillRatio} over={over}/>
      </div>
      {hasConflict && <div className="text-xs text-destructive mb-2 flex items-center gap-1"><X size={12}/>Conflict at this table</div>}
      <div className="space-y-1">
        {Array.from({ length: table.capacity }).map((_, i) => {
          const a = seatMap.get(i);
          const g = a ? guestById.get(a.guest_id) : undefined;
          return (
            <SeatRow key={i} table={table} seatIndex={i} assignment={a} guest={g}
              allTables={tables} tableSeated={seated} guestById={guestById}
              onUnassign={onUnassign} onTogglePin={onTogglePin} onMoveTo={onMoveTo} onSwapWith={onSwapWith}/>
          );
        })}
        {overflow.length > 0 && (
          <div className="pt-2 mt-2 border-t hairline">
            <div className="text-[10px] uppercase tracking-wider text-soft mb-1">Unseated at this table</div>
            {overflow.map(a => {
              const g = guestById.get(a.guest_id); if (!g) return null;
              return <GuestPill key={a.id} guest={g} pinned={a.pinned}/>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CapacityRing({ seated, capacity, ratio, over }: { seated: number; capacity: number; ratio: number; over: boolean }) {
  const r = 13;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-9 w-9 shrink-0" title={`${seated} / ${capacity} seated`}>
      <svg viewBox="0 0 32 32" className="h-full w-full -rotate-90">
        <circle cx="16" cy="16" r={r} fill="none" stroke="hsl(var(--hairline))" strokeWidth="2" />
        <circle cx="16" cy="16" r={r} fill="none"
          stroke={over ? "hsl(var(--terracotta))" : "hsl(var(--olive))"}
          strokeWidth="2" strokeLinecap="round"
          strokeDasharray={`${c * ratio} ${c}`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] tabular-nums text-ink-3">{seated}/{capacity}</span>
    </div>
  );
}
