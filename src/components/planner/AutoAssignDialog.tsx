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
    try {
      localStorage.setItem(`plan:${planId}:autoAssignLast`, JSON.stringify({
        when: Date.now(),
        seated: rows.length + pinnedIds.size,
        total: eligible,
        conflicts: 0,
      }));
    } catch {}
    toast.success(`Seated ${rows.length} guests`);
    onClose();
  };

  const seatedNow = preview ? preview.size : 0;
  const eligible = guests.filter(g => g.rsvp === "attending" || (includeMaybe && g.rsvp === "maybe")).length;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles size={18} className="text-primary"/>Do a first pass for me</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Wedding Seater groups attending guests by family or party, keeps anyone you&apos;ve marked as &ldquo;not near&rdquo; apart, and never overflows a table. You&apos;ll preview before anything moves.</p>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={includeMaybe} onCheckedChange={v => setIncludeMaybe(!!v)}/>Save a seat for the maybes too</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={keepExisting} onCheckedChange={v => setKeepExisting(!!v)}/>Keep guests I&apos;ve already placed</label>
          <Button variant="outline" onClick={compute} className="w-full">Preview the seating</Button>
          {preview && (
            <div className="rounded-lg border border-border/60 p-3 text-sm">
              <div className="font-medium">Here&apos;s the draft</div>
              <div className="text-muted-foreground">Seats {seatedNow} of {eligible} attending guests, across {tables.length} tables.</div>
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