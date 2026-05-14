import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Reverse-proxy all PostHog traffic through this edge function so ad
// blockers (which block us.i.posthog.com) don't drop analytics.
//
// The frontend points posthog-js's api_host at
//   https://<project>.supabase.co/functions/v1/ph-proxy
// PostHog SDK then hits sub-paths like /e/, /decide/, /array/, /capture/,
// /engage/. We strip the function prefix and forward to the real host.

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
  // Some Supabase deployments deliver req.url with the /functions/v1/<name>
  // prefix included; others deliver only the sub-path. Handle both.
  let path = url.pathname.replace(/^\/functions\/v1\/ph-proxy/, "");
  if (!path) path = "/";

  const upstream = new URL(path + url.search, POSTHOG_HOST);

  // Forward only the headers PostHog actually needs. Specifically, do NOT
  // forward the Authorization header (it's a Supabase anon JWT, not for
  // PostHog) or our custom Host (Deno can't override it anyway).
  const headers = new Headers();
  for (const [k, v] of req.headers) {
    const lower = k.toLowerCase();
    if (lower === "content-type" || lower === "user-agent" || lower === "accept" || lower === "accept-encoding") {
      headers.set(k, v);
    }
  }

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
