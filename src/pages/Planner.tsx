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
import { VenueTab } from "@/components/planner/VenueTab";
import { SeatingView } from "@/components/planner/SeatingView";
import { ConstraintsPanel } from "@/components/planner/ConstraintsPanel";
import { ExportPanel } from "@/components/planner/ExportPanel";
import { AutoAssignDialog } from "@/components/planner/AutoAssignDialog";
import { OnboardingFlow } from "@/components/planner/OnboardingFlow";
import { LayoutTabs } from "@/components/planner/LayoutTabs";
import { CompareScenarios } from "@/components/planner/CompareScenarios";
import { SharePopover } from "@/components/planner/SharePopover";
import { UserMenu } from "@/components/UserMenu";
import { Logo } from "@/components/Logo";
import { analytics } from "@/lib/analytics";
import { Link as LinkIcon, Check, GitCompareArrows, ShieldAlert, Download, Mail, Bookmark, MoreHorizontal, Pencil, Eye, Sparkles, Clock } from "lucide-react";
import { ClaimPlanModal } from "@/components/ClaimPlanModal";
import { SignInNudge } from "@/components/SignInNudge";
import { ActivityDrawer } from "@/components/planner/ActivityDrawer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { addRecentPlan } from "@/lib/recentPlans";
import { tableConflicts, unmetMustWith } from "@/lib/seating";
import { useAuth } from "@/hooks/useAuth";
import { logActivity, displayName } from "@/lib/activity";
import { useSeoHead } from "@/lib/useSeoHead";

const TAB_DEFS = [
  { value: "guests", numeral: "I", label: "Guests" },
  { value: "venue", numeral: "II", label: "Venue" },
  { value: "constraints", numeral: "III", label: "Rules" },
  { value: "seating", numeral: "IV", label: "Seating" },
  { value: "compare", numeral: "V", label: "Compare" },
  { value: "export", numeral: "VI", label: "Export" },
] as const;

