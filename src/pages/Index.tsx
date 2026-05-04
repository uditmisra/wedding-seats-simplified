import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { generatePlanCode } from "@/lib/planCode";
import { toast } from "sonner";
import { ArrowRight, ArrowUpRight, X } from "lucide-react";
import { getRecentPlans, removeRecentPlan, type RecentPlan } from "@/lib/recentPlans";

const Index = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [openCode, setOpenCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<RecentPlan[]>([]);
  const [showCodeOpen, setShowCodeOpen] = useState(false);
  useEffect(() => { setRecents(getRecentPlans()); }, []);

  const createPlan = async () => {
    setLoading(true);
    const code = generatePlanCode();
    const { data, error } = await supabase
      .from("plans").insert({ code, name: name.trim() || "Our Wedding" })
      .select().single();
    setLoading(false);
    if (error || !data) { toast.error("Could not create plan"); return; }
    navigate(`/plan/${data.code}`);
  };

  const openPlan = async () => {
    const c = openCode.trim().toLowerCase();
    if (!c) return;
    const { data } = await supabase.from("plans").select("code").eq("code", c).maybeSingle();
    if (!data) { toast.error("No plan found with that code"); return; }
    navigate(`/plan/${data.code}`);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <header className="container h-16 flex items-center">
        <div className="flex items-center gap-2">
          <Mark/>
          <span className="font-display text-lg tracking-tight">Seatly</span>
        </div>
      </header>

      <main className="container pt-12 md:pt-20 pb-20">
        <div className="grid md:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left: editorial hero */}
          <div className="md:col-span-7">
            <h1 className="font-display text-[44px] sm:text-6xl xl:text-7xl leading-[1.02] tracking-tight text-foreground">
              Every guest <em className="text-primary font-normal italic">in their</em> perfect seat.
            </h1>
            <p className="mt-6 text-base md:text-lg text-soft max-w-md leading-relaxed">
              A calm, shareable seating planner for your wedding day.
            </p>

            {/* Visual vignette — show, don't tell */}
            <div className="mt-12 max-w-md">
              <SeatingVignette/>
            </div>
          </div>

          {/* Right: single CTA card */}
          <div className="md:col-span-5 space-y-3">
            <div className="rounded-2xl bg-card border-hairline border shadow-elegant p-7">
              <h2 className="font-display text-2xl">Start your plan</h2>
              <p className="text-sm text-soft mt-1">A private link, just for the two of you.</p>
              <div className="mt-6 space-y-1.5">
                <Label htmlFor="name" className="text-xs text-soft font-normal">What should we call it?</Label>
                <Input
                  id="name" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Alex & Jordan's wedding"
                  className="h-11 border-hairline"
                />
              </div>
              <Button onClick={createPlan} disabled={loading} className="w-full mt-5 h-11 shadow-soft">
                Create plan <ArrowRight size={15} className="ml-1.5"/>
              </Button>
            </div>

            {recents.length > 0 && (
              <div className="rounded-2xl border-hairline border bg-card/50 p-4">
                <div className="text-xs uppercase tracking-wider text-soft mb-2 px-1">Recent</div>
                <ul className="space-y-0.5">
                  {recents.slice(0, 4).map(r => (
                    <li key={r.code} className="group flex items-center rounded-lg hover:bg-surface-hover transition">
                      <button onClick={() => navigate(`/plan/${r.code}`)} className="flex-1 text-left px-2.5 py-2 flex items-center gap-2.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-primary/40 shrink-0"/>
                        <span className="font-medium truncate text-sm">{r.name}</span>
                        <span className="text-xs text-soft ml-auto whitespace-nowrap">
                          {new Date(r.openedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                        <ArrowUpRight size={13} className="opacity-0 group-hover:opacity-50 transition shrink-0"/>
                      </button>
                      <button
                        onClick={() => { removeRecentPlan(r.code); setRecents(getRecentPlans()); }}
                        className="opacity-0 group-hover:opacity-100 text-soft hover:text-destructive p-1.5 mr-1"
                        aria-label="Remove from recents"
                      >
                        <X size={12}/>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-center text-sm pt-1">
              {showCodeOpen ? (
                <div className="rounded-xl border-hairline border bg-card p-3 text-left">
                  <Label className="text-xs text-soft font-normal">Got a code from your partner?</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input value={openCode} onChange={e => setOpenCode(e.target.value)} placeholder="luna-meadow-4821" autoFocus className="h-9 border-hairline"/>
                    <Button variant="secondary" onClick={openPlan} className="h-9">Open</Button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowCodeOpen(true)} className="text-soft hover:text-foreground underline-offset-4 hover:underline">
                  Have a plan code?
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

/** Minimal logomark — single dot inside a circle, evokes a seat at a table. */
function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      <circle cx="11" cy="11" r="10" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.25"/>
      <circle cx="11" cy="11" r="3" fill="hsl(var(--primary))"/>
    </svg>
  );
}

/** Quiet, monochrome floor-plan vignette: three round tables with seats. */
function SeatingVignette() {
  const tables = [
    { cx: 70, cy: 80, r: 28, n: 8 },
    { cx: 200, cy: 60, r: 22, n: 6 },
    { cx: 320, cy: 100, r: 32, n: 10 },
  ];
  return (
    <svg viewBox="0 0 400 180" className="w-full h-auto" aria-hidden>
      <defs>
        <radialGradient id="t" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="hsl(var(--card))"/>
          <stop offset="100%" stopColor="hsl(var(--surface))"/>
        </radialGradient>
      </defs>
      {tables.map((t, i) => (
        <g key={i}>
          {Array.from({ length: t.n }).map((_, k) => {
            const a = (k / t.n) * Math.PI * 2 - Math.PI / 2;
            const sx = t.cx + Math.cos(a) * (t.r + 10);
            const sy = t.cy + Math.sin(a) * (t.r + 10);
            const filled = (i + k) % 3 !== 0;
            return <circle key={k} cx={sx} cy={sy} r={3} fill={filled ? "hsl(var(--primary))" : "hsl(var(--hairline))"}/>;
          })}
          <circle cx={t.cx} cy={t.cy} r={t.r} fill="url(#t)" stroke="hsl(var(--hairline))"/>
        </g>
      ))}
      {/* connecting hairline ground */}
      <line x1="20" y1="160" x2="380" y2="160" stroke="hsl(var(--hairline))"/>
    </svg>
  );
}

export default Index;
