import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Shape } from "@/lib/types";

interface ParsedTable { name: string; shape: Shape; capacity: number }

interface Props {
  planId: string;
  scenarioId: string;
  existingCount: number;
  onDone: () => void;
}

const PLACEHOLDER = `Try things like:
• 10 round tables of 8, plus a head table for 6
• Two long tables of 12, four squares of 4
• Sweetheart table + 12 rounds seating 10`;

export function SmartTableInput({ planId, scenarioId, existingCount, onDone }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedTable[] | null>(null);

  const parse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-parse", { body: { mode: "tables", input: text } });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (data?.error) { toast.error(data.error); return; }
    const tables: ParsedTable[] = data?.tables ?? [];
    if (!tables.length) { toast.error("Couldn't find any tables in that text"); return; }
    setParsed(tables);
  };

  const create = async () => {
    if (!parsed) return;
    const rows = parsed.filter(t => t.name?.trim()).map((t, i) => ({
      plan_id: planId,
      scenario_id: scenarioId,
      name: t.name.trim(),
      shape: t.shape,
      capacity: t.capacity,
      x: ((existingCount + i) % 5) * 180,
      y: Math.floor((existingCount + i) / 5) * 180,
    }));
    if (!rows.length) return;
    const { error } = await supabase.from("tables_def").insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`Created ${rows.length} tables`);
    setText(""); setParsed(null); onDone();
  };

  const update = (i: number, patch: Partial<ParsedTable>) => {
    setParsed(p => p ? p.map((t, idx) => idx === i ? { ...t, ...patch } : t) : p);
  };
  const remove = (i: number) => setParsed(p => p ? p.filter((_, idx) => idx !== i) : p);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary" size={18}/>
        <h3 className="font-display text-lg">Describe your tables</h3>
      </div>
      <p className="text-sm text-muted-foreground">Tell us about your room — we'll create the tables for you.</p>
      <Textarea rows={4} placeholder={PLACEHOLDER} value={text} onChange={e => setText(e.target.value)}/>
      <div className="flex justify-end">
        <Button onClick={parse} disabled={loading || !text.trim()}>
          {loading ? <Loader2 className="mr-1.5 animate-spin" size={14}/> : <Sparkles className="mr-1.5" size={14}/>}
          Parse with AI
        </Button>
      </div>

      {parsed && (
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="text-sm text-muted-foreground">{parsed.length} tables — tweak any details, then create.</div>
          <div className="max-h-[40vh] overflow-y-auto space-y-1">
            {parsed.map((t, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-5" value={t.name} onChange={e => update(i, { name: e.target.value })}/>
                <select className="col-span-3 h-9 rounded-md border border-input bg-background px-2 text-sm capitalize"
                        value={t.shape} onChange={e => update(i, { shape: e.target.value as Shape })}>
                  {(["round","rectangle","square","long","head"] as Shape[]).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <Input className="col-span-3" type="number" min={1} max={30} value={t.capacity}
                       onChange={e => update(i, { capacity: parseInt(e.target.value) || 1 })}/>
                <Button variant="ghost" size="sm" className="col-span-1" onClick={() => remove(i)}><Trash2 size={14}/></Button>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setParsed(null)}>Cancel</Button>
            <Button onClick={create}>Create {parsed.length} tables</Button>
          </div>
        </div>
      )}
    </div>
  );
}