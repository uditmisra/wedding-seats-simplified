import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Sparkles, Loader2, Trash2, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import type { RSVP } from "@/lib/types";
import { analytics } from "@/lib/analytics";
import { invokeAIChunked } from "@/lib/aiParse";
import { AIProgress } from "@/components/AIProgress";

type Side = "bride" | "groom";
type DietaryMeal = "vegetarian" | "vegan" | "pescatarian" | "non_vegetarian" | "halal" | "kosher" | "jain";

interface ParsedGuest {
  name: string;
  party?: string;
  side?: Side;
  rsvp?: RSVP;
  meal?: string;
  is_kid?: boolean;
  accessibility?: string;
  notes?: string;
  extra?: Record<string, string>;
}

interface Props {
  planId: string;
  onDone: () => void;
}

const PLACEHOLDER = `Paste a guest list, an RSVP email, or drop a spreadsheet via the Upload button.

Try things like:
• John & Sarah Smith +2 kids (vegetarian) — bride side
• Mom, Dad, Aunt May (wheelchair), Uncle Bob`;

const DIETARY_LABEL: Record<DietaryMeal, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  pescatarian: "Pescatarian",
  non_vegetarian: "Non-vegetarian",
  halal: "Halal",
  kosher: "Kosher",
  jain: "Jain",
};
const DIETARY_KEYS = Object.keys(DIETARY_LABEL) as DietaryMeal[];

const displayMeal = (m: string | undefined): string => {
  if (!m) return "";
  return DIETARY_LABEL[m as DietaryMeal] ?? m;
};

/** Read a file as TSV text. Excel files get converted via xlsx; everything else is read as plain text. */
async function readFileToText(file: File): Promise<string> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_csv(ws, { FS: "\t" });
  }
  return file.text();
}

