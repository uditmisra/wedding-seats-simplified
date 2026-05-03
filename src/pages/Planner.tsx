import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { usePlanData } from "@/hooks/usePlanData";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { StatsBar } from "@/components/planner/StatsBar";
import { GuestsTab } from "@/components/planner/GuestsTab";
import { TablesTab } from "@/components/planner/TablesTab";
import { SeatingView } from "@/components/planner/SeatingView";
import { ConstraintsPanel } from "@/components/planner/ConstraintsPanel";
import { ExportPanel } from "@/components/planner/ExportPanel";
import { AutoAssignDialog } from "@/components/planner/AutoAssignDialog";
import { OnboardingFlow } from "@/components/planner/OnboardingFlow";
import { Sparkles, Link as LinkIcon, Check, ArrowLeft, Wand2 } from "lucide-react";
import { toast } from "sonner";

const Planner = () => {
  const { code } = useParams();
  const { plan, setPlan, guests, tables, assignments, constraints, loading, notFound, refresh } = usePlanData(code);
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
        <div className="container py-3 flex items-center gap-3 flex-wrap">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={14}/>Home</Link>
          <Sparkles className="text-primary" size={18}/>
          {editingName ? (
            <Input autoFocus value={plan.name} onChange={e => renamePlan(e.target.value)} onBlur={() => setEditingName(false)} className="h-8 w-64 font-display text-lg"/>
          ) : (
            <button onClick={() => setEditingName(true)} className="font-display text-xl truncate hover:underline">{plan.name}</button>
          )}
          <span className="text-xs text-muted-foreground hidden sm:inline">code: {plan.code}</span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={copyLink}>
              {copied ? <><Check size={14} className="mr-1"/>Copied</> : <><LinkIcon size={14} className="mr-1"/>Share link</>}
            </Button>
            <Button size="sm" onClick={() => setAutoOpen(true)}><Wand2 size={14} className="mr-1"/>Auto-assign</Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {showOnboarding ? (
          <OnboardingFlow
            planId={plan.id}
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
          <TabsList className="bg-card/60 border border-border/60 h-11">
            <TabsTrigger value="seating">Seating</TabsTrigger>
            <TabsTrigger value="guests">Guests ({guests.length})</TabsTrigger>
            <TabsTrigger value="tables">Tables ({tables.length})</TabsTrigger>
            <TabsTrigger value="constraints">Constraints ({constraints.length})</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="seating" className="mt-4">
            <SeatingView planId={plan.id} guests={guests} tables={tables} assignments={assignments} constraints={constraints} refresh={refresh}
              onGoToGuests={() => setTab("guests")} onGoToTables={() => setTab("tables")}/>
          </TabsContent>
          <TabsContent value="guests" className="mt-4">
            <GuestsTab planId={plan.id} guests={guests} refresh={refresh} autoOpen={guestsAutoOpen} onAutoOpenHandled={() => setGuestsAutoOpen(null)}/>
          </TabsContent>
          <TabsContent value="tables" className="mt-4">
            <TablesTab planId={plan.id} tables={tables} assignments={assignments} refresh={refresh} autoOpen={tablesAutoOpen} onAutoOpenHandled={() => setTablesAutoOpen(null)}/>
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
        <AutoAssignDialog planId={plan.id} guests={guests} tables={tables} assignments={assignments} constraints={constraints} onClose={() => { setAutoOpen(false); refresh(); toast.success("Done"); }}/>
      )}
    </div>
  );
};

export default Planner;