import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import App from "./App.tsx";
import "./index.css";

// PostHog — going direct to us.i.posthog.com for now. We had a Supabase
// edge function proxy (ph-proxy) to defeat ad blockers, but Supabase's
// gateway rejects requests without an `apikey` header even when
// verify_jwt is false, so PostHog requests were 401-ing before reaching
// the function. The proxy code is still in supabase/functions/ph-proxy;
// re-enable here once we either send the apikey header through posthog-js's
// xhr_headers OR set up a custom domain in front of the function.
posthog.init("phc_sUDztZHpx2jDrHhuRkTYsUU8bPshyNVt4R4rmFUff2Ry", {
  api_host: "https://us.i.posthog.com",
  ui_host: "https://us.posthog.com",
  person_profiles: "identified_only",
  capture_pageview: true,
  capture_pageleave: true,
  loaded: (ph) => {
    // Make PostHog reachable from devtools — paste posthog.capture("test")
    // into the console to verify events are flowing.
    (window as unknown as { posthog?: typeof ph }).posthog = ph;
  },
});

createRoot(document.getElementById("root")!).render(<App />);
