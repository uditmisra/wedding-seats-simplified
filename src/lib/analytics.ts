import posthog from "posthog-js";

// Call on sign-in / sign-up so events are tied to the user.
export function identifyUser(id: string, email: string) {
  posthog.identify(id, { email });
}

// Call on sign-out.
export function resetUser() {
  posthog.reset();
}

// ── Typed event catalogue ──────────────────────────────────────────────────────

export const analytics = {
  // Auth
  signedIn:  ()                                            => posthog.capture("signed_in"),
  signedUp:  ()                                            => posthog.capture("signed_up"),

  // Plans
  planCreated: (p: { name: string })                       => posthog.capture("plan_created",       p),
  planOpened:  (p: { code: string; owned: boolean })       => posthog.capture("plan_opened",        p),
  planShared:  (p: { code: string })                       => posthog.capture("plan_shared",        p),

  // Guests
  guestsAdded:    (p: { count: number; method: "manual" | "paste" | "ai" }) =>
    posthog.capture("guests_added", p),

  // Tables
  tableAdded:     (p: { method: "manual" | "ai" })         => posthog.capture("table_added",        p),

  // Seating
  guestSeated:    (p: { via: "drag" | "dropdown" })        => posthog.capture("guest_seated",       p),
  autoAssignRun:  (p: { guestCount: number })              => posthog.capture("auto_assign_run",    p),

  // Constraints
  constraintAdded: (p: { kind: "must_sit" | "keep_apart" }) => posthog.capture("constraint_added", p),

  // Exports
  exportOpened:     ()                                     => posthog.capture("export_opened"),
  exportDownloaded: (p: { format: string })                => posthog.capture("export_downloaded",  p),

  // Revenue funnel — paywall impression → checkout → completion. `source`
  // tells us which gate converts (export button, dashboard, demo, etc.).
  paywallShown:     (p: { source: string })                => posthog.capture("paywall_shown",      p),
  checkoutOpened:   (p: { source: string })                => posthog.capture("checkout_opened",    p),
  paymentCompleted: ()                                     => posthog.capture("payment_completed"),
};
