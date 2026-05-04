import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { generatePlanCode } from "@/lib/planCode";
import { toast } from "sonner";
import { ArrowUpRight, X, Loader2 } from "lucide-react";
import { getRecentPlans, removeRecentPlan, type RecentPlan } from "@/lib/recentPlans";
import { PaperTable } from "@/components/PaperTable";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/UserMenu";
import { loadOrCreateSamplePlan } from "@/lib/samplePlan";

interface OwnedPlan { id: string; code: string; name: string }

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [name, setName] = useState("");
  const [openCode, setOpenCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<RecentPlan[]>([]);
  const [showCodeOpen, setShowCodeOpen] = useState(false);
  const [myPlans, setMyPlans] = useState<OwnedPlan[]>([]);
  const [sampleLoading, setSampleLoading] = useState(false);

  useEffect(() => { setRecents(getRecentPlans()); }, []);

  const openSample = async () => {
    setSampleLoading(true);
    try {
      const code = await loadOrCreateSamplePlan();
      navigate(`/plan/${code}`);
    } catch (e) {
      toast.error((e as Error)?.message ?? "Could not load the sample plan");
    } finally {
      setSampleLoading(false);
    }
  };

  // Pre-fill name if returning from auth with ?name=…
  useEffect(() => {
    const presetName = params.get("name");
    if (presetName) setName(presetName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Continue plan creation after auth-roundtrip (?create=1)
  useEffect(() => {
    if (user && params.get("create") === "1") {
      const presetName = params.get("name") ?? "";
      const next = new URLSearchParams(params); next.delete("create"); next.delete("name");
      setParams(next, { replace: true });
      setName(presetName);
      setTimeout(() => createPlan(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Owned plans (plan_owners table)
  useEffect(() => {
    if (!user) { setMyPlans([]); return; }
    (async () => {
      const { data } = await supabase
        .from("plan_owners")
        .select("plan_id, plans:plan_id(id, code, name)")
        .eq("user_id", user.id);
      const list = ((data ?? []) as Array<{ plans: OwnedPlan | null }>)
        .map(r => r.plans)
        .filter((p): p is OwnedPlan => !!p);
      setMyPlans(list);
    })();
  }, [user]);

  const createPlan = async () => {
    if (!user) {
      navigate(`/auth?next=${encodeURIComponent("/?create=1&name=" + encodeURIComponent(name))}`);
      return;
    }
    setLoading(true);
    const code = generatePlanCode();
    const { data, error } = await supabase
      .from("plans").insert({ code, name: name.trim() || "Our Wedding" })
      .select().single();
    if (error || !data) { setLoading(false); toast.error("Could not create plan"); return; }
    const { error: ownErr } = await supabase
      .from("plan_owners")
      .insert({ plan_id: data.id, user_id: user.id, role: "owner" });
    setLoading(false);
    if (ownErr) toast.error("Plan created but ownership failed");
    navigate(`/plan/${data.code}`);
  };

  const openPlan = async () => {
    const c = openCode.trim().toLowerCase();
    if (!c) return;
    const { data } = await supabase.from("plans").select("code").eq("code", c).maybeSingle();
    if (!data) { toast.error("No plan found with that code"); return; }
    navigate(`/plan/${data.code}`);
  };

  // Show "Recently opened on this device" plans we don't already own
  const ownedCodes = new Set(myPlans.map(p => p.code));
  const orphanRecents = recents.filter(r => !ownedCodes.has(r.code));

  return (
    <div className="paper-grain min-h-screen">
      {/* Top nav */}
      <header className="container flex items-center justify-between py-7">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[22px] tracking-tight">Seatly</span>
          <span className="inline-block size-[5px] -translate-y-0.5 rounded-full bg-terracotta" aria-hidden />
        </div>
        <nav className="hidden items-center gap-9 text-sm text-ink-2 md:flex">
          <a className="hover:text-ink" href="#promise">How it works</a>
          <button
            onClick={openSample}
            disabled={sampleLoading}
            className="inline-flex items-center gap-1 hover:text-ink disabled:opacity-60"
          >
            {sampleLoading && <Loader2 size={12} className="animate-spin" />}
            See an example
          </button>
          <button
            onClick={() => setShowCodeOpen(true)}
            className="rounded-full border hairline px-4 py-2 text-[13px] hover:bg-paper-2"
          >
            Open a plan
          </button>
          <UserMenu />
        </nav>
        <div className="md:hidden"><UserMenu /></div>
      </header>

      <main className="container pb-24">
        {/* Hero */}
        <section className="grid items-center gap-12 pt-10 md:grid-cols-[1.1fr_1fr] md:gap-16 md:pt-20">
          <div>
            <div className="label-mono mb-7">A wedding seating planner</div>
            <h1 className="m-0 font-display text-[56px] leading-[0.98] tracking-[-0.03em] sm:text-7xl xl:text-[92px]">
              Your seating chart,<br />
              <span className="font-display-italic">without</span> the spreadsheet.
            </h1>
            <p className="mt-7 max-w-md text-base leading-relaxed text-ink-2 md:text-[19px] md:leading-[1.55]">
              Drag guests onto tables. Keep your divorced parents apart. Share one link
              with whoever&apos;s helping. You&apos;ll be done in an afternoon — not a weekend.
            </p>

            {/* CTA card */}
            <div className="mt-10 max-w-lg rounded-2xl border hairline bg-card/80 p-5 shadow-soft">
              <Label htmlFor="name" className="label-mono">Name your plan</Label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Alex & Jordan's wedding"
                  className="h-12 rounded-full border-hairline bg-transparent px-4 text-[15px]"
                />
                <Button
                  onClick={createPlan}
                  disabled={loading}
                  className="h-12 rounded-full px-6 text-[15px] shadow-soft"
                >
                  Start your seating chart
                  <span className="ml-1 font-display-italic">→</span>
                </Button>
              </div>
              <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-ink-3">
                <span className="font-mono">·</span> Free. Save it once — pick it up on your phone in bed.
              </p>
            </div>

            <div className="mt-4 max-w-lg">
              {showCodeOpen ? (
                <div className="rounded-xl border hairline bg-card p-3">
                  <Label className="label-mono">Paste the plan code</Label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={openCode}
                      onChange={e => setOpenCode(e.target.value)}
                      placeholder="luna-meadow-4821"
                      autoFocus
                      className="h-9 rounded-full border-hairline bg-transparent"
                    />
                    <Button variant="secondary" onClick={openPlan} className="h-9 rounded-full">Open</Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCodeOpen(true)}
                  className="text-sm text-ink-3 underline-offset-4 hover:text-ink hover:underline"
                >
                  Helping someone with theirs?
                </button>
              )}
            </div>
          </div>

          {/* Hero vignette — paper floor plan */}
          <div className="relative md:h-[540px]">
            <FloorPlanVignette />
            <div className="absolute -bottom-3 left-6 rounded-full border hairline bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
              Plan · Draft · 142 Guests · 17 Tables
            </div>
          </div>
        </section>

        {/* The promise — three columns */}
        <section id="promise" className="mt-32 border-t hairline pt-14">
          <div className="grid gap-12 md:grid-cols-3 md:gap-14">
            {[
              { n: "01", t: "Drag, don't spreadsheet.", d: "No more Excel. No more sticky notes on the dining-room table. A real canvas — tables, chairs, a dance floor — where you move guests like place cards." },
              { n: "02", t: "The awkward pairings, sorted.", d: "Tell us who can't sit near whom — divorced parents, the cousins who don't speak. Auto-assign respects every line." },
              { n: "03", t: "Everyone helps, from one link.", d: "Send the URL to your fiancé, your mom, your maid-of-honor. Edit together. Change your mind, often." },
            ].map(c => (
              <article key={c.n}>
                <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.12em] text-terracotta">{c.n}</div>
                <h3 className="m-0 mb-3 font-display text-[28px] leading-[1.15]">{c.t}</h3>
                <p className="m-0 text-[15px] leading-[1.6] text-ink-2">{c.d}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Your plans (signed in) */}
        {user && myPlans.length > 0 && (
          <section id="yours" className="mt-24">
            <div className="mb-7 flex items-baseline justify-between">
              <h2 className="m-0 font-display text-3xl md:text-[36px]">
                Your <span className="font-display-italic">plans</span>
              </h2>
              <span className="label-mono">{myPlans.length} plan{myPlans.length === 1 ? "" : "s"}</span>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {myPlans.slice(0, 6).map(p => (
                <PlanCard key={p.id} code={p.code} name={p.name} />
              ))}
            </div>
          </section>
        )}

        {/* Recently opened (this device) — only orphans, since owned plans are above */}
        {orphanRecents.length > 0 && (
          <section id="recents" className={user ? "mt-12" : "mt-24"}>
            <div className="mb-7 flex items-baseline justify-between">
              <h2 className="m-0 font-display text-2xl md:text-[36px]">
                Recently <span className="font-display-italic">opened</span>
              </h2>
              <span className="label-mono">on this device</span>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {orphanRecents.slice(0, 6).map(r => (
                <PlanCard
                  key={r.code}
                  code={r.code}
                  name={r.name}
                  date={new Date(r.openedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  onRemove={() => { removeRecentPlan(r.code); setRecents(getRecentPlans()); }}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

function PlanCard({
  code,
  name,
  date,
  onRemove,
}: {
  code: string;
  name: string;
  date?: string;
  onRemove?: () => void;
}) {
  return (
    <Link
      to={`/plan/${code}`}
      className="group relative block rounded-xl border hairline bg-white/40 p-5 transition hover:bg-white/70 hover:shadow-soft"
    >
      <div className="label-mono mb-3.5 truncate">{code.toUpperCase()}</div>
      <div className="mb-1 truncate font-display text-[22px] leading-[1.1]">{name}</div>
      {date && <div className="mb-5 text-[13px] text-ink-3">{date}</div>}
      <div className="mt-auto flex items-center justify-between">
        <span className="text-[13px] text-ink-2">Open plan</span>
        <ArrowUpRight size={14} className="text-ink-3 opacity-0 transition group-hover:opacity-100" />
      </div>
      {onRemove && (
        <button
          aria-label="Remove from recents"
          onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
          className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full text-ink-3 opacity-0 transition group-hover:opacity-100 hover:bg-paper-2 hover:text-ink"
        >
          <X size={12} />
        </button>
      )}
    </Link>
  );
}

/** Editorial paper floor-plan vignette — rotated, soft shadow, hand-written annotation. */
function FloorPlanVignette() {
  return (
    <div
      className="paper-grain-strong absolute inset-0 overflow-hidden rounded border hairline"
      style={{
        boxShadow: "0 22px 60px -28px hsl(var(--ink) / 0.35), inset 0 1px 0 rgba(255,255,255,0.6)",
        transform: "rotate(-1.2deg)",
      }}
    >
      {/* Room outline */}
      <svg width="100%" height="100%" className="absolute inset-0">
        <rect
          x="22" y="22"
          width="calc(100% - 44px)" height="calc(100% - 44px)"
          fill="none" stroke="hsl(var(--ink))" strokeWidth="1" opacity="0.85"
        />
        <rect x="50" y="14" width="80" height="16" fill="hsl(var(--paper-2))" stroke="hsl(var(--ink))" strokeWidth="1" />
        <text x="90" y="25" textAnchor="middle" fontFamily='"Geist Mono", monospace' fontSize="9" fill="hsl(var(--ink-2))" letterSpacing="0.1em">DOORS</text>
      </svg>

      <PaperTable className="absolute" style={{ top: 60, left: 50 }} size={84} seats={8} occupied={8} label="T1 · Family" />
      <PaperTable className="absolute" style={{ top: 60, left: 200 }} size={84} seats={10} occupied={7} label="T2 · College" />
      <PaperTable className="absolute" style={{ top: 60, left: 350 }} size={84} seats={8} occupied={6} label="T3 · Work" />
      <PaperTable className="absolute" style={{ top: 220, left: 110 }} size={94} seats={10} occupied={10} label="T4 · Head table" />
      <PaperTable className="absolute" style={{ top: 220, left: 300 }} size={84} seats={8} occupied={4} label="T5" />
      <PaperTable className="absolute" style={{ top: 380, left: 70 }} size={84} seats={8} occupied={2} label="T6" />
      <PaperTable className="absolute" style={{ top: 380, left: 230 }} size={84} seats={8} occupied={0} label="T7" />

      {/* Dance floor */}
      <div
        className="absolute"
        style={{
          top: 220, right: 30, width: 120, height: 180,
          background: "repeating-linear-gradient(45deg, transparent 0 6px, hsl(var(--ink) / 0.07) 6px 7px)",
          border: "1px dashed hsl(var(--ink-3))",
        }}
      >
        <div className="mt-[80px] text-center font-mono text-[9px] uppercase tracking-[0.15em] text-ink-3">Dance floor</div>
      </div>

      {/* Hand-written annotation */}
      <div
        className="absolute font-display-italic text-[16px] text-terracotta"
        style={{ top: 360, right: 60, transform: "rotate(-4deg)" }}
      >
        keep aunt Pat far<br />from the speakers
      </div>
      <svg className="absolute" style={{ top: 392, right: 130, transform: "rotate(8deg)" }} width="50" height="40">
        <path d="M 5 5 Q 25 25, 40 30" stroke="hsl(var(--terracotta))" fill="none" strokeWidth="1.2" />
        <path d="M 36 26 L 40 30 L 36 34" stroke="hsl(var(--terracotta))" fill="none" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

export default Index;