export function SmartGuestInput({ planId, onDone }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [batch, setBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [parsed, setParsed] = useState<ParsedGuest[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Dropdown suggestions are sourced from values the AI extracted across
  // the current batch so the same party/meal gets reused instead of
  // hand-typed five different ways. Combobox still lets you add a new one.
  const partySuggestions = useMemo(
    () => (parsed ?? []).map(g => (g.party ?? "").trim()).filter(Boolean),
    [parsed],
  );
  const mealSuggestions = useMemo(() => {
    const detected = (parsed ?? []).map(g => displayMeal(g.meal)).filter(Boolean);
    // Dietary labels are always available even if no one in the batch is
    // tagged with one yet — they're the most-common buckets.
    return [...detected, ...DIETARY_KEYS.map(k => DIETARY_LABEL[k])];
  }, [parsed]);

  const onFile = async (file: File) => {
    try {
      const text = await readFileToText(file);
      setText(text);
      toast.success(`Loaded ${file.name} — ${text.split("\n").filter(l => l.trim()).length} rows`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read that file");
    }
  };

  const runAI = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setParsed(null);
    setBatch(0);
    setTotalBatches(0);

    const result = await invokeAIChunked<ParsedGuest>({
      mode: "guests",
      text,
      collect: data => (data as { guests?: ParsedGuest[] } | null)?.guests ?? [],
      onProgress: (b, total) => { setBatch(b); setTotalBatches(total); },
    });

    setLoading(false);
    setBatch(0);
    setTotalBatches(0);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (!result.items.length) {
      toast.error("Couldn't find any guests in that text");
      return;
    }
    setParsed(result.items);
    toast.success(`Found ${result.items.length} guests`);
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
        metadata: g.extra && Object.keys(g.extra).length ? g.extra : null,
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
      <p className="text-sm text-muted-foreground">Paste names, an RSVP email, or upload a CSV / Excel file. We'll structure it for you.</p>
      <Textarea
        rows={6}
        placeholder={PLACEHOLDER}
        value={text}
        onChange={e => setText(e.target.value)}
        className="font-sans"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt,.xlsx,.xls"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
          />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={loading}>
            <Upload size={14} className="mr-1.5" /> Upload file
          </Button>
          <span className="text-[11px] text-ink-3">CSV, TSV, Excel</span>
        </div>
        <Button onClick={runAI} disabled={loading || !text.trim()}>
          {loading ? <Loader2 className="mr-1.5 animate-spin" size={14}/> : <Sparkles className="mr-1.5" size={14}/>}
          {loading ? "Reading…" : "Read with AI"}
        </Button>
      </div>
      {loading && (
        <AIProgress mode="guests" batch={batch || undefined} totalBatches={totalBatches || undefined} />
      )}

      {parsed && (
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Found {parsed.length} guests — review and edit, then add.</div>
            <Button variant="ghost" size="sm" onClick={addBlank}><Plus size={14} className="mr-1"/>Row</Button>
          </div>
          <div className="max-h-[40vh] overflow-y-auto space-y-1">
            {parsed.map((g, i) => {
              const extraCount = g.extra ? Object.keys(g.extra).length : 0;
              return (
              <div key={i}>
                {/* Stacked card — used up to md: so review rows never clip on tablet-width modals */}
                <div className="flex flex-col gap-1.5 rounded-lg border border-border/40 p-2.5 md:hidden">
                  <Input placeholder="Name" value={g.name} onChange={e => update(i, { name: e.target.value })}/>
                  <div className="flex gap-1.5">
                    <Combobox
                      className="flex-1"
                      placeholder="Group"
                      value={g.party ?? ""}
                      suggestions={partySuggestions}
                      onChange={v => update(i, { party: v || undefined })}
                    />
                    <Combobox
                      className="w-32"
                      placeholder="Meal"
                      value={displayMeal(g.meal)}
                      suggestions={mealSuggestions}
                      onChange={v => update(i, { meal: v || undefined })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <AgeToggle isKid={!!g.is_kid} onChange={v => update(i, { is_kid: v })} />
                    <Button variant="ghost" size="sm" onClick={() => remove(i)}><Trash2 size={14}/></Button>
                  </div>
                  {extraCount > 0 && (
                    <div className="text-[11px] text-ink-3 font-mono uppercase tracking-[0.12em]">+{extraCount} more {extraCount === 1 ? "field" : "fields"} kept</div>
                  )}
                </div>
                {/* Desktop grid row — needs ~768px to fit five columns comfortably.
                    Side stays in state and is persisted, but we don't show it inline. */}
                <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-3" placeholder="Name" value={g.name} onChange={e => update(i, { name: e.target.value })}/>
                  <div className="col-span-3">
                    <Combobox
                      placeholder="Group"
                      value={g.party ?? ""}
                      suggestions={partySuggestions}
                      onChange={v => update(i, { party: v || undefined })}
                    />
                  </div>
                  <div className="col-span-3">
                    <Combobox
                      placeholder="Meal"
                      value={displayMeal(g.meal)}
                      suggestions={mealSuggestions}
                      onChange={v => update(i, { meal: v || undefined })}
                    />
                  </div>
                  <div className="col-span-2">
                    <AgeToggle isKid={!!g.is_kid} onChange={v => update(i, { is_kid: v })} />
                  </div>
                  <Button variant="ghost" size="sm" className="col-span-1" onClick={() => remove(i)}><Trash2 size={14}/></Button>
                  {extraCount > 0 && (
                    <div className="col-span-12 -mt-1 pl-1 text-[11px] text-ink-3 font-mono uppercase tracking-[0.12em]">
                      +{extraCount} more {extraCount === 1 ? "field" : "fields"} kept ({Object.keys(g.extra!).slice(0, 3).join(", ")}{extraCount > 3 ? "…" : ""})
                    </div>
                  )}
                </div>
              </div>
              );
            })}
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

function AgeToggle({ isKid, onChange }: { isKid: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Adult or child"
      className="inline-flex h-9 w-full rounded-md border border-input bg-paper-2/40 p-0.5 text-[12px]"
    >
      <button
        type="button"
        role="radio"
        aria-checked={!isKid}
        onClick={() => onChange(false)}
        className={`flex-1 rounded-[5px] transition ${!isKid ? "bg-paper text-ink shadow-sm" : "text-ink-3 hover:text-ink"}`}
      >
        Adult
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={isKid}
        onClick={() => onChange(true)}
        className={`flex-1 rounded-[5px] transition ${isKid ? "bg-paper text-ink shadow-sm" : "text-ink-3 hover:text-ink"}`}
      >
        Child
      </button>
    </div>
  );
}
