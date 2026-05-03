import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Heart, Ban } from "lucide-react";
import type { Guest, ConstraintDef, ConstraintKind } from "@/lib/types";

interface Props {
  planId: string;
  guests: Guest[];
  constraints: ConstraintDef[];
  refresh: () => void;
}

export function ConstraintsPanel({ planId, guests, constraints, refresh }: Props) {
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");
  const [kind, setKind] = useState<ConstraintKind>("with");
  const byId = new Map(guests.map(g => [g.id, g]));
  const add = async () => {
    if (!a || !b || a === b) return;
    await supabase.from("constraints_def").insert({ plan_id: planId, guest_a: a, guest_b: b, kind });
    setA(""); setB(""); refresh();
  };
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/60 p-3 bg-card">
        <div className="text-sm font-medium mb-2">Add constraint</div>
        <div className="grid sm:grid-cols-[1fr_auto_1fr_auto] gap-2 items-end">
          <Select value={a} onValueChange={setA}><SelectTrigger><SelectValue placeholder="Guest"/></SelectTrigger><SelectContent>{guests.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select>
          <Select value={kind} onValueChange={v => setKind(v as ConstraintKind)}><SelectTrigger className="w-32"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="with">must sit with</SelectItem><SelectItem value="not_with">must NOT sit with</SelectItem></SelectContent></Select>
          <Select value={b} onValueChange={setB}><SelectTrigger><SelectValue placeholder="Guest"/></SelectTrigger><SelectContent>{guests.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select>
          <Button onClick={add}><Plus size={14}/></Button>
        </div>
      </div>
      <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/40">
        {constraints.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">No constraints yet.</div>}
        {constraints.map(c => (
          <div key={c.id} className="flex items-center gap-2 p-3">
            {c.kind === "with" ? <Heart size={14} className="text-primary"/> : <Ban size={14} className="text-destructive"/>}
            <span className="text-sm"><b>{byId.get(c.guest_a)?.name ?? "—"}</b> {c.kind === "with" ? "with" : "not with"} <b>{byId.get(c.guest_b)?.name ?? "—"}</b></span>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={async () => { await supabase.from("constraints_def").delete().eq("id", c.id); refresh(); }}><Trash2 size={14}/></Button>
          </div>
        ))}
      </div>
    </div>
  );
}