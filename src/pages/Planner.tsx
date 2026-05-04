import { useParams, Link, useSearchParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { usePlanData } from "@/hooks/usePlanData";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { GuestsTab } from "@/components/planner/GuestsTab";
import { TablesTab } from "@/components/planner/TablesTab";
import { SeatingView } from "@/components/planner/SeatingView";
import { ConstraintsPanel } from "@/components/planner/ConstraintsPanel";
import { ExportPanel } from "@/components/planner/ExportPanel";
import { AutoAssignDialog } from "@/components/planner/AutoAssignDialog";
import { OnboardingFlow } from "@/components/planner/OnboardingFlow";
import { LayoutTabs } from "@/components/planner/LayoutTabs";
import { CompareScenarios } from "@/components/planner/CompareScenarios";
import { UserMenu } from "@/components/UserMenu";
import { Link as LinkIcon, Check, Wand2, GitCompareArrows, ShieldAlert, Download, Mail, Bookmark, MoreHorizontal, Pencil, Eye, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { addRecentPlan } from "@/lib/recentPlans";
import { tableConflicts, unmetMustWith } from "@/lib/seating";
import { useAuth } from "@/hooks/useAuth";

const TAB_DEFS = [
  { value: "guests", numeral: "I", label: "Guests" },
  { value: "tables", numeral: "II", label: "Tables" },
  { value: "constraints", numeral: "III", label: "Rules" },
  { value: "seating", numeral: "IV", label: "Seating" },
  { value: "compare", numeral: "V", label: "Compare" },
  { value: "export", numeral: "VI", label: "Export" },
] as const;

const Planner = () => {
  const { code } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { plan, setPlan, scenarios, scenarioId, setScenarioId, guests, tables, assignments, constraints, loading, notFound, refresh } = usePlanData(code);
  const { user } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<string>("seating");
  const [guestsAutoOpen, setGuestsAutoOpen] = useState<"new" | "import" | null>(null);
  const [tablesAutoOpen, setTablesAutoOpen] = useState<"new" | "bulk" | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [hasOwner, setHasOwner] = useState<boolean | null>(null);
  const [claiming, setClaiming] = useState(false);

  const onboardingActive = !loading && plan && (guests.length === 0 || tables.length === 0);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const showOnboarding = canEdit && onboardingActive && !onboardingDismissed;

  // Determine canEdit + ownership state
  useEffect(() => {
    if (!plan) return;
    (async () => {
      const { data: hasOwnerRpc } = await supabase.rpc("plan_has_any_owner", { _plan_id: plan.id });
      setHasOwner(!!hasOwnerRpc);
      if (user) {
        const { data: mine } = await supabase
          .from("plan_owners")
          .select("user_id")
          .eq("plan_id", plan.id)
          .eq("user_id", user.id)
          .maybeSingle();
        setCanEdit(!!mine);
      } else {
        setCanEdit(false);
      }
    })();
  }, [plan?.id, user?.id]);

  const claim = useCallback(async () => {
    if (!user || !plan) return;
    setClaiming(true);
    const { error } = await supabase.from("plan_owners").insert({ plan_id: plan.id, user_id: user.id, role: "owner" });
    setClaiming(false);
    if (error) { toast.error(error.message); return; }
    setHasOwner(true);
    setCanEdit(true);
    toast.success("This plan is yours now");
  }, [user, plan]);

  // Auto-claim when returning from auth with ?claim=1
  useEffect(() => {
    if (searchParams.get("claim") === "1" && user && plan && hasOwner === false && !canEdit && !claiming) {
      claim().finally(() => {
        const next = new URLSearchParams(searchParams);
        next.delete("claim");
        setSearchParams(next, { replace: true });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, plan?.id, hasOwner]);

  useEffect(() => {
    if (showOnboarding) setTab("seating");
  }, [showOnboarding]);

  useEffect(() => {
    if (plan) addRecentPlan({ code: plan.code, name: plan.name, openedAt: Date.now() });
  }, [plan?.id, plan?.name]);

  if (loading) return (
    <div className="paper-grain flex min-h-screen items-center justify-center">
      <span className="font-display-italic text-[15px] text-ink-3">Setting the table…</span>
    </div>
  );
  if (notFound || !plan) return (
    <div className="paper-grain flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="label-mono text-terracotta">Plan not found</div>
      <p className="m-0 max-w-sm font-display text-2xl leading-tight">
        That code doesn&apos;t open <span className="font-display-italic">anything.</span>
      </p>
      <p className="text-[13px] text-ink-3">Maybe a typo, maybe deleted. The way back is short.</p>
      <Link
        to="/"
        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] text-paper hover:bg-ink-2"
      >
        Back home
        <span className="font-display-italic">→</span>
      </Link>
    </div>
  );

  const expected = guests.filter(g => g.rsvp !== "declined");
  const expectedIds = new Set(expected.map(g => g.id));
  const totalExpected = expected.length;
  const seatedCount = assignments.filter(a => expectedIds.has(a.guest_id)).length;
  const conflicts =
    tables.flatMap(t => tableConflicts(t.id, assignments, constraints)).length +
    unmetMustWith(assignments, constraints).length;
  const seatedPct = totalExpected ? Math.min(100, Math.round((seatedCount / totalExpected) * 100)) : 0;

  const planCode = plan.code.toUpperCase();

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const renamePlan = async (name: string) => {
    setPlan({ ...plan, name });
    await supabase.from("plans").update({ name }).eq("id", plan.id);
  };

  const goImport = () => { setGuestsAutoOpen("import"); setTab("guests"); setOnboardingDismissed(true); };

  // Always show all tabs so visitors can browse the plan; edit-gated UI inside
  // each tab still prevents anonymous changes (and RLS blocks server-side).
  const visibleTabs = TAB_DEFS;

  return (
    <div className="paper-grain min-h-screen">
      {/* Editorial header */}
      <header className="sticky top-0 z-30 border-b hairline bg-paper/85 backdrop-blur-md">
        <div className="container flex h-16 items-center gap-6">
          <Link to="/" aria-label="Home" className="flex items-baseline gap-1.5">
            <span className="font-display text-[18px]">Seatly</span>
            <span className="inline-block size-1 rounded-full bg-terracotta" aria-hidden />
          </Link>
          <span className="hidden h-5 w-px bg-hairline sm:block" aria-hidden />
          <div className="min-w-0 flex-1">
            {editingName && canEdit ? (
              <Input
                autoFocus
                value={plan.name}
                onChange={e => renamePlan(e.target.value)}
                onBlur={() => setEditingName(false)}
                className="h-8 w-full max-w-xs border-hairline bg-transparent font-display text-[17px]"
              />
            ) : (
              <button
                onClick={() => canEdit && setEditingName(true)}
                className={`group flex max-w-full items-center gap-1.5 truncate text-left ${canEdit ? "" : "cursor-default"}`}
              >
                <span className="truncate font-display text-[17px] leading-tight">{plan.name}</span>
                {canEdit && <Pencil size={11} className="shrink-0 opacity-0 transition group-hover:opacity-50" />}
              </button>
            )}
            <div className="font-mono text-[10px] uppercase tracking-[0.05em] text-ink-3">
              {planCode}
            </div>
          </div>
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Tooltip><TooltipTrigger asChild>
                    <button
                      type="button"
                      className="hidden rounded-full border hairline px-3 py-1.5 text-[12px] text-ink-2 hover:bg-paper-2 sm:inline-flex"
                      aria-label="Share plan"
                    >
                      Share link <span className="ml-1 font-display-italic text-terracotta">↗</span>
                    </button>
                  </TooltipTrigger><TooltipContent>Share this plan</TooltipContent></Tooltip>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 rounded-xl border-hairline p-4 shadow-elegant">
                  <div className="space-y-2.5">
                    <Button variant="outline" size="sm" className="w-full justify-start font-normal" onClick={copyLink}>
                      {copied ? <Check size={14} className="mr-2 text-olive" /> : <LinkIcon size={14} className="mr-2" />}
                      {copied ? "Link copied" : "Copy link"}
                    </Button>
                    <Button asChild variant="outline" size="sm" className="w-full justify-start font-normal">
                      <a href={`mailto:?subject=${encodeURIComponent(`Our seating plan: ${plan.name}`)}&body=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.href : ""}`)}`}>
                        <Mail size={14} className="mr-2" />Email yourself
                      </a>
                    </Button>
                    <div className="flex items-center gap-1.5 border-t hairline pt-2 text-xs text-ink-3">
                      <Bookmark size={11} /> Press ⌘+D to bookmark
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {canEdit && (
                <Button size="sm" onClick={() => setAutoOpen(true)} className="h-9 rounded-full px-4 shadow-soft">
                  <Wand2 size={14} className="mr-1.5" />Auto-seat
                </Button>
              )}
              <UserMenu />
            </div>
          </TooltipProvider>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Claim banner — no owner yet */}
        {!canEdit && hasOwner === false && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border hairline bg-card p-4 shadow-soft sm:p-5">
            <Sparkles size={18} className="text-terracotta" />
            <div className="min-w-0 flex-1">
              <div className="font-display text-[18px] leading-tight">
                Nobody owns this plan <span className="font-display-italic">yet.</span>
              </div>
              <div className="text-[12px] text-ink-3">
                {user ? "Claim it and it's yours to edit." : "Sign in to claim it — anyone with the link can still view."}
              </div>
            </div>
            {user ? (
              <Button onClick={claim} disabled={claiming} className="rounded-full">
                {claiming ? "Claiming…" : "Claim this plan"}
              </Button>
            ) : (
              <Button asChild className="rounded-full">
                <Link to={`/auth?next=${encodeURIComponent(window.location.pathname + "?claim=1")}`}>
                  Sign in to claim
                </Link>
              </Button>
            )}
          </div>
        )}

        {/* View-only banner — owned by someone else */}
        {!canEdit && hasOwner && (
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border hairline bg-paper-2/60 px-4 py-2.5 text-[13px]">
            <Eye size={14} className="text-ink-3" />
            <span className="text-ink-2">
              You&apos;re a <span className="font-display-italic">guest</span> at this plan — looking, not editing.
            </span>
            {!user && (
              <Link
                to={`/auth?next=${encodeURIComponent(window.location.pathname)}`}
                className="ml-auto text-terracotta hover:underline"
              >
                Sign in to edit
              </Link>
            )}
          </div>
        )}

        {showOnboarding ? (
          <OnboardingFlow
            planId={plan.id}
            scenarioId={scenarioId ?? ""}
            guestCount={guests.length}
            tableCount={tables.length}
            onImport={goImport}
            onAutoAssign={() => { setAutoOpen(true); setOnboardingDismissed(true); }}
            onFinish={() => { setOnboardingDismissed(true); setTab("seating"); }}
            refresh={refresh}
          />
        ) : null}

        {!showOnboarding && scenarioId && canEdit && (
          <LayoutTabs
            planId={plan.id}
            scenarios={scenarios}
            scenarioId={scenarioId}
            setScenarioId={setScenarioId}
            tables={tables}
            assignments={assignments}
            refresh={refresh}
          />
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-end justify-between gap-3 border-b hairline">
            <TabsList className="h-auto gap-7 rounded-none bg-transparent p-0">
              {visibleTabs.map(t => {
                const count = t.value === "guests" ? guests.length : t.value === "tables" ? tables.length : undefined;
                return (
                  <ChapterTab
                    key={t.value}
                    value={t.value}
                    numeral={t.numeral}
                    label={t.label}
                    count={count}
                  />
                );
              })}
            </TabsList>

            <div className="flex items-center gap-3 pb-3">
              {!showOnboarding && totalExpected > 0 && (
                <div className="hidden items-center gap-2 sm:flex">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3 tabular-nums">
                    {seatedCount} / {totalExpected} seated
                  </span>
                  <div className="h-[3px] w-24 rounded-full bg-paper-3">
                    <div
                      className="h-full rounded-full bg-olive transition-[width] duration-500"
                      style={{ width: `${seatedPct}%` }}
                    />
                  </div>
                  {conflicts > 0 && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-terracotta">
                      · {conflicts} to review
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <TabsContent value="seating" className="mt-6 animate-tab-in">
            <SeatingView
              planId={plan.id}
              scenarioId={scenarioId ?? ""}
              guests={guests}
              tables={tables}
              assignments={assignments}
              constraints={constraints}
              refresh={refresh}
              canEdit={canEdit}
              onGoToGuests={() => setTab("guests")}
              onGoToTables={() => setTab("tables")}
            />
          </TabsContent>
          <TabsContent value="guests" className="mt-6 animate-tab-in">
                <GuestsTab planId={plan.id} guests={guests} refresh={refresh} autoOpen={guestsAutoOpen} onAutoOpenHandled={() => setGuestsAutoOpen(null)} />
          </TabsContent>
          <TabsContent value="tables" className="mt-6 animate-tab-in">
                <TablesTab planId={plan.id} scenarioId={scenarioId ?? ""} tables={tables} assignments={assignments} refresh={refresh} autoOpen={tablesAutoOpen} onAutoOpenHandled={() => setTablesAutoOpen(null)} />
          </TabsContent>
          <TabsContent value="compare" className="mt-6 animate-tab-in">
                <CompareScenarios scenarios={scenarios} currentScenarioId={scenarioId} currentTables={tables} currentAssignments={assignments} guests={guests} constraints={constraints} />
          </TabsContent>
          <TabsContent value="constraints" className="mt-6 animate-tab-in">
                <ConstraintsPanel planId={plan.id} guests={guests} constraints={constraints} refresh={refresh} />
          </TabsContent>
          <TabsContent value="export" className="mt-6 animate-tab-in">
                <ExportPanel plan={plan} guests={guests} tables={tables} assignments={assignments} constraints={constraints} />
          </TabsContent>
        </Tabs>
      </main>

      {autoOpen && canEdit && (
        <AutoAssignDialog
          planId={plan.id}
          scenarioId={scenarioId ?? ""}
          guests={guests}
          tables={tables}
          assignments={assignments}
          constraints={constraints}
          onClose={() => { setAutoOpen(false); refresh(); toast.success("Seated."); }}
        />
      )}
    </div>
  );
};

export default Planner;

function ChapterTab({
  value,
  numeral,
  label,
  count,
}: {
  value: string;
  numeral: string;
  label: string;
  count?: number;
}) {
  return (
    <TabsTrigger
      value={value}
      className="group relative h-auto rounded-none border-0 bg-transparent px-0 pb-3 pt-3 text-sm font-medium text-ink-3 transition-colors data-[state=active]:bg-transparent data-[state=active]:text-ink data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-px data-[state=active]:after:bg-ink"
    >
      <span className="flex items-baseline gap-1.5">
        <span className="font-display-italic text-[13px] text-ink-3 transition-colors group-data-[state=active]:text-terracotta">
          {numeral}
        </span>
        <span className="text-[14px]">{label}</span>
        {count !== undefined && (
          <span className="font-mono text-[10px] text-ink-3 tabular-nums">{count}</span>
        )}
      </span>
    </TabsTrigger>
  );
}