const Planner = () => {
  const { code } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { plan, setPlan, scenarios, scenarioId, setScenarioId, guests, tables, assignments, setAssignments, constraints, loading, notFound, refresh } = usePlanData(code);
  const { user } = useAuth();

  useSeoHead({
    title: plan ? `${plan.name} | Wedding Seater` : "Wedding Seater",
    description:
      "Your private wedding seating chart — drag guests onto tables, manage RSVPs, resolve constraints, and share the live plan with whoever's helping.",
    noindex: true,
  });
  const [editingName, setEditingName] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<string>("seating");
  const [guestsAutoOpen, setGuestsAutoOpen] = useState<"new" | "import" | null>(null);
  const [tablesAutoOpen, setTablesAutoOpen] = useState<"new" | "bulk" | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [hasOwner, setHasOwner] = useState<boolean | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

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

  // For signed-in viewers of an unowned plan: pop the claim modal once per
  // session per plan. sessionStorage so dismissals don't bleed across days.
  useEffect(() => {
    if (!user || !plan) return;
    if (hasOwner !== false) return;
    if (canEdit) return;
    if (searchParams.get("claim") === "1") return; // auto-claim path covers this
    if (typeof window === "undefined") return;
    const key = `claim-modal:${plan.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setClaimModalOpen(true);
  }, [user?.id, plan?.id, hasOwner, canEdit, searchParams]);

  const handleClaimFromModal = async () => {
    await claim();
    setClaimModalOpen(false);
  };

  useEffect(() => {
    if (showOnboarding) setTab("seating");
  }, [showOnboarding]);

  // Legacy query-param redirect: ?tab=tables|room → ?tab=venue
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "tables" || t === "room") {
      const next = new URLSearchParams(searchParams);
      next.set("tab", "venue");
      setSearchParams(next, { replace: true });
      setTab("venue");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (plan) {
      addRecentPlan({ code: plan.code, name: plan.name, openedAt: Date.now() });
      analytics.planOpened({ code: plan.code, owned: canEdit });
    }
  }, [plan?.id]);

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
  const planInitials = plan.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("") || "MJ";

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    analytics.planShared({ code: plan.code });
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const renamePlan = async (name: string) => {
    setPlan({ ...plan, name });
    await supabase.from("plans").update({ name }).eq("id", plan.id);
  };

  const goImport = () => { setGuestsAutoOpen("import"); setTab("guests"); setOnboardingDismissed(true); };

  const log = (action: string, subject?: string, detail?: string) => {
    if (!plan) return;
    logActivity(plan.id, user?.id ?? null, displayName(user), action, subject, detail);
  };

  // Always show all tabs so visitors can browse the plan; edit-gated UI inside
  // each tab still prevents anonymous changes (and RLS blocks server-side).
  const visibleTabs = TAB_DEFS;

  return (
    <div className="planner-page paper-grain min-h-screen">
      {/* Editorial header */}
      <header className="sticky top-0 z-30 border-b hairline bg-paper/85 backdrop-blur-md">
        <div className="container flex h-16 items-center gap-6">
          <Link to="/" aria-label="Home">
            <Logo size={18} />
          </Link>
          <span className="hidden h-5 w-px bg-hairline sm:block" aria-hidden />
          <div className="min-w-0 flex-1">
            {editingName && canEdit ? (
              <Input
                autoFocus
                autoCapitalize="words"
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
            <div className="font-mono text-[10px] uppercase tracking-[0.05em] text-ink-2">
              {planCode}
            </div>
          </div>
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-2">
              <span className="hidden font-mono text-[11px] text-ink-2 sm:inline">Saved · just now</span>
              <SharePopover
                planName={plan.name}
                planUrl={typeof window !== "undefined" ? window.location.href : ""}
                inviterName={
                  (user?.user_metadata as any)?.full_name ||
                  (user?.user_metadata as any)?.name ||
                  (user?.email ? user.email.split("@")[0] : undefined)
                }
              />
              <span
                aria-hidden
                className="hidden size-7 items-center justify-center rounded-full bg-olive font-mono text-[11px] font-medium text-paper sm:inline-flex"
              >
                {planInitials}
              </span>
              <button
                onClick={() => setActivityOpen(true)}
                className="flex size-9 items-center justify-center rounded-full border hairline bg-paper text-ink-3 hover:bg-paper-2 hover:text-ink transition"
                aria-label="Activity log"
                title="Activity log"
              >
                <Clock size={15} />
              </button>
              <UserMenu />
            </div>
          </TooltipProvider>
        </div>
      </header>

      <main className="container py-8 pb-24 sm:pb-8 space-y-8">
        {/* Day-2+ sign-in nudge for anonymous viewers (non-blocking, dismissible). */}
        {!user && (
          <SignInNudge
            planId={plan.id}
            signedIn={!!user}
            guestCount={guests.length}
            tableCount={tables.length}
          />
        )}

        {/* Anonymous viewer — inline claim banner asking them to sign in. */}
        {!canEdit && hasOwner === false && !user && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border hairline bg-card p-4 shadow-soft sm:p-5">
            <Sparkles size={18} className="text-terracotta" />
            <div className="min-w-0 flex-1">
              <div className="font-display text-[18px] leading-tight">
                This plan needs an <span className="font-display-italic">owner.</span>
              </div>
              <div className="text-[12px] text-ink-3">
                Sign in to claim it — only you&apos;ll be able to edit. Anyone with the link can still view.
              </div>
            </div>
            <Button asChild className="rounded-full">
              <Link to={`/auth?next=${encodeURIComponent(window.location.pathname + "?claim=1")}`}>
                Sign in to claim
              </Link>
            </Button>
          </div>
        )}

        {/* View-only banner — owned by someone else */}
        {!canEdit && hasOwner && (
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border hairline bg-paper-2/60 px-4 py-2.5 text-[13px]">
            <Eye size={14} className="text-ink-3" />
            <span className="text-ink-2">
              <span className="font-display-italic">View only.</span> Ask the owner if you need to edit.
            </span>
            {!user && (
              <Link
                to={`/auth?next=${encodeURIComponent(window.location.pathname)}`}
                className="ml-auto text-terracotta hover:underline"
              >
                Start your own plan
              </Link>
            )}
          </div>
        )}

        {showOnboarding ? (
          <OnboardingFlow
            planId={plan.id}
            scenarioId={scenarioId ?? ""}
            planName={plan.name}
            planCode={plan.code}
            eventDate={plan.event_date}
            guestCount={guests.length}
            tableCount={tables.length}
            guests={guests}
            constraints={constraints}
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

        <Tabs value={tab} onValueChange={v => { if (v === "export") analytics.exportOpened(); setTab(v); }}>
          <div className="hidden items-end justify-between gap-3 border-b hairline bg-white/30 px-4 -mx-4 rounded-t-md sm:flex">
            <TabsList className="h-auto gap-7 rounded-none bg-transparent p-0">
              {visibleTabs.map(t => {
                const count = t.value === "guests" ? guests.length : t.value === "venue" ? tables.length : undefined;
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
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-2 tabular-nums">
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
              setAssignments={setAssignments}
              constraints={constraints}
              refresh={refresh}
              canEdit={canEdit}
              onGoToGuests={() => setTab("guests")}
              onGoToTables={() => setTab("venue")}
              onActivityLog={log}
              roomConfig={plan.room_config}
              onAutoAssign={() => setAutoOpen(true)}
              onSavedRoom={(cfg) => plan && setPlan({ ...plan, room_config: cfg })}
            />
          </TabsContent>
          <TabsContent value="guests" className="mt-6 animate-tab-in">
                <GuestsTab planId={plan.id} guests={guests} refresh={refresh} autoOpen={guestsAutoOpen} onAutoOpenHandled={() => setGuestsAutoOpen(null)} onActivityLog={log} />
          </TabsContent>
          <TabsContent value="venue" className="mt-6 animate-tab-in">
                <VenueTab
                  planId={plan.id}
                  scenarioId={scenarioId ?? ""}
                  tables={tables}
                  assignments={assignments}
                  roomConfig={plan.room_config}
                  canEdit={canEdit}
                  refresh={refresh}
                  onSavedRoom={(cfg) => plan && setPlan({ ...plan, room_config: cfg })}
                  autoOpen={tablesAutoOpen}
                  onAutoOpenHandled={() => setTablesAutoOpen(null)}
                />
          </TabsContent>
          <TabsContent value="compare" className="mt-6 animate-tab-in">
                <CompareScenarios scenarios={scenarios} currentScenarioId={scenarioId} currentTables={tables} currentAssignments={assignments} guests={guests} constraints={constraints} />
          </TabsContent>
          <TabsContent value="constraints" className="mt-6 animate-tab-in">
                <ConstraintsPanel planId={plan.id} guests={guests} constraints={constraints} refresh={refresh} onAutoAssign={() => setAutoOpen(true)} />
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
          setAssignments={setAssignments}
          constraints={constraints}
          onClose={() => { setAutoOpen(false); refresh(); }}
        />
      )}

      <ClaimPlanModal
        open={claimModalOpen}
        planName={plan.name}
        guestCount={guests.length}
        tableCount={tables.length}
        startedLabel="recently"
        email={user?.email ?? ""}
        busy={claiming}
        onClaim={handleClaimFromModal}
        onDecline={() => setClaimModalOpen(false)}
      />

      <ActivityDrawer planId={plan.id} open={activityOpen} onOpenChange={setActivityOpen} />

      {/* Mobile bottom tab bar — design surface MobileGuestsA tab strip */}
      {!showOnboarding && (
        <nav
          className="planner-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t hairline bg-paper/95 backdrop-blur sm:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          aria-label="Planner sections"
        >
          <div className="flex items-stretch justify-between">
            {visibleTabs.map(t => {
              const active = tab === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTab(t.value)}
                  className="flex flex-1 flex-col items-center gap-0.5 py-2 transition"
                >
                  <span
                    className={`font-display-italic text-[12px] ${active ? "text-terracotta" : "text-ink-3"}`}
                  >
                    {t.numeral}
                  </span>
                  <span
                    className={`text-[10px] tracking-[0.04em] ${active ? "font-medium text-ink" : "text-ink-3"}`}
                  >
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
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
      className="group relative h-auto rounded-none border-0 bg-transparent px-0 pb-3 pt-3 text-sm font-normal text-ink-2 transition-colors data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-ink data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-px data-[state=active]:after:bg-ink"
    >
      <span className="flex items-baseline gap-1.5">
        <span className="font-display-italic text-[13px] text-ink-2 transition-colors group-data-[state=active]:text-terracotta">
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
