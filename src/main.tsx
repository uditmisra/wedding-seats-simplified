import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import App from "./App.tsx";
import "./index.css";

posthog.init("phc_sUDztZHpx2jDrHhuRkTYsUU8bPshyNVt4R4rmFUff2Ry", {
  api_host: "https://bqacaxesfvbcxbmqdemz.supabase.co/functions/v1/ph-proxy",
  ui_host: "https://us.posthog.com",
  person_profiles: "identified_only",
  capture_pageview: true,
  capture_pageleave: true,
});

createRoot(document.getElementById("root")!).render(<App />);
