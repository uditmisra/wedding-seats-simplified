import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GUESTS_TOOL = {
  type: "function",
  function: {
    name: "extract_guests",
    description: "Extract a structured list of wedding guests from free-form text. Split couples like 'John & Sarah Smith' into two guests sharing the same party. '+2 kids' means add 2 child guests in the same party. Use party to group people that came together (couples, families). Side is bride/groom/partner1/partner2 if mentioned. RSVP must be one of: pending, attending, maybe, declined. Map yes/coming -> attending, no/regrets -> declined.",
    parameters: {
      type: "object",
      properties: {
        guests: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              party: { type: "string" },
              side: { type: "string" },
              rsvp: { type: "string", enum: ["pending", "attending", "maybe", "declined"] },
              meal: { type: "string" },
              is_kid: { type: "boolean" },
              accessibility: { type: "string" },
              notes: { type: "string" },
            },
            required: ["name"],
          },
        },
      },
      required: ["guests"],
    },
  },
};

const TABLES_TOOL = {
  type: "function",
  function: {
    name: "extract_tables",
    description: "Extract a list of wedding reception tables from a free-form description. Expand quantities (e.g. '10 round tables of 8' => ten entries). Default capacity 8 if unstated. Default shape 'round'. Use shape 'head' for a head/sweetheart table. Generate friendly names like 'Round 1', 'Long 1', 'Head Table'.",
    parameters: {
      type: "object",
      properties: {
        tables: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              shape: { type: "string", enum: ["round", "rectangle", "square", "long", "head"] },
              capacity: { type: "integer", minimum: 1, maximum: 30 },
            },
            required: ["name", "shape", "capacity"],
          },
        },
      },
      required: ["tables"],
    },
  },
};

const MAPPING_TOOL = {
  type: "function",
  function: {
    name: "map_columns",
    description: "Map spreadsheet column headers to known guest fields. Use null when no good match. Available fields: name, party, rsvp, meal, side, is_kid, accessibility, notes, must_with, must_not_with.",
    parameters: {
      type: "object",
      properties: {
        mapping: {
          type: "object",
          description: "Object whose keys are the original headers and whose values are the matching field name (or null).",
          additionalProperties: { type: ["string", "null"] },
        },
      },
      required: ["mapping"],
    },
  },
};

const SYSTEM = "You are a friendly wedding planning assistant. Extract structured data carefully and conservatively. If unsure about an optional field, omit it rather than guessing.";

const MAX_BYTES = 64 * 1024;
const MAX_INPUT_CHARS = 10_000;
const MAX_HEADERS = 50;
const MAX_SAMPLES = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify the caller has a valid Supabase session to prevent API-credit abuse.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    // getUser() validates the JWT; it returns an error for malformed tokens but
    // returns null user (no error) for valid anon-key requests — both are fine.
    const { error: authErr } = await supabase.auth.getUser();
    if (authErr && authErr.message !== "Auth session missing!") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Enforce request size cap
    const buf = await req.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Payload too large" }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    let body: { mode?: string; input?: unknown };
    try { body = JSON.parse(new TextDecoder().decode(buf)); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { mode, input } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Service unavailable" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let tool;
    let userPrompt: string;
    if (mode === "guests") {
      tool = GUESTS_TOOL;
      userPrompt = `Extract guests from this text:\n\n${String(input ?? "").slice(0, MAX_INPUT_CHARS)}`;
    } else if (mode === "tables") {
      tool = TABLES_TOOL;
      userPrompt = `Extract tables from this description:\n\n${String(input ?? "").slice(0, MAX_INPUT_CHARS)}`;
    } else if (mode === "mapping") {
      tool = MAPPING_TOOL;
      const { headers, samples } = (input ?? {}) as { headers?: string[]; samples?: Record<string, unknown>[] };
      const safeHeaders = (headers ?? []).slice(0, MAX_HEADERS);
      const safeSamples = (samples ?? []).slice(0, MAX_SAMPLES);
      userPrompt = `Headers: ${JSON.stringify(safeHeaders)}\n\nFirst rows:\n${JSON.stringify(safeSamples, null, 2)}\n\nReturn a mapping object whose keys are exactly these headers.`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid mode" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: tool.function.name } },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited — please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: `AI request failed (${resp.status}): ${t.slice(0, 200)}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : {};
    return new Response(JSON.stringify(args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
