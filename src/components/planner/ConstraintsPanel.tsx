import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Trash2, Plus } from "lucide-react";
import type { Guest, ConstraintDef, ConstraintKind } from "@/lib/types";

interface Props {
  planId: string;
  guests: Guest[];
  constraints: ConstraintDef[];
  refresh: () => void;
}

const AVATAR_COLORS = [
  "hsl(var(--olive))",
  "hsl(var(--terracotta))",
  "hsl(var(--rose))",
  "hsl(var(--olive-2))",
  "hsl(var(--terracotta-2))",
];

function avatarFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? "").join("");
}

export function ConstraintsPanel({ planId, guests, constraints, refresh }: Props) {
  const [adding, setAdding] = useState<ConstraintKind | null>(null);
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const byId = useMemo(() => new Map(guests.map(g => [g.id, g])), [guests]);
  const guestNames = useMemo(() => guests.map(g => g.name).sort((x, y) => x.localeCompare(y)), [guests]);

  const withCons = constraints.filter(c => c.kind === "with");
  const apartCons = constraints.filter(c => c.kind === "not_with");

  const lastRunRaw = typeof window !== "undefined" ? localStorage.getItem(`plan:${planId}:autoAssignLast`) : null;
  const lastRun = lastRunRaw ? safeParse<{ when: number; seated: number; total: number; conflicts: number }>(lastRunRaw) : null;

  const startAdd = (kind: ConstraintKind) => { setAdding(kind); setA(""); setB(""); };
  const cancelAdd = () => { setAdding(null); setA(""); setB(""); };
  const save = async () => {
    if (!a || !b || a === b || !adding) return;
    const guestA = guests.find(g => g.name === a)?.id;
    const guestB = guests.find(g => g.name === b)?.id;
    if (!guestA || !guestB) return;
    await supabase.from("constraints_def").insert({ plan_id: planId, guest_a: guestA, guest_b: guestB, kind: adding });
    cancelAdd();
    refresh();
  };
  const remove = async (id: string) => {
    await supabase.from("constraints_def").delete().eq("id", id);
    refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-7">
        <div>
          <h2 className="m-0 font-display text-2xl md:text-[28px]">
            The <span className="font-display-italic">non-negotiables.</span>
          </h2>
          <p className="mt-1 text-[14px] text-ink-3">
            Tell Seatly who must sit together and who absolutely must not. Auto-assign respects every line.
          </p>
        </div>

        <Section
          title="Must sit"
          emphasis="together"
          accent="hsl(var(--olive))"
          empty="No must-sit pairs yet — useful for couples and tight groups."
          onAdd={() => startAdd("with")}
          adding={adding === "with"}
          guestNames={guestNames}
          a={a}
          b={b}
          onChangeA={setA}
          onChangeB={setB}
          onCancel={cancelAdd}
          onSave={save}
          connector="with"
        >
          {withCons.map(c => (
            <ConstraintRow
              key={c.id}
              a={byId.get(c.guest_a)?.name ?? "—"}
              b={byId.get(c.guest_b)?.name ?? "—"}
              connector="with"
              accent="hsl(var(--olive))"
              onRemove={() => remove(c.id)}
            />
          ))}
        </Section>

        <Section
          title="Keep"
          emphasis="apart"
          accent="hsl(var(--terracotta))"
          empty="No keep-apart rules yet — add the ex who shouldn’t be near the ex."
          onAdd={() => startAdd("not_with")}
          adding={adding === "not_with"}
          guestNames={guestNames}
          a={a}
          b={b}
          onChangeA={setA}
          onChangeB={setB}
          onCancel={cancelAdd}
          onSave={save}
          connector="not near"
        >
          {apartCons.map(c => (
            <ConstraintRow
              key={c.id}
              a={byId.get(c.guest_a)?.name ?? "—"}
              b={byId.get(c.guest_b)?.name ?? "—"}
              connector="not near"
              accent="hsl(var(--terracotta))"
              onRemove={() => remove(c.id)}
            />
          ))}
        </Section>
      </div>

      <aside className="lg:sticky lg:top-20">
        <div className="rounded-2xl border hairline bg-paper-2/40 p-5">
          <div className="label-mono mb-2">Auto-assign</div>
          <p className="m-0 mb-4 font-display-italic text-[14px] leading-snug text-ink-2">
            Take a first pass — Seatly groups by party, respects every rule above, and fills tables evenly.
          </p>
          <p className="m-0 mb-4 text-[12px] text-ink-3">
            You&apos;ll get a preview before anything moves. Pinned guests stay put.
          </p>
          <Button
            className="w-full rounded-full"
            onClick={() => {
              // Surfaces the existing AutoAssignDialog via the Planner header
              const btn = document.querySelector<HTMLButtonElement>("[data-auto-seat-trigger]");
              btn?.click();
            }}
          >
            Run auto-assign
          </Button>

          <div className="mt-5 border-t hairline pt-4">
            <div className="label-mono mb-2">Last run</div>
            {lastRun ? (
              <p className="m-0 font-display-italic text-[13px] leading-snug text-ink-2">
                Seated {lastRun.seated} of {lastRun.total} ·{" "}
                {lastRun.conflicts === 0
                  ? <span className="text-olive">no conflicts</span>
                  : <span className="text-terracotta">{lastRun.conflicts} to review</span>}
                <br />
                <span className="font-mono text-[11px] not-italic text-ink-3">
                  {new Date(lastRun.when).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              </p>
            ) : (
              <p className="m-0 font-display-italic text-[13px] text-ink-3">
                Auto-assign hasn&apos;t run yet on this device.
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Section({
  title,
  emphasis,
  accent,
  empty,
  onAdd,
  adding,
  guestNames,
  a,
  b,
  onChangeA,
  onChangeB,
  onCancel,
  onSave,
  connector,
  children,
}: {
  title: string;
  emphasis: string;
  accent: string;
  empty: string;
  onAdd: () => void;
  adding: boolean;
  guestNames: string[];
  a: string;
  b: string;
  onChangeA: (v: string) => void;
  onChangeB: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
  connector: string;
  children: React.ReactNode;
}) {
  const childArr = Array.isArray(children) ? children : [children];
  const empty_ = childArr.length === 0 || (Array.isArray(children) && children.length === 0);
  return (
    <div className="rounded-2xl border hairline bg-paper">
      <div className="flex items-center justify-between gap-3 border-b hairline px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="size-2 rounded-full" style={{ background: accent }} aria-hidden />
          <h3 className="m-0 font-display text-[20px] leading-tight">
            {title} <span className="font-display-italic">{emphasis}</span>
          </h3>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1 rounded-full border-hairline border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3 hover:bg-paper-2 hover:text-ink"
          >
            <Plus size={11} /> Add rule
          </button>
        )}
      </div>
      <div className="divide-y divide-hairline-2 px-5">
        {adding && (
          <div className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-[1fr_auto_1fr_auto]">
            <Combobox value={a} onChange={onChangeA} suggestions={guestNames} placeholder="A guest" />
            <span className="hidden self-center font-display-italic text-[13px] text-ink-3 sm:inline">{connector}</span>
            <Combobox value={b} onChange={onChangeB} suggestions={guestNames} placeholder="Another guest" />
            <div className="flex gap-2 self-end">
              <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
              <Button size="sm" className="rounded-full" onClick={onSave} disabled={!a || !b || a === b}>Save</Button>
            </div>
          </div>
        )}
        {!adding && empty_ ? (
          <p className="m-0 py-6 text-center font-display-italic text-[13px] text-ink-3">{empty}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function ConstraintRow({
  a,
  b,
  connector,
  accent,
  onRemove,
}: {
  a: string;
  b: string;
  connector: string;
  accent: string;
  onRemove: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 py-3">
      <Avatar name={a} />
      <span className="truncate text-[14px] font-medium">{a}</span>
      <span className="font-display-italic text-[14px]" style={{ color: accent }}>{connector}</span>
      <Avatar name={b} />
      <span className="flex-1 truncate text-[14px] font-medium">{b}</span>
      <button
        aria-label="Remove rule"
        onClick={onRemove}
        className="inline-flex size-7 items-center justify-center rounded-full text-ink-3 opacity-0 transition group-hover:opacity-100 hover:bg-terracotta/10 hover:text-terracotta"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-medium text-paper"
      style={{ background: avatarFor(name) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

function safeParse<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}
