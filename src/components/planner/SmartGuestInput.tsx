import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Trash2, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import type { RSVP } from "@/lib/types";
import { analytics } from "@/lib/analytics";

type Side = "bride" | "groom";
type Meal = "vegetarian" | "vegan" | "pescatarian" | "non_vegetarian" | "halal" | "kosher" | "jain";

interface ParsedGuest {
  name: string;
  party?: string;
  side?: Side;
  rsvp?: RSVP;
  meal?: Meal;
  is_kid?: boolean;
  accessibility?: string;
  notes?: string;
}

interface Props {
  planId: string;
  onDone: () => void;
}

const PLACEHOLDER = `Paste a guest list, an RSVP email, or drop a spreadsheet via the Upload button.

Try things like:
• John & Sarah Smith +2 kids (vegetarian) — bride side
• Mom, Dad, Aunt May (wheelchair), Uncle Bob`;

// Per-chunk row cap. The AI does best with ~40 rows of tabular data per call;
// larger inputs get split client-side and parsed in batches, then merged.
const ROWS_PER_CHUNK = 40;

const MEAL_LABEL: Record<Meal, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  pescatarian: "Pescatarian",
  non_vegetarian: "Non-vegetarian",
  halal: "Halal",
  kosher: "Kosher",
  jain: "Jain",
};

/**
 * Split a large text input into ~ROWS_PER_CHUNK-line chunks, preserving the
 * header (first line) on every chunk so the AI keeps column context. Returns
 * a single-element array if the input is small.
 */
function chunkForParsing(text: string): string[] {
  const lines = text.split("\n").map(l => l.trimEnd()).filter(l => l.length > 0);
  if (lines.length <= ROWS_PER_CHUNK + 1) return [text];

  // Treat first line as header if it looks like one (contains a delimiter and
  // some field-like words). Otherwise just chunk straight.
  const first = lines[0];
  const hasDelimiter = /\t|,|;|\|/.test(first);
  const looksLikeHeader = hasDelimiter && /name|guest|side|rsvp|table|meal|diet|email/i.test(first);

  if (looksLikeHeader) {
    const header = lines[0];
    const data = lines.slice(1);
    const chunks: string[] = [];
    for (let i = 0; i < data.length; i += ROWS_PER_CHUNK) {
      chunks.push([header, ...data.slice(i, i + ROWS_PER_CHUNK)].join("\n"));
    }
    return chunks;
  }

  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += ROWS_PER_CHUNK) {
    chunks.push(lines.slice(i, i + ROWS_PER_CHUNK).join("\n"));
  }
  return chunks;
}

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
  const [progress, setProgress] = useState<string>("");
  const [parsed, setParsed] = useState<ParsedGuest[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File) => {
    try {
      const text = await readFileToText(file);
      setText(text);
      toast.success(`Loaded ${file.name} — ${text.split("\n").filter(l => l.trim()).length} rows`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read that file");
    }
  };

  const parse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setParsed(null);

    const chunks = chunkForParsing(text);
    const allGuests: ParsedGuest[] = [];
    let parseError: string | null = null;

    for (let i = 0; i < chunks.length; i++) {
      if (chunks.length > 1) setProgress(`Parsing batch ${i + 1} of ${chunks.length}…`);
      const { data, error } = await supabase.functions.invoke("ai-parse", {
        body: { mode: "guests", input: chunks[i] },
      });
      if (error) {
        let msg = error.message;
        try { const b = await (error as any).context?.json?.(); if (b?.error) msg = b.error; } catch { /* */ }
        parseError = msg;
        break;
      }
      if (data?.error) { parseError = data.error; break; }
      const guests: ParsedGuest[] = data?.guests ?? [];
      allGuests.push(...guests);
    }

    setProgress("");
    setLoading(false);

    if (parseError) {
      toast.error(parseError);
      return;
    }
    if (!allGuests.length) {
      toast.error("Couldn't find any guests in that text");
      return;
    }
    setParsed(allGuests);
    if (chunks.length > 1) {
      toast.success(`Parsed ${allGuests.length} guests across ${chunks.length} batches`);
    }
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
        <Button onClick={parse} disabled={loading || !text.trim()}>
          {loading ? <Loader2 className="mr-1.5 animate-spin" size={14}/> : <Sparkles className="mr-1.5" size={14}/>}
          {loading ? (progress || "Parsing…") : "Parse with AI"}
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
                    <select
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={g.meal ?? ""}
                      onChange={e => update(i, { meal: (e.target.value || undefined) as Meal | undefined })}
                    >
                      <option value="">—</option>
                      {(Object.keys(MEAL_LABEL) as Meal[]).map(m => <option key={m} value={m}>{MEAL_LABEL[m]}</option>)}
                    </select>
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
                  <Input className="col-span-3" placeholder="Name" value={g.name} onChange={e => update(i, { name: e.target.value })}/>
                  <Input className="col-span-3" placeholder="Party" value={g.party ?? ""} onChange={e => update(i, { party: e.target.value })}/>
                  <select
                    className="col-span-2 h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={g.meal ?? ""}
                    onChange={e => update(i, { meal: (e.target.value || undefined) as Meal | undefined })}
                  >
                    <option value="">Meal —</option>
                    {(Object.keys(MEAL_LABEL) as Meal[]).map(m => <option key={m} value={m}>{MEAL_LABEL[m]}</option>)}
                  </select>
                  <select
                    className="col-span-2 h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={g.side ?? ""}
                    onChange={e => update(i, { side: (e.target.value || undefined) as Side | undefined })}
                  >
                    <option value="">Side —</option>
                    <option value="bride">Bride</option>
                    <option value="groom">Groom</option>
                  </select>
                  <label className="col-span-1 text-xs text-muted-foreground flex items-center gap-1">
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
