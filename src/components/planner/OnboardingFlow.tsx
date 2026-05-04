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
    { n: 1 as Step, label: "Guests", icon: Users, done: guestCount > 0 },
    { n: 2 as Step, label: "Tables", icon: LayoutGrid, done: tableCount > 0 },
        { n: 3 as Step, label: "Seat everyone", icon: Wand2, done: false },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-[var(--shadow-soft)] space-y-6">
      {/* Progress rail */}
      <ol className="flex items-center gap-2 sm:gap-4 text-sm">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.n;
          const isDone = s.done;
          return (
            <li key={s.n} className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <button
                onClick={() => setStep(s.n)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition ${
                  isActive ? "bg-primary text-primary-foreground border-primary"
                  : isDone ? "bg-sage/20 text-foreground border-sage/40"
                  : "bg-background text-muted-foreground border-border/60 hover:text-foreground"
                }`}
              >
                {isDone ? <Check size={14}/> : <Icon size={14}/>}
                <span className="font-medium">{s.label}</span>
                {isDone && s.n === 1 && <span className="text-xs opacity-70">· {guestCount}</span>}
                {isDone && s.n === 2 && <span className="text-xs opacity-70">· {tableCount}</span>}
              </button>
              {i < steps.length - 1 && <div className="h-px flex-1 bg-border/60"/>}
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-2xl md:text-3xl">Who's coming?</h2>
            <p className="text-muted-foreground mt-1">Paste or type names — we'll structure the rest.</p>
          </div>
          <SmartGuestInput planId={planId} onDone={refresh}/>

          <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-border/40">
            <span className="text-xs text-muted-foreground">Have a spreadsheet?</span>
            <Button variant="outline" size="sm" onClick={onImport}><Upload size={14} className="mr-1.5"/>Import CSV / Excel</Button>
            <Button variant="ghost" size="sm" onClick={downloadGuestTemplate}><Download size={14} className="mr-1"/>Template</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-2xl md:text-3xl">Set up your room</h2>
            <p className="text-muted-foreground mt-1">Try: "10 rounds of 8 + a head table for 6".</p>
          </div>
          <SmartTableInput planId={planId} scenarioId={scenarioId} existingCount={tableCount} onDone={refresh}/>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-2xl md:text-3xl">You're ready 🎉</h2>
            <p className="text-muted-foreground mt-1">
              {guestCount > 0 && tableCount > 0
                ? `${guestCount} guests, ${tableCount} tables. Want us to take a first pass?`
                : "Add guests and tables first, then come back."}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={onAutoAssign}
              disabled={guestCount === 0 || tableCount === 0}
              className="text-left rounded-xl border border-border/60 hover:border-primary/60 disabled:opacity-50 disabled:hover:border-border/60 transition p-5 bg-background/50"
            >
              <Wand2 className="text-primary" size={22}/>
              <div className="font-display text-lg mt-2">Seat them for me</div>
              <div className="text-sm text-muted-foreground mt-1">Keeps families together, honours your sit-with rules, fills tables evenly.</div>
            </button>
            <button
              onClick={onFinish}
              className="text-left rounded-xl border border-border/60 hover:border-primary/60 transition p-5 bg-background/50"
            >
              <LayoutGrid className="text-primary" size={22}/>
              <div className="font-display text-lg mt-2">I'll seat them myself</div>
              <div className="text-sm text-muted-foreground mt-1">Drag and drop guests onto tables — your call.</div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}