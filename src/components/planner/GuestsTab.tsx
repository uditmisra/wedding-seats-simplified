import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, Download, Trash2, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import type { Guest, RSVP } from "@/lib/types";
import { downloadGuestTemplate } from "@/lib/template";

interface Props {
  planId: string;
  guests: Guest[];
  refresh: () => void;
  autoOpen?: "new" | "import" | null;
  onAutoOpenHandled?: () => void;
}

const RSVPS: RSVP[] = ["pending", "attending", "maybe", "declined"];
const FIELD_KEYS = ["name","party","rsvp","meal","side","is_kid","accessibility","notes","must_with","must_not_with"] as const;
type FieldKey = typeof FIELD_KEYS[number];
const FIELD_LABEL: Record<FieldKey, string> = {
  name: "Name *",
  party: "Party / group",
  rsvp: "RSVP",
  meal: "Meal",
  side: "Side",
  is_kid: "Is kid",
  accessibility: "Accessibility",
  notes: "Notes",
  must_with: "Must sit with",
  must_not_with: "Must NOT sit with",
};

export function GuestsTab({ planId, guests, refresh, autoOpen, onAutoOpenHandled }: Props) {
  const [editing, setEditing] = useState<Guest | "new" | null>(null);
  const [importRows, setImportRows] = useState<Record<string, unknown>[] | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, FieldKey | "">>({});
  const [search, setSearch] = useState("");
  const [filterRsvp, setFilterRsvp] = useState<string>("all");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoOpen === "new") { setEditing("new"); onAutoOpenHandled?.(); }
    else if (autoOpen === "import") { fileRef.current?.click(); onAutoOpenHandled?.(); }
  }, [autoOpen, onAutoOpenHandled]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return guests.filter(g =>
      (filterRsvp === "all" || g.rsvp === filterRsvp) &&
      (!q || g.name.toLowerCase().includes(q) || (g.party ?? "").toLowerCase().includes(q))
    );
  }, [guests, search, filterRsvp]);

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
    if (!rows.length) { toast.error("No rows found"); return; }
    const headers = Object.keys(rows[0]);
    setImportHeaders(headers);
    setImportRows(rows);
    // auto-guess
    const guess: Record<string, FieldKey | ""> = {};
    for (const h of headers) {
      const lo = h.toLowerCase().trim();
      if (/name|guest/.test(lo)) guess[h] = "name";
      else if (/party|group|family/.test(lo)) guess[h] = "party";
      else if (/rsvp|status|attend/.test(lo)) guess[h] = "rsvp";
      else if (/meal|food|dinner|dish/.test(lo)) guess[h] = "meal";
      else if (/side|team/.test(lo)) guess[h] = "side";
      else if (/kid|child/.test(lo)) guess[h] = "is_kid";
      else if (/access|wheel|disab/.test(lo)) guess[h] = "accessibility";
      else if (/note|comment/.test(lo)) guess[h] = "notes";
      else if (/(must.*not|conflict|avoid|enemy)/.test(lo)) guess[h] = "must_not_with";
      else if (/(must|with|together)/.test(lo)) guess[h] = "must_with";
      else guess[h] = "";
    }
    setMapping(guess);
  };

  const confirmImport = async () => {
    if (!importRows) return;
    const inverse: Partial<Record<FieldKey, string>> = {};
    for (const [h, f] of Object.entries(mapping)) if (f) inverse[f] = h;
    if (!inverse.name) { toast.error("Map a 'Name' column"); return; }

    const newGuests: Array<{ plan_id: string; name: string; party: string | null; rsvp: RSVP; meal: string | null; side: string | null; is_kid: boolean; accessibility: string | null; notes: string | null }> = [];
    const constraintsRaw: { aName: string; bName: string; kind: "with" | "not_with" }[] = [];
    for (const r of importRows) {
      const name = String(r[inverse.name!] ?? "").trim();
      if (!name) continue;
      const rsvpRaw = String(r[inverse.rsvp ?? ""] ?? "").toLowerCase().trim();
      const rsvp: RSVP = rsvpRaw.startsWith("att") || rsvpRaw === "yes" ? "attending"
        : rsvpRaw.startsWith("dec") || rsvpRaw === "no" ? "declined"
        : rsvpRaw.startsWith("may") ? "maybe" : "pending";
      const isKidRaw = String(r[inverse.is_kid ?? ""] ?? "").toLowerCase().trim();
      const is_kid = ["yes","true","1","kid","child"].includes(isKidRaw);
      newGuests.push({
        plan_id: planId,
        name,
        party: optional(r, inverse.party),
        rsvp,
        meal: optional(r, inverse.meal),
        side: optional(r, inverse.side),
        is_kid,
        accessibility: optional(r, inverse.accessibility),
        notes: optional(r, inverse.notes),
      });
      const mw = optional(r, inverse.must_with);
      const mnw = optional(r, inverse.must_not_with);
      if (mw) mw.split(",").forEach(n => { const t = n.trim(); if (t) constraintsRaw.push({ aName: name, bName: t, kind: "with" }); });
      if (mnw) mnw.split(",").forEach(n => { const t = n.trim(); if (t) constraintsRaw.push({ aName: name, bName: t, kind: "not_with" }); });
    }

    const { data: inserted, error } = await supabase.from("guests").insert(newGuests).select();
    if (error) { toast.error(error.message); return; }

    if (constraintsRaw.length && inserted) {
      const all = [...guests, ...(inserted as Guest[])];
      const byName = new Map(all.map(g => [g.name.toLowerCase(), g.id]));
      const cInserts = constraintsRaw
        .map(c => ({ plan_id: planId, guest_a: byName.get(c.aName.toLowerCase()), guest_b: byName.get(c.bName.toLowerCase()), kind: c.kind }))
        .filter(c => c.guest_a && c.guest_b && c.guest_a !== c.guest_b);
      if (cInserts.length) await supabase.from("constraints_def").insert(cInserts);
    }

    toast.success(`Imported ${inserted?.length ?? 0} guests`);
    setImportRows(null); setImportHeaders([]); setMapping({});
    refresh();
  };

  const downloadTemplate = downloadGuestTemplate;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16}/>
          <Input placeholder="Search guests…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9"/>
        </div>
        <Select value={filterRsvp} onValueChange={setFilterRsvp}>
          <SelectTrigger className="w-[160px]"><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All RSVPs</SelectItem>
            {RSVPS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}/>
        <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload size={16} className="mr-1.5"/>Import</Button>
        <Button variant="ghost" size="sm" onClick={downloadTemplate}><Download size={14} className="mr-1"/>Template</Button>
        <Button onClick={() => setEditing("new")}><Plus size={16} className="mr-1.5"/>Add guest</Button>
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3 hidden md:table-cell">Party</th>
              <th className="text-left p-3">RSVP</th>
              <th className="text-left p-3 hidden md:table-cell">Meal</th>
              <th className="text-left p-3 hidden lg:table-cell">Notes</th>
              <th className="p-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No guests yet — import a spreadsheet or add one.</td></tr>
            )}
            {filtered.map(g => (
              <tr key={g.id} className="border-t border-border/40 hover:bg-muted/30">
                <td className="p-3 font-medium">
                  {g.name}
                  {g.is_kid && <Badge variant="secondary" className="ml-2 text-[10px]">kid</Badge>}
                  {g.accessibility && <Badge variant="secondary" className="ml-2 text-[10px]">♿</Badge>}
                </td>
                <td className="p-3 hidden md:table-cell text-muted-foreground">{g.party}</td>
                <td className="p-3"><RsvpBadge rsvp={g.rsvp}/></td>
                <td className="p-3 hidden md:table-cell text-muted-foreground">{g.meal}</td>
                <td className="p-3 hidden lg:table-cell text-muted-foreground truncate max-w-xs">{g.notes}</td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(g)}><Pencil size={14}/></Button>
                  <Button variant="ghost" size="sm" onClick={async () => { await supabase.from("guests").delete().eq("id", g.id); refresh(); }}><Trash2 size={14}/></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <GuestEditor planId={planId} guest={editing === "new" ? null : editing} onClose={() => { setEditing(null); refresh(); }}/>}

      <Dialog open={!!importRows} onOpenChange={(o) => !o && setImportRows(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Map your spreadsheet columns</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tell us which of your columns matches each field. {importRows?.length} rows detected.</p>
          <div className="max-h-[50vh] overflow-y-auto space-y-2 mt-2">
            {importHeaders.map(h => (
              <div key={h} className="grid grid-cols-2 gap-3 items-center">
                <div className="text-sm font-medium truncate">{h}</div>
                <Select value={mapping[h] || "__skip"} onValueChange={(v) => setMapping(m => ({ ...m, [h]: v === "__skip" ? "" : v as FieldKey }))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__skip">— skip —</SelectItem>
                    {FIELD_KEYS.map(k => <SelectItem key={k} value={k}>{FIELD_LABEL[k]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportRows(null)}>Cancel</Button>
            <Button onClick={confirmImport}>Import {importRows?.length} guests</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function optional(r: Record<string, unknown>, key: string | undefined): string | null {
  if (!key) return null;
  const v = r[key];
  if (v === undefined || v === null || v === "") return null;
  return String(v).trim();
}

function RsvpBadge({ rsvp }: { rsvp: RSVP }) {
  const map: Record<RSVP, string> = {
    attending: "bg-sage/20 text-sage-foreground border-sage/30",
    declined: "bg-muted text-muted-foreground",
    pending: "bg-secondary text-secondary-foreground",
    maybe: "bg-warning/20 text-foreground",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${map[rsvp]}`}>{rsvp}</span>;
}

function GuestEditor({ planId, guest, onClose }: { planId: string; guest: Guest | null; onClose: () => void }) {
  const [form, setForm] = useState<Partial<Guest>>(guest ?? { rsvp: "pending", is_kid: false });
  const save = async () => {
    if (!form.name?.trim()) { toast.error("Name required"); return; }
    if (guest) {
      await supabase.from("guests").update({ ...form }).eq("id", guest.id);
    } else {
      await supabase.from("guests").insert({ ...form, plan_id: planId, name: form.name });
    }
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{guest ? "Edit guest" : "Add guest"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Name</Label><Input value={form.name ?? ""} onChange={e => setForm({ ...form, name: e.target.value })}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Party / group</Label><Input value={form.party ?? ""} onChange={e => setForm({ ...form, party: e.target.value })}/></div>
            <div><Label>Side</Label><Input value={form.side ?? ""} onChange={e => setForm({ ...form, side: e.target.value })}/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>RSVP</Label>
              <Select value={form.rsvp ?? "pending"} onValueChange={(v) => setForm({ ...form, rsvp: v as RSVP })}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{RSVPS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Meal</Label><Input value={form.meal ?? ""} onChange={e => setForm({ ...form, meal: e.target.value })}/></div>
          </div>
          <div><Label>Accessibility</Label><Input placeholder="wheelchair, hearing-aid…" value={form.accessibility ?? ""} onChange={e => setForm({ ...form, accessibility: e.target.value })}/></div>
          <div><Label>Notes</Label><Textarea rows={2} value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })}/></div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={!!form.is_kid} onCheckedChange={(v) => setForm({ ...form, is_kid: !!v })}/> Child / kid
          </label>
        </div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}