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
import { Plus, Upload, Download, Trash2, Pencil, Search, ChevronDown, SlidersHorizontal } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { toast } from "sonner";
import type { Guest, RSVP } from "@/lib/types";
import { downloadGuestTemplate } from "@/lib/template";
import { SmartGuestInput } from "./SmartGuestInput";
import { Combobox } from "@/components/ui/combobox";
import { useBelowLg } from "@/hooks/use-mobile";

interface Props {
  planId: string;
  guests: Guest[];
  refresh: () => void;
  autoOpen?: "new" | "import" | null;
  onAutoOpenHandled?: () => void;
}

const RSVPS: RSVP[] = ["pending", "attending", "maybe", "declined"];
const FIELD_KEYS = ["name", "party", "rsvp", "meal", "side", "is_kid", "accessibility", "notes", "must_with", "must_not_with"] as const;
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

const RSVP_DISPLAY: Record<RSVP, { dot: string; label: string; pillBg: string; pillFg: string }> = {
  attending: {
    dot: "hsl(var(--olive))",
    label: "coming",
    pillBg: "hsl(var(--olive) / 0.12)",
    pillFg: "hsl(var(--olive))",
  },
  maybe: {
    dot: "hsl(var(--butter))",
    label: "maybe",
    pillBg: "hsl(var(--butter) / 0.4)",
    pillFg: "hsl(var(--ink-2))",
  },
  declined: {
    dot: "hsl(var(--ink-4))",
    label: "no",
    pillBg: "hsl(var(--ink) / 0.05)",
    pillFg: "hsl(var(--ink-3))",
  },
  pending: {
    dot: "hsl(var(--rose))",
    label: "no reply",
    pillBg: "hsl(var(--rose) / 0.12)",
    pillFg: "hsl(var(--rose))",
  },
};

const AVATAR_COLORS = [
  "hsl(var(--olive))",
  "hsl(var(--terracotta))",
  "hsl(var(--rose))",
  "hsl(var(--olive-2))",
  "hsl(var(--terracotta-2))",
];

function avatarFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() ?? "").join("");
}

