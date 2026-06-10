import { useEffect, useState } from "react";

/**
 * Honest saved state for the planner header. Reflects the last confirmed
 * database round-trip (initial snapshot or realtime change event) — never a
 * hardcoded reassurance. Goes terracotta when the browser is offline, because
 * that's exactly when a couple most needs to know their edits aren't landing.
 */
export function SavedIndicator({ lastSyncedAt }: { lastSyncedAt: number | null }) {
  const [, forceTick] = useState(0);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  // Re-render twice a minute so the relative label stays truthful.
  useEffect(() => {
    const t = setInterval(() => forceTick(n => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  if (!online) {
    return (
      <span className="hidden items-center gap-1.5 font-mono text-[11px] text-terracotta sm:inline-flex">
        <span className="size-1.5 rounded-full bg-terracotta" />
        Offline · changes not saving
      </span>
    );
  }

  if (!lastSyncedAt) return null;

  const secs = Math.max(0, Math.round((Date.now() - lastSyncedAt) / 1000));
  const label =
    secs < 45 ? "just now"
    : secs < 3600 ? `${Math.max(1, Math.round(secs / 60))}m ago`
    : `${Math.round(secs / 3600)}h ago`;

  return (
    <span className="hidden items-center gap-1.5 font-mono text-[11px] text-ink-2 sm:inline-flex">
      <span className="size-1.5 rounded-full bg-olive" />
      Saved · {label}
    </span>
  );
}
