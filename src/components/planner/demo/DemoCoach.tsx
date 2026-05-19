import { useEffect, useState } from "react";
import { X, Sparkles } from "lucide-react";

interface Props {
  tabKey: string;
  children: React.ReactNode;
}

/**
 * A small, dismissable nudge that sits above each demo tab. Per-tab dismissal
 * is sticky for the session so the same hint doesn't keep nagging.
 */
export function DemoCoach({ tabKey, children }: Props) {
  const storageKey = `demo:coach:${tabKey}:dismissed`;
  const [dismissed, setDismissed] = useState(true);

  // Read on mount on the client so SSR/hydration stays clean.
  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(storageKey) === "1");
    } catch { setDismissed(false); }
  }, [storageKey]);

  if (dismissed) return null;

  const dismiss = () => {
    try { window.sessionStorage.setItem(storageKey, "1"); } catch { /* */ }
    setDismissed(true);
  };

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border-l-[3px] border-terracotta border-y hairline border-r hairline bg-paper px-4 py-3 shadow-soft">
      <Sparkles size={14} className="mt-0.5 shrink-0 text-terracotta" />
      <div className="flex-1 text-[13px] leading-relaxed text-ink-2">{children}</div>
      <button
        onClick={dismiss}
        className="-mr-1 -mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-paper-2 hover:text-ink"
        aria-label="Dismiss tip"
      >
        <X size={13} />
      </button>
    </div>
  );
}

/** Clears dismissed flags so coach strips reappear after a demo reset. */
export function resetDemoCoaches() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith("demo:coach:")) keys.push(k);
    }
    keys.forEach(k => window.sessionStorage.removeItem(k));
  } catch { /* */ }
}