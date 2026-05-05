import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Reverse-proxy all PostHog traffic through this edge function so
// ad blockers (which block us.i.posthog.com) don't drop analytics.
const POSTHOG_HOST = "https://us.i.posthog.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const url = new URL(req.url);
  // Strip the /functions/v1/ph-proxy prefix — everything after becomes the path
  const upstream = new URL(url.pathname.replace(/^\/functions\/v1\/ph-proxy/, "") || "/", POSTHOG_HOST);
  upstream.search = url.search;

  const headers = new Headers(req.headers);
  headers.set("host", "us.i.posthog.com");

  const response = await fetch(upstream.toString(), {
    method: req.method,
    headers,
    body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
  });

  const responseHeaders = new Headers(response.headers);
  Object.entries(cors).forEach(([k, v]) => responseHeaders.set(k, v));

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
});
