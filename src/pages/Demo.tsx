import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SeatingView } from "@/components/planner/SeatingView";
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

export default function Demo() {
  const initial = useMemo(() => loadDemoState(), []);
  const [guests, setGuests] = useState(initial.guests);
  const [tables, setTables] = useState(initial.tables);
  const [assignments, setAssignments] = useState(initial.assignments);
  const [constraints] = useState(initial.constraints);
  const [autoOpen, setAutoOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const navigate = useNavigate();
  const { isPaid, loading: unlockLoading } = useUnlock();
  const startChart = () => {
    if (unlockLoading) return;
    isPaid ? navigate("/dashboard") : setUpgradeOpen(true);
  };

  // Persist state across refreshes within the session
  useEffect(() => {
    saveDemoState({ guests, tables, assignments, constraints });
  }, [guests, tables, assignments, constraints]);

  const reset = () => {
    const fresh = resetDemoState();
    setGuests(fresh.guests);
    setTables(fresh.tables);
    setAssignments(fresh.assignments);
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
        "description": "Interactive demo of Wedding Seater. Drag guests onto tables, resolve seating conflicts, and run auto-seat — using a sample wedding (Emma & James, 120 guests). No account needed.",
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
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[13px] font-medium text-paper transition hover:bg-ink-2"
            >
              <Sparkles size={13} className="text-butter" />
              <span>{isPaid ? "Open dashboard" : "Start your chart"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main canvas */}
      <main className="container flex-1 py-6">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <h1 className="m-0 font-display text-[28px] leading-none">
              Emma &amp; James <span className="font-display-italic text-ink-3">— a sample wedding</span>
            </h1>
            <p className="mt-1.5 text-[13px] text-ink-2">
              Drag a guest to a seat. Try the conflict at the head table — Linda and Robert are flagged "not near."
              Or hit auto-seat and watch it solve.
            </p>
          </div>
        </div>

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
          roomConfig={DEMO_PLAN.room_config}
          onAutoAssign={() => setAutoOpen(true)}
        />

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
      <ConversionBar onUnlock={startChart} isPaid={isPaid} />

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        headline={<>Ready to plan your <em className="font-display-italic text-terracotta">own wedding?</em></>}
        subhead="One £10 payment unlocks unlimited plans, every PDF export, and sharing — for your account, forever. No subscription."
      />
    </div>
  );
}

function ConversionBar({ onUnlock, isPaid }: { onUnlock: () => void; isPaid: boolean }) {
  return (
    <div className="sticky bottom-0 border-t hairline bg-paper/95 backdrop-blur-md">
      <div className="container flex h-16 items-center gap-4">
        <div className="hidden min-w-0 flex-1 sm:block">
          <div className="font-display text-[17px] leading-tight">
            {isPaid ? (
              <>You're <span className="font-display-italic">unlocked.</span></>
            ) : (
              <>You sorted Emma &amp; James's wedding. <span className="font-display-italic">Try it with yours.</span></>
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
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-paper transition hover:bg-ink-2"
        >
          <span>{isPaid ? "Open dashboard" : "Start my chart"}</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
