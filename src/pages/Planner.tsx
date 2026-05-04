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
import { ScenarioSwitcher } from "@/components/planner/ScenarioSwitcher";
import { CompareScenarios } from "@/components/planner/CompareScenarios";
import { Link as LinkIcon, Check, ArrowLeft, Wand2, MoreHorizontal, GitCompareArrows, ShieldAlert, Download, Mail, Bookmark, Heart } from "lucide-react";
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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
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
    <div className="min-h-screen" style={{ background: "var(--gradient-soft)" }}>
      <header className="border-b border-border/60 bg-background/70 backdrop-blur sticky top-0 z-30">
        <div className="container py-3 flex items-center gap-3">
          <Link to="/" aria-label="Home" className="text-muted-foreground hover:text-foreground"><ArrowLeft size={16}/></Link>
          {editingName ? (
            <Input autoFocus value={plan.name} onChange={e => renamePlan(e.target.value)} onBlur={() => setEditingName(false)} className="h-8 w-64 font-display text-lg"/>
          ) : (
            <button onClick={() => setEditingName(true)} className="font-display text-xl truncate hover:underline underline-offset-4 decoration-primary/40">{plan.name}</button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {scenarioId && (
              <ScenarioSwitcher
                planId={plan.id}
                scenarios={scenarios}
                scenarioId={scenarioId}
                setScenarioId={setScenarioId}
                tables={tables}
                assignments={assignments}
                refresh={refresh}
              />
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" title="Save and share this plan">
                  <Heart size={14} className="mr-1.5"/>Save & share
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <div className="space-y-3">
                  <div>
                    <div className="font-display text-base">You're all set</div>
                    <p className="text-xs text-muted-foreground mt-1">Your plan saves automatically. Bookmark this page or send the link to yourself so you can pop back in anytime.</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={copyLink}>
                    {copied ? <Check size={14} className="mr-2"/> : <LinkIcon size={14} className="mr-2"/>}
                    {copied ? "Link copied" : "Copy link"}
                  </Button>
                  <Button asChild variant="outline" size="sm" className="w-full justify-start">
                    <a href={`mailto:?subject=${encodeURIComponent(`Our seating plan: ${plan.name}`)}&body=${encodeURIComponent(`Here's the link to our seating plan — open it any time:\n\n${typeof window !== "undefined" ? window.location.href : ""}`)}`}>
                      <Mail size={14} className="mr-2"/>Email me the link
                    </a>
                  </Button>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-border/40">
                    <Bookmark size={12}/> Tip: press ⌘+D (or Ctrl+D) to bookmark this page.
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {assignments.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setTab("export")} title="Print place cards, seating charts and more">
                <Download size={14} className="mr-1.5"/>Export
              </Button>
            )}
            <Button size="sm" onClick={() => setAutoOpen(true)} className="shadow-sm"><Wand2 size={14} className="mr-1.5"/>Seat them for me</Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
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

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between gap-2">
            <TabsList className="bg-card/60 border border-border/60 h-11">
              <TabsTrigger value="seating">Seating</TabsTrigger>
              <TabsTrigger value="guests">Guests <span className="ml-1.5 text-xs text-muted-foreground">{guests.length}</span></TabsTrigger>
              <TabsTrigger value="tables">Tables <span className="ml-1.5 text-xs text-muted-foreground">{tables.length}</span></TabsTrigger>
            </TabsList>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-11 w-11 p-0" aria-label="More">
                  <MoreHorizontal size={18}/>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setTab("compare")}>
                  <GitCompareArrows size={14} className="mr-2"/>Compare layouts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTab("constraints")}>
                  <ShieldAlert size={14} className="mr-2"/>Sit-with rules
                  {constraints.length > 0 && <span className="ml-auto text-xs text-muted-foreground">{constraints.length}</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTab("export")}>
                  <Download size={14} className="mr-2"/>Export &amp; print
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <TabsContent value="seating" className="mt-4">
            <SeatingView planId={plan.id} scenarioId={scenarioId ?? ""} guests={guests} tables={tables} assignments={assignments} constraints={constraints} refresh={refresh}
              onGoToGuests={() => setTab("guests")} onGoToTables={() => setTab("tables")}/>
          </TabsContent>
          <TabsContent value="guests" className="mt-4">
            <GuestsTab planId={plan.id} guests={guests} refresh={refresh} autoOpen={guestsAutoOpen} onAutoOpenHandled={() => setGuestsAutoOpen(null)}/>
          </TabsContent>
          <TabsContent value="tables" className="mt-4">
            <TablesTab planId={plan.id} scenarioId={scenarioId ?? ""} tables={tables} assignments={assignments} refresh={refresh} autoOpen={tablesAutoOpen} onAutoOpenHandled={() => setTablesAutoOpen(null)}/>
          </TabsContent>
          <TabsContent value="compare" className="mt-4">
            <CompareScenarios scenarios={scenarios} currentScenarioId={scenarioId} currentTables={tables} currentAssignments={assignments} guests={guests} constraints={constraints}/>
          </TabsContent>
          <TabsContent value="constraints" className="mt-4">
            <ConstraintsPanel planId={plan.id} guests={guests} constraints={constraints} refresh={refresh}/>
          </TabsContent>
          <TabsContent value="export" className="mt-4">
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