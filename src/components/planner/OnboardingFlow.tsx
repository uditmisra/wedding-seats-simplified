import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SmartGuestInput } from "./SmartGuestInput";
import { SmartTableInput } from "./SmartTableInput";
import { Check, Users, LayoutGrid, Wand2, Upload, Download } from "lucide-react";
import { downloadGuestTemplate } from "@/lib/template";

type Step = 1 | 2 | 3;

interface Props {
  planId: string;
  scenarioId: string;
  guestCount: number;
  tableCount: number;
  onImport: () => void;
  onAutoAssign: () => void;
  onFinish: () => void;
  refresh: () => void;
}

export function OnboardingFlow({ planId, scenarioId, guestCount, tableCount, onImport, onAutoAssign, onFinish, refresh }: Props) {
  const [step, setStep] = useState<Step>(guestCount > 0 ? (tableCount > 0 ? 3 : 2) : 1);

  const steps = [
    { n: 1 as Step, numeral: "I", label: "Guests", icon: Users, done: guestCount > 0 },
    { n: 2 as Step, numeral: "II", label: "Tables", icon: LayoutGrid, done: tableCount > 0 },
    { n: 3 as Step, numeral: "III", label: "Seat everyone", icon: Wand2, done: false },
  ];

  return (
    <div className="rounded-2xl border hairline bg-card p-6 md:p-8 shadow-soft space-y-6">
      {/* Progress rail — chapter numerals */}
      <ol className="flex flex-wrap items-center gap-2 text-sm sm:gap-4">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.n;
          const isDone = s.done;
          return (
            <li key={s.n} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
              <button
                onClick={() => setStep(s.n)}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 transition ${
                  isActive ? "border-ink bg-ink text-paper"
                  : isDone ? "border-olive/40 bg-olive/15 text-ink"
                  : "border-hairline bg-paper text-ink-3 hover:text-ink"
                }`}
              >
                <span className={`font-display-italic text-[12px] ${isActive ? "text-paper" : isDone ? "text-olive" : "text-terracotta"}`}>
                  {s.numeral}
                </span>
                {isDone ? <Check size={14} /> : <Icon size={14} />}
                <span className="font-medium">{s.label}</span>
                {isDone && s.n === 1 && <span className="font-mono text-[10px] opacity-70">· {guestCount}</span>}
                {isDone && s.n === 2 && <span className="font-mono text-[10px] opacity-70">· {tableCount}</span>}
              </button>
              {i < steps.length - 1 && <div className="h-px flex-1 bg-hairline" />}
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-2xl md:text-[32px]">
              Add your <span className="font-display-italic">guests.</span>
            </h2>
            <p className="mt-1 text-ink-3">Paste names from your save-the-date list, type them in, or drop a spreadsheet.</p>
          </div>
          <SmartGuestInput planId={planId} onDone={refresh} />

          <div className="flex flex-wrap items-center gap-2 border-t hairline pt-3">
            <span className="text-xs text-ink-3">Have a spreadsheet?</span>
            <Button variant="outline" size="sm" className="rounded-full border-hairline" onClick={onImport}>
              <Upload size={14} className="mr-1.5" />Import CSV / Excel
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadGuestTemplate}>
              <Download size={14} className="mr-1" />Template
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-2xl md:text-[32px]">
              Set up the <span className="font-display-italic">room.</span>
            </h2>
            <p className="mt-1 text-ink-3">Type how the room looks — &ldquo;10 round tables of 8, plus a head table for 6&rdquo; — we&apos;ll lay it out.</p>
          </div>
          <SmartTableInput planId={planId} scenarioId={scenarioId} existingCount={tableCount} onDone={refresh} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-2xl md:text-[32px]">
              Time to <span className="font-display-italic">seat them.</span>
            </h2>
            <p className="mt-1 text-ink-3">
              {guestCount > 0 && tableCount > 0
                ? `${guestCount} guests, ${tableCount} tables. Want a first draft in a few seconds?`
                : "Add guests and tables first — then come back to seat them."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={onAutoAssign}
              disabled={guestCount === 0 || tableCount === 0}
              className="rounded-xl border hairline bg-paper-2/40 p-5 text-left transition hover:border-terracotta/60 disabled:opacity-50 disabled:hover:border-hairline"
            >
              <Wand2 className="text-terracotta" size={22} />
              <div className="mt-2 font-display text-lg">Do a first pass for me</div>
              <div className="mt-1 text-sm text-ink-3">Groups families together, keeps the people who shouldn&apos;t sit near each other apart, fills tables evenly.</div>
            </button>
            <button
              onClick={onFinish}
              className="rounded-xl border hairline bg-paper-2/40 p-5 text-left transition hover:border-terracotta/60"
            >
              <LayoutGrid className="text-olive" size={22} />
              <div className="mt-2 font-display text-lg">I&apos;ll do it myself</div>
              <div className="mt-1 text-sm text-ink-3">Drag and drop guests onto tables. Take your time.</div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}