import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { usePlanData } from "@/hooks/usePlanData";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { StatsBar } from "@/components/planner/StatsBar";
import { GuestsTab } from "@/components/planner/GuestsTab";
import { TablesTab } from "@/components/planner/TablesTab";
import { SeatingView } from "@/components/planner/SeatingView";
import { ConstraintsPanel } from "@/components/planner/ConstraintsPanel";
import { ExportPanel } from "@/components/planner/ExportPanel";
import { AutoAssignDialog } from "@/components/planner/AutoAssignDialog";
import { OnboardingFlow } from "@/components/planner/OnboardingFlow";
import { LayoutTabs } from "@/components/planner/LayoutTabs";
import { CompareScenarios } from "@/components/planner/CompareScenarios";
import { Link as LinkIcon, Check, ArrowLeft, Wand2, GitCompareArrows, ShieldAlert, Download, Mail, Bookmark, Share2, MoreHorizontal, Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { addRecentPlan } from "@/lib/recentPlans";

const Planner = () => {
  const { code } = useParams();
  const { plan, setPlan, scenarios, scenarioId, setScenarioId, guests, tables, assignments, constraints, loading, notFound, refresh } = usePlanData(code);
  const [editingName, setEditingName] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<string>("seating");
  const [guestsAutoOpen, setGuestsAutoOpen] = useState<"new" | "import" | null>(null);
  const [tablesAutoOpen, setTablesAutoOpen] = useState<"new" | "bulk" | null>(null);
  const onboardingActive = !loading && plan && (guests.length === 0 || tables.length === 0);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const showOnboarding = onboardingActive && !onboardingDismissed;

  useEffect(() => {
    if (showOnboarding) setTab("seating");
  }, [showOnboarding]);

  // Track recently opened plans
  useEffect(() => {
    if (plan) addRecentPlan({ code: plan.code, name: plan.name, openedAt: Date.now() });
  }, [plan?.id, plan?.name]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  if (notFound || !plan) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <p>Plan not found.</p>
      <Link to="/" className="text-primary underline">Back home</Link>
    </div>
  );

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const renamePlan = async (name: string) => {
    setPlan({ ...plan, name });
    await supabase.from("plans").update({ name }).eq("id", plan.id);
  };

  const goImport = () => { setGuestsAutoOpen("import"); setTab("guests"); setOnboardingDismissed(true); };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b hairline bg-background/85 backdrop-blur-md sticky top-0 z-30">
        <div className="container h-14 flex items-center gap-3">
          <Link to="/" aria-label="Home" className="text-soft hover:text-foreground -ml-1 p-1.5 rounded-md hover:bg-surface-hover">
            <ArrowLeft size={16}/>
          </Link>
          {editingName ? (
            <Input autoFocus value={plan.name} onChange={e => renamePlan(e.target.value)} onBlur={() => setEditingName(false)} className="h-8 w-64 font-display text-lg border-hairline"/>
          ) : (
            <button onClick={() => setEditingName(true)} className="group flex items-center gap-1.5 font-display text-lg truncate text-foreground hover:text-primary">
              <span className="truncate">{plan.name}</span>
              <Pencil size={12} className="opacity-0 group-hover:opacity-50 transition shrink-0"/>
            </button>
          )}
          <TooltipProvider delayDuration={200}>
            <div className="ml-auto flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Tooltip><TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-soft hover:text-foreground" aria-label="Share plan">
                      <Share2 size={15}/>
                    </Button>
                  </TooltipTrigger><TooltipContent>Share this plan</TooltipContent></Tooltip>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-4 rounded-xl shadow-elegant border-hairline">
                  <div className="space-y-2.5">
                    <Button variant="outline" size="sm" className="w-full justify-start font-normal" onClick={copyLink}>
                      {copied ? <Check size={14} className="mr-2 text-sage"/> : <LinkIcon size={14} className="mr-2"/>}
                      {copied ? "Link copied" : "Copy link"}
                    </Button>
                    <Button asChild variant="outline" size="sm" className="w-full justify-start font-normal">
                      <a href={`mailto:?subject=${encodeURIComponent(`Our seating plan: ${plan.name}`)}&body=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.href : ""}`)}`}>
                        <Mail size={14} className="mr-2"/>Email yourself
                      </a>
                    </Button>
                    <div className="text-xs text-soft flex items-center gap-1.5 pt-2 border-t hairline">
                      <Bookmark size={11}/> Press ⌘+D to bookmark
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {assignments.length > 0 && (
                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-soft hover:text-foreground" onClick={() => setTab("export")} aria-label="Export">
                    <Download size={15}/>
                  </Button>
                </TooltipTrigger><TooltipContent>Export &amp; print</TooltipContent></Tooltip>
              )}
              <Button size="sm" onClick={() => setAutoOpen(true)} className="ml-1 h-9 shadow-soft">
                <Wand2 size={14} className="mr-1.5"/>Auto-seat
              </Button>
            </div>
          </TooltipProvider>
        </div>
      </header>

      <main className="container py-8 space-y-8">
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
        ) : (
          <StatsBar guests={guests} tables={tables} assignments={assignments} constraints={constraints}/>
        )}

        {!showOnboarding && scenarioId && (
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
          <div className="flex items-center justify-between gap-2 border-b hairline">
            <TabsList className="bg-transparent h-auto p-0 gap-6 rounded-none">
              <UnderlineTab value="seating" label="Seating"/>
              <UnderlineTab value="guests" label="Guests" count={guests.length}/>
              <UnderlineTab value="tables" label="Tables" count={tables.length}/>
            </TabsList>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-sm text-soft hover:text-foreground inline-flex items-center gap-1 px-2 py-2.5">
                  More <MoreHorizontal size={14}/>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl border-hairline">
                <DropdownMenuItem onClick={() => setTab("compare")}>
                  <GitCompareArrows size={14} className="mr-2"/>Compare layouts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTab("constraints")}>
                  <ShieldAlert size={14} className="mr-2"/>Sit-with rules
                  {constraints.length > 0 && <span className="ml-auto text-xs text-soft">{constraints.length}</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTab("export")}>
                  <Download size={14} className="mr-2"/>Export &amp; print
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <TabsContent value="seating" className="mt-6 animate-tab-in">
            <SeatingView planId={plan.id} scenarioId={scenarioId ?? ""} guests={guests} tables={tables} assignments={assignments} constraints={constraints} refresh={refresh}
              onGoToGuests={() => setTab("guests")} onGoToTables={() => setTab("tables")}/>
          </TabsContent>
          <TabsContent value="guests" className="mt-6 animate-tab-in">
            <GuestsTab planId={plan.id} guests={guests} refresh={refresh} autoOpen={guestsAutoOpen} onAutoOpenHandled={() => setGuestsAutoOpen(null)}/>
          </TabsContent>
          <TabsContent value="tables" className="mt-6 animate-tab-in">
            <TablesTab planId={plan.id} scenarioId={scenarioId ?? ""} tables={tables} assignments={assignments} refresh={refresh} autoOpen={tablesAutoOpen} onAutoOpenHandled={() => setTablesAutoOpen(null)}/>
          </TabsContent>
          <TabsContent value="compare" className="mt-6 animate-tab-in">
            <CompareScenarios scenarios={scenarios} currentScenarioId={scenarioId} currentTables={tables} currentAssignments={assignments} guests={guests} constraints={constraints}/>
          </TabsContent>
          <TabsContent value="constraints" className="mt-6 animate-tab-in">
            <ConstraintsPanel planId={plan.id} guests={guests} constraints={constraints} refresh={refresh}/>
          </TabsContent>
          <TabsContent value="export" className="mt-6 animate-tab-in">
            <ExportPanel plan={plan} guests={guests} tables={tables} assignments={assignments}/>
          </TabsContent>
        </Tabs>
      </main>

      {autoOpen && (
        <AutoAssignDialog planId={plan.id} scenarioId={scenarioId ?? ""} guests={guests} tables={tables} assignments={assignments} constraints={constraints} onClose={() => { setAutoOpen(false); refresh(); toast.success("Done"); }}/>
      )}
    </div>
  );
};

export default Planner;

function UnderlineTab({ value, label, count }: { value: string; label: string; count?: number }) {
  return (
    <TabsTrigger
      value={value}
      className="relative bg-transparent rounded-none border-0 px-0 pt-2 pb-3 h-auto text-sm font-medium text-soft data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary"
    >
      {label}
      {count !== undefined && (
        <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-surface text-[10px] font-medium text-soft tabular-nums">{count}</span>
      )}
    </TabsTrigger>
  );
}