export function GuestsTab({ planId, guests, refresh, autoOpen, onAutoOpenHandled }: Props) {
  const [editing, setEditing] = useState<Guest | "new" | null>(null);
  const [importRows, setImportRows] = useState<Record<string, unknown>[] | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, FieldKey | "">>({});
  const [search, setSearch] = useState("");
  const [filterRsvp, setFilterRsvp] = useState<RSVP | "all">("all");
  const [filterParty, setFilterParty] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [autoMapping, setAutoMapping] = useState(false);
  const isBelowLg = useBelowLg();

  useEffect(() => {
    if (autoOpen === "new") { setEditing("new"); onAutoOpenHandled?.(); }
    else if (autoOpen === "import") { fileRef.current?.click(); onAutoOpenHandled?.(); }
  }, [autoOpen, onAutoOpenHandled]);

  // Counts for filter sidebar
  const rsvpCounts = useMemo(() => {
    const counts: Record<RSVP, number> = { attending: 0, declined: 0, pending: 0, maybe: 0 };
    for (const g of guests) counts[g.rsvp]++;
    return counts;
  }, [guests]);

  const partyCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of guests) {
      const p = g.party?.trim();
      if (!p) continue;
      map.set(p, (map.get(p) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [guests]);

  const dietaryTags = useMemo(() => {
    const tags = new Map<string, number>();
    for (const g of guests) {
      const meal = g.meal?.trim();
      if (meal) tags.set(meal, (tags.get(meal) ?? 0) + 1);
      if (g.is_kid) tags.set("Kids", (tags.get("Kids") ?? 0) + 1);
      if (g.accessibility) tags.set("Accessibility", (tags.get("Accessibility") ?? 0) + 1);
    }
    return [...tags.entries()];
  }, [guests]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return guests.filter(g =>
      (filterRsvp === "all" || g.rsvp === filterRsvp) &&
      (!filterParty || g.party === filterParty) &&
      (!q || g.name.toLowerCase().includes(q) || (g.party ?? "").toLowerCase().includes(q))
    );
  }, [guests, search, filterRsvp, filterParty]);

  const selected = useMemo(
    () => guests.find(g => g.id === selectedId) ?? null,
    [guests, selectedId]
  );

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
    if (!rows.length) { toast.error("No rows found"); return; }
    const headers = Object.keys(rows[0]);
    setImportHeaders(headers);
    setImportRows(rows);
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
    setAutoMapping(true);
    try {
      const samples = rows.slice(0, 3);
      const { data } = await supabase.functions.invoke("ai-parse", { body: { mode: "mapping", input: { headers, samples } } });
      const aiMap = data?.mapping as Record<string, string | null> | undefined;
      if (aiMap) {
        const merged: Record<string, FieldKey | ""> = { ...guess };
        for (const h of headers) {
          const v = aiMap[h];
          if (v && (FIELD_KEYS as readonly string[]).includes(v)) merged[h] = v as FieldKey;
        }
        setMapping(merged);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAutoMapping(false);
    }
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
      const is_kid = ["yes", "true", "1", "kid", "child"].includes(isKidRaw);
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

  const facetContent = (
    <div className="space-y-7 text-sm">
      <div>
        <div className="label-mono mb-3">RSVP</div>
        <div className="space-y-1.5">
          <FilterRow
            active={filterRsvp === "all"}
            onClick={() => setFilterRsvp("all")}
            label="Everyone"
            count={guests.length}
          />
          {(Object.keys(rsvpCounts) as RSVP[]).map(r => (
            <FilterRow
              key={r}
              active={filterRsvp === r}
              onClick={() => setFilterRsvp(filterRsvp === r ? "all" : r)}
              label={RSVP_DISPLAY[r].label}
              count={rsvpCounts[r]}
              dot={RSVP_DISPLAY[r].dot}
            />
          ))}
        </div>
      </div>

      {partyCounts.length > 0 && (
        <div>
          <div className="label-mono mb-3">Party</div>
          <div className="space-y-1">
            <FilterRow
              active={filterParty === null}
              onClick={() => setFilterParty(null)}
              label="All groups"
            />
            {partyCounts.slice(0, 10).map(([p, n]) => (
              <FilterRow
                key={p}
                active={filterParty === p}
                onClick={() => setFilterParty(filterParty === p ? null : p)}
                label={p}
                count={n}
              />
            ))}
          </div>
        </div>
      )}

      {dietaryTags.length > 0 && (
        <div>
          <div className="label-mono mb-3">Dietary</div>
          <div className="flex flex-wrap gap-1.5">
            {dietaryTags.map(([t, n]) => (
              <span key={t} className="rounded-full border hairline px-2.5 py-1 font-mono text-[11px] text-ink-3">
                {t} <span className="text-ink-4">{n}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const filtersActive = (filterRsvp !== "all" ? 1 : 0) + (filterParty ? 1 : 0);

  return (
    <div className="space-y-5">
      <SmartGuestInput planId={planId} onDone={refresh} />

      <div className="overflow-hidden rounded-2xl border hairline bg-paper">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_300px]">
          {/* LEFT — facet filters (desktop) */}
          <aside className="hidden border-b hairline p-5 lg:block lg:border-b-0 lg:border-r">
            {facetContent}
          </aside>

          {/* CENTER — list */}
          <div className="flex flex-col overflow-hidden p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="m-0 font-display text-2xl md:text-[28px]">
                The <span className="font-display-italic">guest list</span>
              </h2>
              <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-2.5 text-ink-3" size={14} />
                  <Input
                    placeholder="Search guests…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-9 rounded-full border-hairline bg-transparent pl-9 text-[13px]"
                  />
                </div>
                {/* Mobile: filters drawer */}
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0 rounded-full border-hairline lg:hidden"
                    >
                      <SlidersHorizontal size={14} className="mr-1.5" />
                      Filters
                      {filtersActive > 0 && (
                        <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-terracotta font-mono text-[9px] text-paper">
                          {filtersActive}
                        </span>
                      )}
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="bg-paper">
                    <div className="max-h-[70vh] overflow-y-auto p-5">
                      {facetContent}
                    </div>
                  </DrawerContent>
                </Drawer>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden h-9 rounded-full border-hairline sm:inline-flex"
                  onClick={() => fileRef.current?.click()}
                  title="Import CSV or Excel"
                >
                  <Upload size={14} className="mr-1.5" />Import
                </Button>
                <Button size="sm" className="h-9 rounded-full" onClick={() => setEditing("new")}>
                  <Plus size={14} className="mr-1.5" />Add guests
                </Button>
              </div>
            </div>

            <div className="mt-4 overflow-auto">
              <div className="grid grid-cols-[1.2fr_1.4fr_90px_60px_70px] gap-2 border-b hairline px-3 py-2">
                <span className="label-mono">Name</span>
                <span className="label-mono">Party</span>
                <span className="label-mono">RSVP</span>
                <span className="label-mono">Diet</span>
                <span className="label-mono">Edit</span>
              </div>
              {filtered.length === 0 ? (
                <div className="p-12 text-center text-sm text-ink-3">
                  {guests.length === 0 ? (
                    <>
                      <p className="font-display-italic">No guests yet.</p>
                      <p className="mt-2">Import a spreadsheet, or add the first one.</p>
                      <button
                        type="button"
                        onClick={downloadGuestTemplate}
                        className="mt-3 inline-flex items-center gap-1 text-xs text-terracotta hover:underline"
                      >
                        <Download size={12} /> Download our template
                      </button>
                    </>
                  ) : (
                    <p className="font-display-italic">Nothing matches those filters.</p>
                  )}
                </div>
              ) : (
                filtered.map(g => {
                  const rsvp = RSVP_DISPLAY[g.rsvp];
                  const isSelected = selectedId === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setSelectedId(g.id)}
                      className={`grid w-full grid-cols-[1.2fr_1.4fr_90px_60px_70px] items-center gap-2 border-b border-hairline-2 px-3 py-3 text-left text-[14px] transition hover:bg-paper-2/60 ${isSelected ? "bg-terracotta/5" : ""}`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5 truncate">
                        <span
                          className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-medium text-paper"
                          style={{ background: avatarFor(g.name) }}
                          aria-hidden
                        >
                          {initials(g.name)}
                        </span>
                        <span className="truncate">{g.name}</span>
                        {g.is_kid && <span className="font-mono text-[9px] uppercase tracking-wider text-ink-3">kid</span>}
                        {g.accessibility && <span className="text-[10px] text-ink-3">♿</span>}
                      </span>
                      <span className="truncate text-[13px] text-ink-2">{g.party ?? "—"}</span>
                      <span>
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px]"
                          style={{ background: rsvp.pillBg, color: rsvp.pillFg }}
                        >
                          {rsvp.label}
                        </span>
                      </span>
                      <span className="font-mono text-[11px] text-ink-3">{g.meal || "—"}</span>
                      <span className="flex items-center gap-1">
                        <span
                          role="button"
                          aria-label="Edit"
                          onClick={e => { e.stopPropagation(); setEditing(g); }}
                          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-ink-3 hover:bg-paper-2 hover:text-ink"
                        >
                          <Pencil size={12} />
                        </span>
                        <span
                          role="button"
                          aria-label="Delete"
                          onClick={async e => {
                            e.stopPropagation();
                            await supabase.from("guests").delete().eq("id", g.id);
                            if (selectedId === g.id) setSelectedId(null);
                            refresh();
                          }}
                          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-ink-3 hover:bg-terracotta/10 hover:text-terracotta"
                        >
                          <Trash2 size={12} />
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT — selected guest detail (desktop) */}
          <aside className="hidden bg-paper-2/40 p-6 lg:block lg:border-l">
            {selected ? (
              <SelectedGuestPanel guest={selected} onEdit={() => setEditing(selected)} />
            ) : (
              <div className="text-sm text-ink-3">
                <div className="label-mono mb-3">Selected</div>
                <p className="font-display-italic text-ink-2">
                  Pick a name on the left to see the details.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Mobile drawer — selected guest detail */}
      {isBelowLg && (
        <Drawer
          open={!!selected}
          onOpenChange={open => { if (!open) setSelectedId(null); }}
        >
          <DrawerContent className="bg-paper">
            <div className="max-h-[80vh] overflow-y-auto p-6 pb-10">
              {selected && <SelectedGuestPanel guest={selected} onEdit={() => setEditing(selected)} />}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {editing && (
        <GuestEditor
          planId={planId}
          guests={guests}
          guest={editing === "new" ? null : editing}
          onClose={() => { setEditing(null); refresh(); }}
        />
      )}

      <Dialog open={!!importRows} onOpenChange={o => !o && setImportRows(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{autoMapping ? "AI is mapping your columns…" : "Confirm column mapping"}</DialogTitle></DialogHeader>
          <p className="text-sm text-ink-3">
            {autoMapping ? "Hang tight — auto-detecting which column means what." : `We've matched your columns automatically. Tweak below if anything is off. ${importRows?.length} rows detected.`}
          </p>
          <div className="mt-2 max-h-[50vh] space-y-2 overflow-y-auto">
            {importHeaders.map(h => (
              <div key={h} className="grid grid-cols-2 items-center gap-3">
                <div className="truncate text-sm font-medium">{h}</div>
                <Select value={mapping[h] || "__skip"} onValueChange={v => setMapping(m => ({ ...m, [h]: v === "__skip" ? "" : v as FieldKey }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Button onClick={confirmImport} disabled={autoMapping}>Import {importRows?.length} guests</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SelectedGuestPanel({ guest, onEdit }: { guest: Guest; onEdit: () => void }) {
  const rsvp = RSVP_DISPLAY[guest.rsvp];
  return (
    <div className="text-sm">
      <div className="label-mono mb-3">Selected · 1 guest</div>
      <div className="font-display text-[26px] leading-[1.1]">{guest.name}</div>
      {guest.party && (
        <div className="mb-5 text-[13px] text-ink-3">{guest.party}{guest.side ? ` · ${guest.side}` : ""}</div>
      )}

      <dl className="space-y-3">
        <Row k="RSVP" v={<span style={{ color: rsvp.pillFg }}>{rsvp.label}</span>} />
        {guest.meal && <Row k="Meal" v={guest.meal} mono />}
        {guest.is_kid && <Row k="Type" v="Child" />}
        {guest.accessibility && <Row k="Access" v={guest.accessibility} />}
        {guest.notes && <Row k="Notes" v={<span className="font-display-italic">{guest.notes}</span>} />}
      </dl>

      <div className="mt-6 flex gap-2 border-t hairline pt-5">
        <Button size="sm" variant="outline" className="h-8 rounded-full border-hairline text-[12px]" onClick={onEdit}>
          <Pencil size={12} className="mr-1.5" />Edit
        </Button>
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12px] text-ink-3">{k}</span>
      <span className={`text-right ${mono ? "font-mono text-[12px]" : ""}`}>{v}</span>
    </div>
  );
}

function FilterRow({
  active,
  onClick,
  label,
  count,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  dot?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[13px] transition ${active ? "bg-paper-2 text-ink" : "text-ink-2 hover:bg-paper-2/60"}`}
    >
      <span className="flex items-center gap-2">
        {dot && <span className="size-2 rounded-full" style={{ background: dot }} />}
        <span className="capitalize">{label}</span>
      </span>
      {count !== undefined && (
        <span className="font-mono text-[11px] text-ink-3 tabular-nums">{count}</span>
      )}
    </button>
  );
}

function optional(r: Record<string, unknown>, key: string | undefined): string | null {
  if (!key) return null;
  const v = r[key];
  if (v === undefined || v === null || v === "") return null;
  return String(v).trim();
}

function GuestEditor({ planId, guests, guest, onClose }: { planId: string; guests: Guest[]; guest: Guest | null; onClose: () => void }) {
  const [form, setForm] = useState<Partial<Guest>>(guest ?? { rsvp: "pending", is_kid: false });
  const [showMore, setShowMore] = useState(!!guest);
  const partySuggestions = useMemo(() => guests.map(g => g.party ?? "").filter(Boolean) as string[], [guests]);
  const mealSuggestions = useMemo(() => guests.map(g => g.meal ?? "").filter(Boolean) as string[], [guests]);
  const sideSuggestions = useMemo(() => guests.map(g => g.side ?? "").filter(Boolean) as string[], [guests]);
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
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{guest ? "Edit guest" : "Add guest"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Name</Label><Input autoFocus value={form.name ?? ""} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          {!showMore ? (
            <button type="button" onClick={() => setShowMore(true)} className="flex items-center gap-1 self-start text-sm text-terracotta hover:underline">
              <ChevronDown size={14} /> Add details (optional)
            </button>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Party / group</Label>
                  <Combobox value={form.party ?? ""} onChange={v => setForm({ ...form, party: v })} suggestions={partySuggestions} placeholder="e.g. Doe family" />
                </div>
                <div>
                  <Label>Side</Label>
                  <Combobox value={form.side ?? ""} onChange={v => setForm({ ...form, side: v })} suggestions={sideSuggestions} placeholder="e.g. Bride" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>RSVP</Label>
                  <Select value={form.rsvp ?? "pending"} onValueChange={v => setForm({ ...form, rsvp: v as RSVP })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{RSVPS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Meal</Label>
                  <Combobox value={form.meal ?? ""} onChange={v => setForm({ ...form, meal: v })} suggestions={mealSuggestions} placeholder="e.g. Vegetarian" />
                </div>
              </div>
              <div><Label>Accessibility</Label><Input placeholder="wheelchair, hearing-aid…" value={form.accessibility ?? ""} onChange={e => setForm({ ...form, accessibility: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea rows={2} value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={!!form.is_kid} onCheckedChange={v => setForm({ ...form, is_kid: !!v })} /> Child / kid
              </label>
            </>
          )}
        </div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
