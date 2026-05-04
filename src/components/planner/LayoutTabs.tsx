import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Scenario, TableDef, Assignment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Plus, Copy, Pencil, Trash2, Star, MoreHorizontal, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Props {
  planId: string;
  scenarios: Scenario[];
  scenarioId: string | null;
  setScenarioId: (id: string | null) => void;
  tables: TableDef[];
  assignments: Assignment[];
  refresh: () => void;
}

type Mode = { kind: "new" } | { kind: "duplicate"; from: Scenario } | { kind: "rename"; target: Scenario } | null;

/**
 * Browser-tab-style strip for switching between alternate room layouts.
 * Each tab is a real, visible scenario; "+ Try a Plan B" explicitly invites
 * the second layout when only one exists.
 */
export function LayoutTabs({ planId, scenarios, scenarioId, setScenarioId, tables, assignments, refresh }: Props) {
  const [mode, setMode] = useState<Mode>(null);
  const [name, setName] = useState("");

  const start = (m: Mode) => {
    if (!m) return;
    setMode(m);
    if (m.kind === "duplicate") setName(`${m.from.name} copy`);
    else if (m.kind === "rename") setName(m.target.name);
    else setName("");
  };

  const submit = async () => {
    if (!mode) return;
    const n = name.trim();
    if (!n) { toast.error("Give it a name"); return; }

    if (mode.kind === "rename") {
      await supabase.from("scenarios").update({ name: n }).eq("id", mode.target.id);
      toast.success("Renamed");
    } else if (mode.kind === "new") {
      const { data } = await supabase.from("scenarios").insert({ plan_id: planId, name: n, is_default: false }).select().single();
      if (data) setScenarioId(data.id);
      toast.success(`Started "${n}"`);
    } else if (mode.kind === "duplicate") {
      const { data: scn } = await supabase.from("scenarios").insert({ plan_id: planId, name: n, is_default: false }).select().single();
      if (scn) {
        const idMap = new Map<string, string>();
        if (tables.length) {
          const newTables = tables.map(t => ({
            plan_id: planId, scenario_id: scn.id,
            name: t.name, capacity: t.capacity, shape: t.shape, x: t.x, y: t.y, rotation: t.rotation,
          }));
          const { data: insertedTables } = await supabase.from("tables_def").insert(newTables).select();
          (insertedTables ?? []).forEach((nt, i) => idMap.set(tables[i].id, nt.id));
        }
        if (assignments.length) {
          const newAssigns = assignments
            .map(a => idMap.get(a.table_id) ? ({
              plan_id: planId, scenario_id: scn.id,
              guest_id: a.guest_id, table_id: idMap.get(a.table_id)!,
              pinned: a.pinned, seat_index: a.seat_index ?? null,
            }) : null)
            .filter((x): x is NonNullable<typeof x> => !!x);
          if (newAssigns.length) await supabase.from("assignments").insert(newAssigns);
        }
        setScenarioId(scn.id);
        toast.success(`Copied as "${n}"`);
      }
    }

    setMode(null);
    setName("");
    refresh();
  };

  const remove = async (s: Scenario) => {
    if (scenarios.length <= 1) { toast.error("This is your only layout — can't delete it"); return; }
    if (!confirm(`Delete "${s.name}"? Its tables and seating will be lost.`)) return;
    await supabase.from("scenarios").delete().eq("id", s.id);
    if (scenarioId === s.id) {
      const fallback = scenarios.find(x => x.id !== s.id);
      if (fallback) setScenarioId(fallback.id);
    }
    toast.success("Deleted");
    refresh();
  };

  const setDefault = async (s: Scenario) => {
    await supabase.from("scenarios").update({ is_default: false }).eq("plan_id", planId);
    await supabase.from("scenarios").update({ is_default: true }).eq("id", s.id);
    toast.success(`"${s.name}" is now your main layout`);
    refresh();
  };

  const dialogTitle = mode?.kind === "rename" ? "Rename layout"
                    : mode?.kind === "duplicate" ? "Copy this layout"
                    : "Start another layout";
  const dialogDesc = mode?.kind === "duplicate"
    ? "We'll copy your tables and seating so you can experiment without losing this one."
    : mode?.kind === "new"
      ? "Try a totally different room setup. Your guest list stays the same."
      : undefined;

  return (
    <>
      <div
        role="tablist"
        aria-label="Layouts"
        className="flex items-center gap-5 overflow-x-auto -mb-px scrollbar-thin border-b hairline"
      >
        {scenarios.map(s => {
          const active = s.id === scenarioId;
          return (
            <div
              key={s.id}
              role="tab"
              aria-selected={active}
              className={`group relative flex items-center gap-1 h-9 shrink-0 ${
                active ? "text-foreground" : "text-soft hover:text-foreground"
              }`}
            >
              <button
                onClick={() => setScenarioId(s.id)}
                className="flex items-center gap-1.5 text-sm font-medium pr-0.5 pt-1"
              >
                <span className="max-w-[200px] truncate">{s.name}</span>
                {s.is_default && <Star size={10} className="text-primary fill-primary"/>}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`rounded p-1 transition ${active ? "opacity-50 hover:opacity-100" : "opacity-0 group-hover:opacity-50 hover:opacity-100"}`}
                    aria-label={`Options for ${s.name}`}
                  >
                    <MoreHorizontal size={13}/>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 rounded-xl border-hairline">
                  <DropdownMenuItem onClick={() => start({ kind: "rename", target: s })}>
                    <Pencil size={14} className="mr-2"/>Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => start({ kind: "duplicate", from: s })}>
                    <Copy size={14} className="mr-2"/>Duplicate
                  </DropdownMenuItem>
                  {!s.is_default && (
                    <DropdownMenuItem onClick={() => setDefault(s)}>
                      <Star size={14} className="mr-2"/>Set as main
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator/>
                  <DropdownMenuItem
                    onClick={() => remove(s)}
                    disabled={scenarios.length <= 1}
                    className="text-destructive"
                  >
                    <Trash2 size={14} className="mr-2"/>Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary"/>}
            </div>
          );
        })}

        {scenarios.length === 1 ? (
          <button
            onClick={() => {
              const current = scenarios.find(s => s.id === scenarioId) ?? scenarios[0];
              start({ kind: "duplicate", from: current });
            }}
            className="flex items-center gap-1.5 h-9 px-2 text-primary/70 hover:text-primary text-sm font-medium shrink-0"
            title="Try an alternate layout — keeps your guest list"
          >
            <Sparkles size={13}/> Plan B
          </button>
        ) : (
          <button
            onClick={() => start({ kind: "new" })}
            className="flex items-center gap-1 h-9 px-1 text-soft hover:text-foreground text-sm shrink-0"
            title="New layout"
          >
            <Plus size={14}/>
          </button>
        )}
      </div>

      <Dialog open={!!mode} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            {dialogDesc && <DialogDescription>{dialogDesc}</DialogDescription>}
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Name this layout</Label>
            <Input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Plan B — long tables"
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
            <Button onClick={submit}>
              {mode?.kind === "rename" ? "Save" : mode?.kind === "duplicate" ? "Copy layout" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}