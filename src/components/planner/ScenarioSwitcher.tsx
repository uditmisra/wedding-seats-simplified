import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Scenario, TableDef, Assignment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Layers, Plus, Copy, Pencil, Trash2, Check, ChevronDown, Star } from "lucide-react";
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

export function ScenarioSwitcher({ planId, scenarios, scenarioId, setScenarioId, tables, assignments, refresh }: Props) {
  const current = scenarios.find(s => s.id === scenarioId);
  const [creating, setCreating] = useState<"new" | "duplicate" | "rename" | null>(null);
  const [name, setName] = useState("");

  const startCreate = (mode: "new" | "duplicate") => { setName(mode === "duplicate" && current ? `${current.name} copy` : ""); setCreating(mode); };
  const startRename = () => { setName(current?.name ?? ""); setCreating("rename"); };

  const submit = async () => {
    const n = name.trim();
    if (!n) { toast.error("Name required"); return; }

    if (creating === "rename" && current) {
      await supabase.from("scenarios").update({ name: n }).eq("id", current.id);
      toast.success("Renamed");
    } else if (creating === "new") {
      const { data } = await supabase.from("scenarios").insert({ plan_id: planId, name: n, is_default: false }).select().single();
      if (data) setScenarioId(data.id);
      toast.success(`Created "${n}"`);
    } else if (creating === "duplicate" && current) {
      const { data: scn } = await supabase.from("scenarios").insert({ plan_id: planId, name: n, is_default: false }).select().single();
      if (scn) {
        // Clone tables (new ids) and remap assignments
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
        toast.success(`Duplicated as "${n}"`);
      }
    }

    setCreating(null); setName(""); refresh();
  };

  const remove = async (s: Scenario) => {
    if (scenarios.length <= 1) { toast.error("Can't delete the last scenario"); return; }
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
    toast.success(`"${s.name}" is now the default`);
    refresh();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Layers size={14}/>
            <span className="max-w-[140px] truncate">{current?.name ?? "Scenario"}</span>
            {current?.is_default && <Star size={11} className="text-primary fill-primary"/>}
            <ChevronDown size={14}/>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs">Scenarios</DropdownMenuLabel>
          {scenarios.map(s => (
            <DropdownMenuItem key={s.id} onClick={() => setScenarioId(s.id)} className="flex items-center gap-2">
              {s.id === scenarioId ? <Check size={14}/> : <span className="w-3.5"/>}
              <span className="flex-1 truncate">{s.name}</span>
              {s.is_default && <Star size={11} className="text-primary fill-primary"/>}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator/>
          <DropdownMenuItem onClick={() => startCreate("new")}><Plus size={14} className="mr-1.5"/>New scenario</DropdownMenuItem>
          <DropdownMenuItem disabled={!current} onClick={() => startCreate("duplicate")}><Copy size={14} className="mr-1.5"/>Duplicate current</DropdownMenuItem>
          <DropdownMenuItem disabled={!current} onClick={startRename}><Pencil size={14} className="mr-1.5"/>Rename</DropdownMenuItem>
          {current && !current.is_default && (
            <DropdownMenuItem onClick={() => setDefault(current)}><Star size={14} className="mr-1.5"/>Set as default</DropdownMenuItem>
          )}
          {current && (
            <DropdownMenuItem onClick={() => remove(current)} className="text-destructive"><Trash2 size={14} className="mr-1.5"/>Delete</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!creating} onOpenChange={(o) => !o && setCreating(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creating === "rename" ? "Rename scenario" : creating === "duplicate" ? "Duplicate scenario" : "New scenario"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Plan B — long tables"/>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(null)}>Cancel</Button>
            <Button onClick={submit}>
              {creating === "rename" ? "Save" : creating === "duplicate" ? "Duplicate" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}