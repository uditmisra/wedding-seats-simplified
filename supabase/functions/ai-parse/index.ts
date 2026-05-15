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
    description: `Extract a structured list of wedding guests from free-form text or tabular data (CSV / spreadsheet paste). NEVER LOSE INFORMATION — anything that isn't a core field belongs in "extra".

CORE FIELDS — normalize to the rules below:

• "name": full name as written.
• Split couples like "John & Sarah Smith" into two guests sharing the same party.
• "+2 kids" → two extra child guests in that party with is_kid=true.
• "party" groups people who arrived together (couples, families). Use the family/group column verbatim when given.
• "side" is normalized: "bride"/"groom" only. If the source says "Bride's family", "bride side", "Mum list", treat as "bride". Same for groom side.
• "rsvp": yes/coming/confirmed → "attending"; no/regrets/declined → "declined"; maybe/tentative → "maybe"; otherwise "pending".
• "meal": KEEP THE SOURCE VALUE VERBATIM unless it's an obvious dietary category. Many weddings list the actual dish ("Beef Wellington", "Chicken parmesan", "Mushroom risotto") — preserve those exactly. Only normalize when the value is clearly a dietary preference, mapping to lowercase: "veg" / "vegetarian" → "vegetarian"; "non-veg" / "non veg" / "meat eater" → "non_vegetarian"; "vegan" → "vegan"; "fish only" / "pescatarian" → "pescatarian"; "halal" → "halal"; "kosher" → "kosher"; "jain" → "jain". If the source doesn't mention a meal at all, omit the field.
• "is_kid": true only when explicitly a child/kid/baby. Default false.
• "accessibility": physical access only — wheelchair, walker, mobility, hearing-impaired, etc. NOT dietary.
• "notes": short, free-form note about the guest (allergy specifics like "Allergies: peanuts", "no onion or garlic", brief reminders). Don't dump structured columns here — those go in "extra".

EXTRA FIELDS — this is critical:

• "extra" captures EVERY OTHER column from the source that doesn't fit a core field. Examples: phone, email, address, plus-one name, table preference, hotel, gift status, entree side, etc.
• Keys must be lowercase snake_case derived from the source header (e.g. "Phone Number" → "phone_number", "+1 Name" → "plus_one_name", "Entree Choice" → "entree_choice").
• Values are the raw cell value as a string, trimmed. Skip empty cells.
• If the source isn't tabular (no headers), omit "extra".`,
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
              side: { type: "string", enum: ["bride", "groom"] },
              rsvp: { type: "string", enum: ["pending", "attending", "maybe", "declined"] },
              meal: { type: "string", description: "Dietary enum (vegetarian/vegan/pescatarian/non_vegetarian/halal/kosher/jain) when obviously dietary, otherwise verbatim source value (e.g. 'Beef Wellington')." },
              is_kid: { type: "boolean" },
              accessibility: { type: "string" },
              notes: { type: "string" },
              extra: {
                type: "object",
                description: "Any other useful columns from the source as key/value strings. Keys lowercase snake_case from the source header.",
                additionalProperties: { type: "string" },
              },
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

const ROOM_TOOL = {
  type: "function",
  function: {
    name: "parse_room",
    description: "Extract a venue room configuration from a free-form description. width_m and height_m are the room dimensions in metres. fixtures is a list of venue features (dance floor, bar, DJ booth, stage, entry/exits, etc.) placed as fractions of the room (x_pct=0 is left wall, x_pct=1 is right wall; y_pct=0 is top/far wall, y_pct=1 is bottom/near wall). fixture type must be one of: entry, dance_floor, dj, bar, stage, bathroom, catering, coat_check, photo_booth, annotation, compass. Place features plausibly — dance floors typically at back, bars near entry, DJ near dance floor. All pct values 0–1. Include a compass if cardinal direction is mentioned.",
    parameters: {
      type: "object",
      properties: {
        width_m: { type: "number", minimum: 4, maximum: 100, description: "Room width in metres" },
        height_m: { type: "number", minimum: 4, maximum: 100, description: "Room depth/length in metres" },
        fixtures: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              type: { type: "string", enum: ["entry", "dance_floor", "dj", "bar", "stage", "bathroom", "catering", "coat_check", "photo_booth", "annotation", "compass"] },
              label: { type: "string" },
              x_pct: { type: "number", minimum: -0.05, maximum: 1.05 },
              y_pct: { type: "number", minimum: -0.05, maximum: 1.05 },
              w_pct: { type: "number", minimum: 0.03, maximum: 0.7 },
              h_pct: { type: "number", minimum: 0.02, maximum: 0.7 },
              visible: { type: "boolean" },
            },
            required: ["id", "type", "label", "x_pct", "y_pct", "visible"],
          },
        },
      },
      required: ["width_m", "height_m", "fixtures"],
    },
  },
};

const SYSTEM = "You are a friendly wedding planning assistant. Extract structured data carefully and conservatively. If unsure about an optional field, omit it rather than guessing.";

// Per-request caps. Clients should chunk larger inputs to avoid silent
// truncation here. ai-parse processes one chunk per call.
const MAX_BYTES = 256 * 1024;
const MAX_INPUT_CHARS = 50_000;
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
    } else if (mode === "room") {
      tool = ROOM_TOOL;
      userPrompt = `Parse this venue description into a room configuration:\n\n${String(input ?? "").slice(0, MAX_INPUT_CHARS)}\n\nRemember: x_pct=0 is left wall, x_pct=1 is right wall, y_pct=0 is far/top wall, y_pct=1 is near/bottom wall. Give each fixture a short unique id (e.g. "entry", "dance_floor", "bar_1").`;
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
