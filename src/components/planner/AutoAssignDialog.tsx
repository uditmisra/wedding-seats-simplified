import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { autoAssign } from "@/lib/seating";
import { supabase } from "@/integrations/supabase/client";
import type { Guest, TableDef, Assignment, ConstraintDef } from "@/lib/types";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

interface Props {
  planId: string;
  scenarioId: string;
  guests: Guest[];
  tables: TableDef[];
  assignments: Assignment[];
  constraints: ConstraintDef[];
  onClose: () => void;
}

export function AutoAssignDialog({ planId, scenarioId, guests, tables, assignments, constraints, onClose }: Props) {
  const [includeMaybe, setIncludeMaybe] = useState(false);
  const [keepExisting, setKeepExisting] = useState(true);
  const [preview, setPreview] = useState<Map<string, string> | null>(null);
  const [loading, setLoading] = useState(false);

  const compute = () => {
    const result = autoAssign(guests, tables, assignments, constraints, { includeMaybe, respectPinned: keepExisting });
    if (keepExisting) {
      // also preserve any non-pinned existing assignments
      for (const a of assignments) if (!result.has(a.guest_id)) result.set(a.guest_id, a.table_id);
    }
    setPreview(result);
  };

  const apply = async () => {
    if (!preview) return;
    setLoading(true);
    // Wipe non-pinned (or all) and re-insert
    if (keepExisting) {
      await supabase.from("assignments").delete().eq("scenario_id", scenarioId).eq("pinned", false);
    } else {
      await supabase.from("assignments").delete().eq("scenario_id", scenarioId);
    }
    const pinnedIds = new Set(assignments.filter(a => a.pinned).map(a => a.guest_id));
    const rows = [...preview.entries()]
      .filter(([gid]) => !pinnedIds.has(gid))
      .map(([guest_id, table_id]) => ({ plan_id: planId, scenario_id: scenarioId, guest_id, table_id }));
    if (rows.length) await supabase.from("assignments").insert(rows);
    setLoading(false);
    toast.success(`Seated ${rows.length} guests`);
    onClose();
  };

  const seatedNow = preview ? preview.size : 0;
  const eligible = guests.filter(g => g.rsvp === "attending" || (includeMaybe && g.rsvp === "maybe")).length;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles size={18} className="text-primary"/>Seat them for me</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">We'll seat your attending guests together by group, respect any "sit with / not with" rules you've set, and keep tables within their seat count.</p>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={includeMaybe} onCheckedChange={v => setIncludeMaybe(!!v)}/>Save a seat for "maybe" guests too</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={keepExisting} onCheckedChange={v => setKeepExisting(!!v)}/>Keep the seats I've already arranged</label>
          <Button variant="outline" onClick={compute} className="w-full">Show me a preview</Button>
          {preview && (
            <div className="rounded-lg border border-border/60 p-3 text-sm">
              <div className="font-medium">Here's how it would look</div>
              <div className="text-muted-foreground">Seats {seatedNow} of {eligible} guests coming, across {tables.length} tables.</div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!preview || loading} onClick={apply}>Looks good — seat them</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}