import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generatePlanCode } from "@/lib/planCode";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PaperTable } from "@/components/PaperTable";
import { UserMenu } from "@/components/UserMenu";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useUnlock } from "@/hooks/useUnlock";

interface DashboardPlan {
  id: string;
  code: string;
  name: string;
  event_date: string | null;
  updated_at: string;
}

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<DashboardPlan[] | null>(null);
  const [counts, setCounts] = useState<Record<string, { guests: number; tables: number; assignments: number }>>({});
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { isPaid, loading: unlockLoading } = useUnlock();

  useEffect(() => {
    if (!loading && !user) navigate("/auth?next=/dashboard", { replace: true });
  }, [user, loading, navigate]);

  // Load owned plans + their counts (for the progress bars).
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data: ownerRows } = await supabase
        .from("plan_owners")
        .select("plan_id, plans:plan_id(id, code, name, event_date, updated_at)")
        .eq("user_id", user.id);
      const list = ((ownerRows ?? []) as Array<{ plans: DashboardPlan | null }>)
        .map(r => r.plans)
        .filter((p): p is DashboardPlan => !!p)
        .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
      if (!active) return;
      setPlans(list);

      // Fetch counts in parallel — small queries, fine for a dashboard view.
      const ids = list.map(p => p.id);
      if (ids.length === 0) {
        setCounts({});
        return;
      }
      const [guestsRes, tablesRes, assignsRes] = await Promise.all([
        supabase.from("guests").select("plan_id").in("plan_id", ids),
        supabase.from("tables_def").select("plan_id").in("plan_id", ids),
        supabase.from("assignments").select("plan_id").in("plan_id", ids),
      ]);
      if (!active) return;
      const c: Record<string, { guests: number; tables: number; assignments: number }> = {};
      for (const id of ids) c[id] = { guests: 0, tables: 0, assignments: 0 };
      for (const row of guestsRes.data ?? []) c[row.plan_id].guests++;
      for (const row of tablesRes.data ?? []) c[row.plan_id].tables++;
      for (const row of assignsRes.data ?? []) c[row.plan_id].assignments++;
      setCounts(c);
    })();
    return () => { active = false; };
  }, [user]);

  const userInitial = useMemo(() => {
    const e = user?.email ?? "";
    return e ? e[0]?.toUpperCase() : "?";
  }, [user]);

  const userName = useMemo(() => {
    const e = user?.email ?? "";
    return e.split("@")[0] || "friend";
  }, [user]);

  const greetingName = userName.charAt(0).toUpperCase() + userName.slice(1);

  const createPlan = async () => {
    if (!user) return;
    if (!isPaid) {
      setUpgradeOpen(true);
      return;
    }
    setCreating(true);
    const code = generatePlanCode();
    const { data, error } = await supabase
      .from("plans").insert({ code, name: name.trim() || "Our Wedding" })
      .select().single();
    if (error || !data) {
      setCreating(false);
      console.error("plans.insert failed:", error);
      toast.error(error?.message ? `Couldn't create plan: ${error.message}` : "Could not create plan");
      return;
    }
    const { error: ownErr } = await supabase
      .from("plan_owners")
      .insert({ plan_id: data.id, user_id: user.id, role: "owner" });
    setCreating(false);
    if (ownErr) {
      console.error("plan_owners.insert failed:", ownErr);
      toast.error(`Plan created but ownership failed: ${ownErr.message}`);
    }
    navigate(`/plan/${data.code}`);
  };

  if (loading || !user) return null;

  return (
    <div className="paper-grain min-h-screen">
      {/* Top nav — design surface AuthDashboardA */}
      <header className="border-b hairline">
        <div className="container flex items-center justify-between py-5">
          <Link to="/"><Logo size={22} /></Link>
          <nav className="hidden items-center gap-7 text-[13px] md:flex">
            <span className="text-ink">Plans</span>
            <a href="#templates" className="text-ink-3 hover:text-ink">Templates</a>
            <a href="https://github.com/uditmisra/wedding-seats-simplified" target="_blank" rel="noreferrer" className="text-ink-3 hover:text-ink">Help</a>
            <UserMenu />
          </nav>
          <div className="md:hidden">
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="container py-10 md:py-12">
        {/* Heading row */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="label-mono mb-2">
              YOUR PLANS · {plans?.length ?? "—"}
            </div>
            <h1 className="m-0 font-display text-[36px] leading-[1] tracking-[-0.02em] sm:text-[42px]">
              Hello, <span className="font-display-italic">{greetingName}.</span>
            </h1>
            {plans !== null && (
              <p className="mt-2 text-[14px] text-ink-3">
                {plans.length === 0
                  ? "No plans saved yet — start one below."
                  : plans.length === 1
                    ? "One plan in flight."
                    : `${plans.length} plans on the table.`}
              </p>
            )}
          </div>
          <Button asChild className="rounded-full">
            <a href="#new-plan">+ New plan</a>
          </Button>
        </div>

        {/* Plan grid */}
        {plans === null ? (
          <div className="flex items-center justify-center py-20 text-ink-3">
            <Loader2 size={18} className="mr-2 animate-spin" />
            Loading…
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-xl border border-dashed hairline bg-paper-2/40 p-12 text-center">
            <p className="m-0 max-w-sm font-display-italic text-[15px] text-ink-2">
              You haven&apos;t saved any plans yet. Start one below — we&apos;ll keep it
              tied to <span className="text-ink">{user.email}</span>.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map(p => {
              const c = counts[p.id] ?? { guests: 0, tables: 0, assignments: 0 };
              const seatedPct = c.guests > 0 ? Math.min(1, c.assignments / c.guests) : 0;
              const isFinal = c.guests > 0 && c.assignments === c.guests;
              const accent = isFinal ? "hsl(var(--olive))" : "hsl(var(--terracotta))";
              return (
                <Link
                  key={p.id}
                  to={`/plan/${p.code}`}
                  className="group flex items-center gap-5 rounded-xl border hairline bg-paper p-5 transition hover:shadow-soft"
                >
                  <PaperTable
                    size={64}
                    seats={Math.min(8, Math.max(4, c.tables || 8))}
                    occupied={Math.round(seatedPct * 8)}
                    accent={accent}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[22px] leading-[1.1] truncate">{p.name}</div>
                    <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                      {formatDateLong(p.event_date)} · {c.guests} GUESTS · {c.tables} TABLES
                    </div>
                    <div className="mt-3 flex items-center gap-2.5">
                      <span
                        className="rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]"
                        style={{
                          background: isFinal ? "hsl(var(--olive))" : "transparent",
                          color: isFinal ? "hsl(var(--paper))" : "hsl(var(--ink-2))",
                          borderColor: isFinal ? "hsl(var(--olive))" : "hsl(var(--hairline))",
                        }}
                      >
                        {isFinal ? "Final" : c.assignments > 0 ? "In progress" : "Started"}
                      </span>
                      <div className="flex-1">
                        <div className="h-[2px] w-full" style={{ background: "hsl(var(--paper-3))" }}>
                          <div
                            className="h-full transition-all duration-500"
                            style={{ width: `${seatedPct * 100}%`, background: accent }}
                          />
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-ink-3">
                        {c.assignments}/{c.guests || 0}
                      </span>
                    </div>
                  </div>
                  <span className="hidden font-mono text-[11px] text-ink-3 group-hover:text-ink md:inline">→</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* New plan card */}
        <section
          id="new-plan"
          className="mt-12 rounded-2xl border hairline bg-paper-2/40 p-6 sm:p-8"
        >
          <div className="label-mono mb-3">Start fresh</div>
          <h2 className="m-0 font-display text-[28px] leading-[1.05]">
            New <span className="font-display-italic">plan.</span>
          </h2>
          <div className="mt-5 flex max-w-lg flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <Label htmlFor="dash-name" className="sr-only">
                Plan name
              </Label>
              <Input
                id="dash-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Alex & Jordan's wedding"
                className="h-11 rounded-full border-hairline bg-paper px-4 text-[14px] placeholder:italic"
              />
            </div>
            <Button onClick={createPlan} disabled={creating || unlockLoading} className="h-11 rounded-full px-5">
              {creating ? (
                <>
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Plus size={14} className="mr-1.5" />
                  Start
                  <span className="ml-1 font-display-italic">→</span>
                </>
              )}
            </Button>
          </div>
        </section>
      </main>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
};

function formatDateLong(iso: string | null): string {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default Dashboard;
