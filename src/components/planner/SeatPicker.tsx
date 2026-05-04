import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { useBelowLg } from "@/hooks/use-mobile";
import { Search, X, AlertTriangle, Sparkles } from "lucide-react";
import type { Assignment, ConstraintDef, Guest, TableDef } from "@/lib/types";
import { rankCandidates, type RankedGuest } from "@/lib/seatRecommend";

interface Props {
  children: ReactNode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  table: TableDef;
  seatIndex: number;
  tableSeated: Assignment[];
  unassigned: Guest[];
  guestById: Map<string, Guest>;
  constraints: ConstraintDef[];
  onPick: (guestId: string) => void;
}

type Side = "all" | "bride" | "groom";
type Group = "all" | "adults" | "kids";
type Diet = "v" | "gf" | "a";

export function SeatPicker(props: Props) {
  const isBelowLg = useBelowLg();
  if (isBelowLg) {
    return (
      <Drawer open={props.open} onOpenChange={props.onOpenChange}>
        <DrawerTrigger asChild>{props.children}</DrawerTrigger>
        <DrawerContent className="px-3 pb-4">
          <div className="mx-auto w-full max-w-md pt-2">
            <PickerBody {...props} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Popover open={props.open} onOpenChange={props.onOpenChange}>
      <PopoverTrigger asChild>{props.children}</PopoverTrigger>
      <PopoverContent
        side="right"
        align="center"
        sideOffset={10}
        className="w-[320px] p-0 border-hairline bg-paper shadow-elegant rounded-2xl overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <PickerBody {...props} />
      </PopoverContent>
    </Popover>
  );
}

function PickerBody({
  table, seatIndex, tableSeated, unassigned, guestById, constraints, onOpenChange, onPick,
}: Props) {
  const [q, setQ] = useState("");
  const [side, setSide] = useState<Side>("all");
  const [group, setGroup] = useState<Group>("all");
  const [diets, setDiets] = useState<Set<Diet>>(new Set());
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, []);

  const ranked = useMemo(
    () => rankCandidates(table, tableSeated, unassigned, guestById, constraints),
    [table, tableSeated, unassigned, guestById, constraints],
  );

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return ranked.filter(({ guest: g }) => {
      if (ql) {
        const hay = `${g.name} ${g.party ?? ""} ${g.notes ?? ""}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      if (side !== "all" && (g.side ?? "").toLowerCase() !== side) return false;
      if (group === "adults" && g.is_kid) return false;
      if (group === "kids" && !g.is_kid) return false;
      if (diets.size) {
        const meal = (g.meal ?? "").toUpperCase();
        const want: string[] = [];
        if (diets.has("v")) want.push("V");
        if (diets.has("gf")) want.push("GF");
        if (diets.has("a") && !g.accessibility) return false;
        if (want.length && !want.some(w => meal.includes(w))) return false;
      }
      return true;
    });
  }, [ranked, q, side, group, diets]);

  // Top recommendations are positively-scored items (max 4).
  const recommended = filtered.filter(r => r.score > 0).slice(0, 4);
  const recommendedIds = new Set(recommended.map(r => r.guest.id));
  const rest = filtered.filter(r => !recommendedIds.has(r.guest.id));
  const flat = [...recommended, ...rest];

  useEffect(() => { setActive(0); }, [q, side, group, diets]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => Math.min(flat.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => Math.max(0, i - 1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const pick = flat[active];
      if (pick) onPick(pick.guest.id);
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  const toggleDiet = (d: Diet) => {
    setDiets(prev => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d); else next.add(d);
      return next;
    });
  };

  return (
    <div className="flex flex-col" onKeyDown={onKeyDown}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2 border-b hairline">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            Seat {seatIndex + 1}
          </div>
          <div className="font-display text-[15px] leading-tight text-ink mt-0.5">
            {table.name}
          </div>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="rounded-full p-1 text-ink-3 hover:text-ink hover:bg-paper-2 transition"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search guests…"
            className="w-full h-8 rounded-full border hairline bg-paper-2/40 pl-7 pr-3 text-[13px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink/60 focus:bg-paper"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 pb-3 flex flex-wrap gap-1">
        <Chip active={side === "all"} onClick={() => setSide("all")}>All</Chip>
        <Chip active={side === "bride"} onClick={() => setSide(side === "bride" ? "all" : "bride")}>Bride</Chip>
        <Chip active={side === "groom"} onClick={() => setSide(side === "groom" ? "all" : "groom")}>Groom</Chip>
        <span className="w-px self-stretch bg-hairline mx-1" />
        <Chip active={group === "kids"} onClick={() => setGroup(group === "kids" ? "all" : "kids")}>Kids</Chip>
        <Chip active={diets.has("v")} onClick={() => toggleDiet("v")}>V</Chip>
        <Chip active={diets.has("gf")} onClick={() => toggleDiet("gf")}>GF</Chip>
        <Chip active={diets.has("a")} onClick={() => toggleDiet("a")}>♿</Chip>
      </div>

      {/* List */}
      <div className="max-h-[320px] overflow-y-auto border-t hairline">
        {flat.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="font-display-italic text-[14px] text-ink-3">
              {unassigned.length === 0 ? "Everyone's seated." : "No matches."}
            </div>
          </div>
        ) : (
          <>
            {recommended.length > 0 && (
              <SectionLabel>
                <Sparkles size={10} className="inline -mt-px mr-1 text-terracotta" />
                Recommended
              </SectionLabel>
            )}
            {recommended.map((r, i) => (
              <Row key={r.guest.id} r={r} active={active === i} onClick={() => onPick(r.guest.id)} onHover={() => setActive(i)} />
            ))}
            {rest.length > 0 && (
              <SectionLabel>
                {recommended.length > 0 ? `All unassigned (${rest.length})` : `Unassigned (${rest.length})`}
              </SectionLabel>
            )}
            {rest.map((r, i) => {
              const idx = recommended.length + i;
              return <Row key={r.guest.id} r={r} active={active === idx} onClick={() => onPick(r.guest.id)} onHover={() => setActive(idx)} />;
            })}
          </>
        )}
      </div>

      <div className="px-4 py-2 border-t hairline font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3 flex items-center justify-between">
        <span>↑↓ navigate · ⏎ seat</span>
        <span>{filtered.length} of {unassigned.length}</span>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-6 px-2 rounded-full font-mono text-[10px] uppercase tracking-[0.1em] border transition ${
        active
          ? "bg-ink text-paper border-ink"
          : "bg-paper-2/40 text-ink-3 border-hairline hover:text-ink hover:border-ink/40"
      }`}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 pt-2.5 pb-1 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3 bg-paper-2/30">
      {children}
    </div>
  );
}

function Row({ r, active, onClick, onHover }: { r: RankedGuest; active: boolean; onClick: () => void; onHover: () => void }) {
  const dim = r.conflicts.length > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      className={`w-full text-left px-4 py-2 flex items-start gap-2.5 border-b hairline last:border-b-0 transition ${
        active ? "bg-paper-2" : "hover:bg-paper-2/50"
      } ${dim ? "opacity-70" : ""}`}
    >
      <span className={`mt-1.5 inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
        r.score > 0 ? "bg-terracotta" : "bg-ink-4"
      }`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-[14px] text-ink truncate">{r.guest.name}</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3 shrink-0">
            {r.guest.party ?? "—"}
          </span>
        </div>
        {r.reasons.length > 0 && (
          <div className="font-mono text-[10px] text-ink-3 mt-0.5 truncate">
            ↳ {r.reasons[0]}
          </div>
        )}
        {r.conflicts.length > 0 && (
          <div className="flex items-center gap-1 mt-0.5 font-mono text-[10px] text-rose">
            <AlertTriangle size={10} />
            <span className="truncate">Can't sit with {r.conflicts.join(", ")}</span>
          </div>
        )}
        {r.guest.meal && (
          <span className="inline-block mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3 border-hairline border rounded px-1">
            {r.guest.meal}
          </span>
        )}
      </div>
    </button>
  );
}
