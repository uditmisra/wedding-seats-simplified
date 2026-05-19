import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SeatingView } from "@/components/planner/SeatingView";
import { VenueTab } from "@/components/planner/VenueTab";
import { ConstraintsPanel } from "@/components/planner/ConstraintsPanel";
import { AutoAssignDialog } from "@/components/planner/AutoAssignDialog";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Sparkles, RotateCcw, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  DEMO_PLAN,
  DEMO_PLAN_ID,
  DEMO_SCENARIO_ID,
} from "@/lib/demo/sampleData";
import { loadDemoState, saveDemoState, resetDemoState } from "@/lib/demo/demoStore";
import { useUnlock } from "@/hooks/useUnlock";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/siteUrl";
import { useSeoHead } from "@/lib/useSeoHead";
import { DemoTabs, type DemoTabDef } from "@/components/planner/demo/DemoTabs";
import { DemoCoach, resetDemoCoaches } from "@/components/planner/demo/DemoCoach";

const TABS: DemoTabDef[] = [
  { value: "seating", numeral: "I", label: "Seating" },
  { value: "venue",   numeral: "II", label: "Venue",  secondary: true },
  { value: "rules",   numeral: "III", label: "Rules", secondary: true },
];

export default function Demo() {
  useSeoHead({
    title: "Try Wedding Seater — Drag, design, auto-seat (live demo)",
    description: "Play with a real wedding seating chart. Drag guests, design the room, add rules, run auto-seat — no account, no signup. Emma & James, 120 guests.",
    canonical: `${SITE_URL}/demo`,
    ogImage: `${SITE_URL}/brand/wedding-seater-mark.png`,
  });
  const initial = useMemo(() => loadDemoState(), []);
  const [guests, setGuests] = useState(initial.guests);
  const [tables, setTables] = useState(initial.tables);
  const [assignments, setAssignments] = useState(initial.assignments);
  const [constraints, setConstraints] = useState(initial.constraints);
  const [roomConfig, setRoomConfig] = useState(initial.roomConfig);
  const [tab, setTab] = useState<string>("seating");
  const [autoOpen, setAutoOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const interactionBaselineRef = useRef(true); // skip the first state sync
  const navigate = useNavigate();
  const { isPaid, loading: unlockLoading } = useUnlock();
  const startChart = () => {
    if (unlockLoading) return;
    isPaid ? navigate("/dashboard") : setUpgradeOpen(true);
  };

  // Persist state across refreshes within the session
  useEffect(() => {
    saveDemoState({ guests, tables, assignments, constraints, roomConfig });
  }, [guests, tables, assignments, constraints, roomConfig]);

  // Flip hasInteracted the first time the user changes anything (drag,
  // table move, auto-seat, fixture move, rule added). The first effect run after mount is the
  // baseline — ignore it.
  useEffect(() => {
    if (interactionBaselineRef.current) {
      interactionBaselineRef.current = false;
      return;
    }
    if (!hasInteracted) setHasInteracted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, tables, constraints, roomConfig]);

  const reset = () => {
    const fresh = resetDemoState();
    setGuests(fresh.guests);
    setTables(fresh.tables);
    setAssignments(fresh.assignments);
    setConstraints(fresh.constraints);
    setRoomConfig(fresh.roomConfig);
    setTab("seating");
    setHasInteracted(false);
    interactionBaselineRef.current = true;
    resetDemoCoaches();
    toast.success("Demo reset to a fresh wedding.");
  };

  return (
    <div className="paper-grain min-h-screen flex flex-col">
      <JsonLd id="demo-software" schema={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Wedding Seater — Interactive Demo",
        "url": `${SITE_URL}/demo`,
        "applicationCategory": "LifestyleApplication",
        "operatingSystem": "Web browser",
        "description": "Interactive demo of Wedding Seater. Drag guests onto tables, design the venue, add must-sit and keep-apart rules, and run auto-seat — using a sample wedding (Emma & James, 120 guests). No account needed.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "GBP",
        },
      }} />
      {/* Top banner — sample data pill + reset + start-your-chart CTA */}
      <header className="sticky top-0 z-30 border-b hairline bg-paper/90 backdrop-blur-md">
        <div className="container flex h-14 items-center gap-4">
          <Link to="/" className="font-display text-[18px] leading-none">
            Wedding Seater
            <span className="ml-1 inline-block size-1.5 -translate-y-0.5 rounded-full bg-terracotta align-middle" />
          </Link>

          <span className="hidden h-5 w-px bg-hairline sm:block" aria-hidden />

          <span className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full bg-butter/40 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink">
              Sample data
            </span>
            <span className="font-mono text-[11px] text-ink-2">
              Emma &amp; James · 120 guests · your changes won't save
            </span>
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper px-3 py-1.5 text-[12px] text-ink-2 transition hover:text-ink"
              title="Reset the demo to its starting state"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              onClick={startChart}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[13px] font-medium text-paper transition hover:bg-ink-2"
            >
              <Sparkles size={13} className="text-butter" />
              <span>{isPaid ? "Open dashboard" : "Start your chart"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main canvas */}
      <main className="container flex-1 py-3 sm:py-6">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <h1 className="m-0 font-display text-[22px] leading-tight sm:text-[28px] sm:leading-none">
              Emma &amp; James <span className="font-display-italic text-ink-3">— a sample wedding</span>
            </h1>
          </div>
        </div>

        <div className="mb-3">
          <DemoTabs tabs={TABS} value={tab} onChange={setTab} forceExpanded={hasInteracted} />
        </div>

        {tab === "seating" && (
          <>
            <DemoCoach tabKey="seating">
              Drag <span className="font-medium text-ink">Linda</span> off the head table — she and Robert are flagged "not near".
              Or hit <span className="font-medium text-ink">Auto-seat</span> to watch it solve in two seconds.
              {!hasInteracted && <> Once you start, the <span className="font-medium text-ink">Venue</span> and <span className="font-medium text-ink">Rules</span> tabs appear too.</>}
            </DemoCoach>
            <SeatingView
              planId={DEMO_PLAN_ID}
              scenarioId={DEMO_SCENARIO_ID}
              guests={guests}
              tables={tables}
              assignments={assignments}
              setAssignments={setAssignments}
              setTables={setTables}
              constraints={constraints}
              refresh={() => {}}
              canEdit={true}
              demoMode={true}
              roomConfig={roomConfig}
              onAutoAssign={() => setAutoOpen(true)}
            />
          </>
        )}

        {tab === "venue" && (
          <>
            <DemoCoach tabKey="venue">
              Drag a table anywhere in the room. Add a new one from the left rail — try the name "Table 1" and watch it auto-bump to keep names unique.
              Click the bar or DJ to move or delete them.
            </DemoCoach>
            <VenueTab
              planId={DEMO_PLAN_ID}
              scenarioId={DEMO_SCENARIO_ID}
              tables={tables}
              assignments={assignments}
              roomConfig={roomConfig}
              canEdit={true}
              refresh={() => {}}
              onSavedRoom={setRoomConfig}
              demoMode={true}
              setTables={setTables}
            />
          </>
        )}

        {tab === "rules" && (
          <>
            <DemoCoach tabKey="rules">
              Add a <span className="font-medium text-ink">keep-apart</span> rule between any two guests, then jump back to <span className="font-medium text-ink">Seating</span>.
              Seat them at the same table and you'll see a conflict ring appear.
            </DemoCoach>
            <ConstraintsPanel
              planId={DEMO_PLAN_ID}
              guests={guests}
              constraints={constraints}
              refresh={() => {}}
              onAutoAssign={() => setAutoOpen(true)}
              demoMode={true}
              setConstraints={setConstraints}
            />
          </>
        )}

        {autoOpen && (
          <AutoAssignDialog
            planId={DEMO_PLAN_ID}
            scenarioId={DEMO_SCENARIO_ID}
            guests={guests}
            tables={tables}
            assignments={assignments}
            setAssignments={setAssignments}
            constraints={constraints}
            demoMode={true}
            onClose={() => setAutoOpen(false)}
          />
        )}
      </main>

      {/* Persistent conversion bar */}
      <ConversionBar onUnlock={startChart} isPaid={isPaid} hasInteracted={hasInteracted} />

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        headline={<>Ready to plan your <em className="font-display-italic text-terracotta">own wedding?</em></>}
        subhead="One £10 payment unlocks unlimited plans, every PDF export, and sharing — for your account, forever. No subscription."
      />
    </div>
  );
}

function ConversionBar({ onUnlock, isPaid, hasInteracted }: { onUnlock: () => void; isPaid: boolean; hasInteracted: boolean }) {
  return (
    <div
      className="sticky bottom-0 border-t hairline bg-paper/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="container flex h-14 items-center gap-4 sm:h-16">
        <div className="hidden min-w-0 flex-1 sm:block">
          <div className="font-display text-[17px] leading-tight">
            {isPaid ? (
              <>You're <span className="font-display-italic">unlocked.</span></>
            ) : hasInteracted ? (
              <>You sorted Emma &amp; James's wedding. <span className="font-display-italic">Try it with yours.</span></>
            ) : (
              <>Get a <span className="font-display-italic">feel for it.</span> When you're ready, start your own.</>
            )}
          </div>
          <div className="text-[12px] text-ink-2">
            {isPaid
              ? "Head to your dashboard to start a new chart."
              : "Same tool, your real guests, your venue. £10 lifetime — less than one place setting."}
          </div>
        </div>
        <button
          onClick={onUnlock}
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-paper transition hover:bg-ink-2 sm:px-5 sm:py-2.5 sm:text-[14px]"
        >
          <span>{isPaid ? "Open dashboard" : "Start my chart"}</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
