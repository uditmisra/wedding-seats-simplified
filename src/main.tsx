import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import App from "./App.tsx";
import "./index.css";

// Route PostHog through the ph-proxy edge function so ad blockers (which
// block us.i.posthog.com aggressively) don't drop analytics. Supabase's
// gateway requires an `apikey` header even when verify_jwt is false, so
// we forward the anon key on every PostHog request — this is the header
// the gateway needs to accept the call before it reaches the function.
// ui_host stays pointed at the public PostHog UI for in-app toolbar links.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

posthog.init("phc_sUDztZHpx2jDrHhuRkTYsUU8bPshyNVt4R4rmFUff2Ry", {
  api_host: `${SUPABASE_URL}/functions/v1/ph-proxy`,
  ui_host: "https://us.posthog.com",
  request_headers: { apikey: SUPABASE_ANON },
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
