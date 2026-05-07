import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { RSVP } from "@/lib/types";
import { analytics } from "@/lib/analytics";

interface ParsedGuest {
  name: string;
  party?: string;
  side?: string;
  rsvp?: RSVP;
  meal?: string;
  is_kid?: boolean;
  accessibility?: string;
  notes?: string;
}

interface Props {
  planId: string;
  onDone: () => void;
}

const PLACEHOLDER = `Try things like:
• John & Sarah Smith +2 kids (vegetarian) — bride side
• Mom, Dad, Aunt May (wheelchair), Uncle Bob
• Paste an RSVP email or a list from your wedding website…`;

export function SmartGuestInput({ planId, onDone }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedGuest[] | null>(null);

  const parse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-parse", { body: { mode: "guests", input: text } });
    setLoading(false);
    if (error) {
      let msg = error.message;
      try { const b = await (error as any).context?.json?.(); if (b?.error) msg = b.error; } catch { /* */ }
      toast.error(msg);
      return;
    }
    if (data?.error) { toast.error(data.error); return; }
    const guests: ParsedGuest[] = data?.guests ?? [];
    if (!guests.length) { toast.error("Couldn't find any guests in that text"); return; }
    setParsed(guests);
  };

  const addAll = async () => {
    if (!parsed) return;
    const rows = parsed
      .filter(g => g.name?.trim())
      .map(g => ({
        plan_id: planId,
        name: g.name.trim(),
        party: g.party ?? null,
        side: g.side ?? null,
        rsvp: (g.rsvp ?? "pending") as RSVP,
        meal: g.meal ?? null,
        is_kid: !!g.is_kid,
        accessibility: g.accessibility ?? null,
        notes: g.notes ?? null,
      }));
    if (!rows.length) return;
    const { error } = await supabase.from("guests").insert(rows);
    if (error) { toast.error(error.message); return; }
    analytics.guestsAdded({ count: rows.length, method: "ai" });
    toast.success(`Added ${rows.length} guests`);
    setText(""); setParsed(null); onDone();
  };

  const update = (i: number, patch: Partial<ParsedGuest>) => {
    setParsed(p => p ? p.map((g, idx) => idx === i ? { ...g, ...patch } : g) : p);
  };
  const remove = (i: number) => setParsed(p => p ? p.filter((_, idx) => idx !== i) : p);
  const addBlank = () => setParsed(p => [...(p ?? []), { name: "" }]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary" size={18}/>
        <h3 className="font-display text-lg">Add guests with AI</h3>
      </div>
      <p className="text-sm text-muted-foreground">Paste or type anything — names, an RSVP email, a list. We'll structure it for you.</p>
      <Textarea
        rows={5}
        placeholder={PLACEHOLDER}
        value={text}
        onChange={e => setText(e.target.value)}
        className="font-sans"
      />
      <div className="flex justify-end">
        <Button onClick={parse} disabled={loading || !text.trim()}>
          {loading ? <Loader2 className="mr-1.5 animate-spin" size={14}/> : <Sparkles className="mr-1.5" size={14}/>}
          Parse with AI
        </Button>
      </div>

      {parsed && (
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Found {parsed.length} guests — review and edit, then add.</div>
            <Button variant="ghost" size="sm" onClick={addBlank}><Plus size={14} className="mr-1"/>Row</Button>
          </div>
          <div className="max-h-[40vh] overflow-y-auto space-y-1">
            {parsed.map((g, i) => (
              <div key={i}>
                {/* Mobile stacked card */}
                <div className="flex flex-col gap-1.5 rounded-lg border border-border/40 p-2.5 sm:hidden">
                  <Input placeholder="Name" value={g.name} onChange={e => update(i, { name: e.target.value })}/>
                  <div className="flex gap-1.5">
                    <Input className="flex-1" placeholder="Party" value={g.party ?? ""} onChange={e => update(i, { party: e.target.value })}/>
                    <Input className="w-20" placeholder="Meal" value={g.meal ?? ""} onChange={e => update(i, { meal: e.target.value })}/>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <input type="checkbox" checked={!!g.is_kid} onChange={e => update(i, { is_kid: e.target.checked })}/> kid
                    </label>
                    <Button variant="ghost" size="sm" onClick={() => remove(i)}><Trash2 size={14}/></Button>
                  </div>
                </div>
                {/* Desktop grid row */}
                <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-4" placeholder="Name" value={g.name} onChange={e => update(i, { name: e.target.value })}/>
                  <Input className="col-span-3" placeholder="Party" value={g.party ?? ""} onChange={e => update(i, { party: e.target.value })}/>
                  <Input className="col-span-2" placeholder="Meal" value={g.meal ?? ""} onChange={e => update(i, { meal: e.target.value })}/>
                  <label className="col-span-2 text-xs text-muted-foreground flex items-center gap-1">
                    <input type="checkbox" checked={!!g.is_kid} onChange={e => update(i, { is_kid: e.target.checked })}/> kid
                  </label>
                  <Button variant="ghost" size="sm" className="col-span-1" onClick={() => remove(i)}><Trash2 size={14}/></Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setParsed(null)}>Cancel</Button>
            <Button onClick={addAll}>Add {parsed.length} guests</Button>
          </div>
        </div>
      )}
    </div>
  );
}