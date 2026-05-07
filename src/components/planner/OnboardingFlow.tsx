import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SmartGuestInput } from "./SmartGuestInput";
import { SmartTableInput } from "./SmartTableInput";
import { ConstraintsPanel } from "./ConstraintsPanel";
import { Upload, Download, ArrowLeft, ArrowRight, Wand2, LayoutGrid } from "lucide-react";
import { downloadGuestTemplate } from "@/lib/template";
import { SamplePreviewCard } from "./onboarding/SamplePreviewCard";
import type { Guest, ConstraintDef } from "@/lib/types";

type Step = 1 | 2 | 3 | 4;

interface Props {
  planId: string;
  scenarioId: string;
  planName?: string;
  planCode?: string;
  eventDate?: string | null;
  guestCount: number;
  tableCount: number;
  guests: Guest[];
  constraints: ConstraintDef[];
  onImport: () => void;
  onAutoAssign: () => void;
  onFinish: () => void;
  refresh: () => void;
}

/**
 * Editorial onboarding — the design's full-page two-column surface adapted
 * for our in-planner step flow. Left column: step label, Newsreader 56
 * headline, body, form section, footer with progress bars. Right column:
 * tilted illustrative card showing a sample seating chart.
 */
export function OnboardingFlow({
  planId,
  scenarioId,
  planName,
  planCode,
  eventDate,
  guestCount,
  tableCount,
  guests,
  constraints,
  onImport,
  onAutoAssign,
  onFinish,
  refresh,
}: Props) {
  const [step, setStep] = useState<Step>(
    guestCount > 0 ? (tableCount > 0 ? 3 : 2) : 1
  );

  const totalSteps = 4;
  const goNext = () => {
    if (step < 4) setStep((s) => (s + 1) as Step);
  };
  const goBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };
  const continueDisabled =
    (step === 1 && guestCount === 0) ||
    (step === 2 && tableCount === 0);

  return (
    <div className="overflow-hidden rounded-2xl border hairline bg-paper shadow-soft">
      <div className="grid lg:grid-cols-2">
        {/* Left — content */}
        <div className="flex flex-col justify-between gap-10 p-10 lg:p-16">
          <div>
            <div className="label-mono mb-5">
              STEP 0{step} — OF 0{totalSteps}
            </div>

            {step === 1 && (
              <>
                <h2 className="m-0 font-display text-[40px] leading-[1.02] tracking-[-0.02em] sm:text-[56px]">
                  Who&apos;s <span className="font-display-italic">coming?</span>
                </h2>
                <p className="mt-4 max-w-md text-[15px] leading-[1.55] text-ink-2 md:text-[16px]">
                  Paste names from your save-the-date list, type them in, or drop a
                  spreadsheet. We&apos;ll structure the rest.
                </p>

                <div className="mt-10">
                  <SmartGuestInput planId={planId} onDone={refresh} />

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t hairline pt-3">
                    <span className="text-xs text-ink-3">Have a spreadsheet?</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-hairline"
                      onClick={onImport}
                    >
                      <Upload size={14} className="mr-1.5" />
                      Import CSV / Excel
                    </Button>
                    <Button variant="ghost" size="sm" onClick={downloadGuestTemplate}>
                      <Download size={14} className="mr-1" />
                      Template
                    </Button>
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="m-0 font-display text-[40px] leading-[1.02] tracking-[-0.02em] sm:text-[56px]">
                  Add your <span className="font-display-italic">tables.</span>
                </h2>
                <p className="mt-4 max-w-md text-[15px] leading-[1.55] text-ink-2 md:text-[16px]">
                  Describe what you have — &ldquo;10 round tables of 8, plus a head table
                  for 6&rdquo;. We&apos;ll add them. You can arrange the room layout in the Room tab.
                </p>

                <div className="mt-10">
                  <SmartTableInput
                    planId={planId}
                    scenarioId={scenarioId}
                    existingCount={tableCount}
                    onDone={refresh}
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="m-0 font-display text-[40px] leading-[1.02] tracking-[-0.02em] sm:text-[56px]">
                  Any <span className="font-display-italic">non-negotiables?</span>
                </h2>
                <p className="mt-4 max-w-md text-[15px] leading-[1.55] text-ink-2 md:text-[16px]">
                  Divorced parents, cousins who don&apos;t speak, the friends who
                  absolutely must sit together. Add them now so auto-assign gets it right.
                </p>
                <div className="mt-8">
                  <ConstraintsPanel
                    planId={planId}
                    guests={guests}
                    constraints={constraints}
                    refresh={refresh}
                  />
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h2 className="m-0 font-display text-[40px] leading-[1.02] tracking-[-0.02em] sm:text-[56px]">
                  Time to <span className="font-display-italic">seat them.</span>
                </h2>
                <p className="mt-4 max-w-md text-[15px] leading-[1.55] text-ink-2 md:text-[16px]">
                  {guestCount > 0 && tableCount > 0
                    ? `${guestCount} guests, ${tableCount} tables${constraints.length > 0 ? `, ${constraints.length} rule${constraints.length === 1 ? "" : "s"}` : ""}. Want a first draft?`
                    : "Add guests and tables first — then come back to seat them."}
                </p>

                <div className="mt-10 grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={onAutoAssign}
                    disabled={guestCount === 0 || tableCount === 0}
                    className="rounded-xl border hairline bg-paper-2/40 p-5 text-left transition hover:border-terracotta/60 disabled:opacity-50 disabled:hover:border-hairline"
                  >
                    <Wand2 className="text-terracotta" size={22} />
                    <div className="mt-2 font-display text-lg">Do a first pass for me</div>
                    <div className="mt-1 text-sm text-ink-3">
                      Groups families together, respects your rules, fills tables evenly.
                    </div>
                  </button>
                  <button
                    onClick={onFinish}
                    className="rounded-xl border hairline bg-paper-2/40 p-5 text-left transition hover:border-terracotta/60"
                  >
                    <LayoutGrid className="text-olive" size={22} />
                    <div className="mt-2 font-display text-lg">I&apos;ll do it myself</div>
                    <div className="mt-1 text-sm text-ink-3">
                      Drag and drop guests onto tables. Take your time.
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer — Back / progress bars / Continue */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1}
              className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 transition hover:text-ink disabled:invisible"
            >
              <ArrowLeft size={13} /> Back
            </button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <span
                  key={i}
                  className="h-[2px] w-[22px]"
                  style={{
                    background:
                      i < step ? "hsl(var(--ink))" : "hsl(var(--hairline))",
                  }}
                />
              ))}
            </div>

            {step < 4 ? (
              <Button
                size="sm"
                className="rounded-full"
                onClick={goNext}
                disabled={continueDisabled}
              >
                {step === 3 && constraints.length === 0 ? "Skip" : "Continue"}
                <ArrowRight size={13} className="ml-1.5" />
              </Button>
            ) : (
              <span className="invisible inline-block w-[88px]" aria-hidden />
            )}
          </div>
        </div>

        {/* Right — illustrative card */}
        <div className="relative hidden min-h-[480px] lg:block">
          <SamplePreviewCard
            coupleName={planName ?? "Your wedding"}
            eventDate={eventDate}
            planCode={planCode}
          />
        </div>
      </div>
    </div>
  );
}
