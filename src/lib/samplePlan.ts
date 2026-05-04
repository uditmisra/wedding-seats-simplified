import { supabase } from "@/integrations/supabase/client";

export const SAMPLE_PLAN_CODE = "sample-maya-jordan";

/**
 * Sentinel UUID used as the synthetic owner of the sample plan. It does not
 * match any real auth.users row, so the sample plan appears as view-only to
 * every visitor (no claim banner, no edits) — exactly the experience we want
 * for "See an example".
 */
const SAMPLE_OWNER_UUID = "00000000-0000-0000-0000-000000000001";

interface SeedTable { name: string; capacity: number; shape: "round" | "rectangle" | "square" | "long" | "head"; x: number; y: number }

const SEED_TABLES: SeedTable[] = [
  { name: "T1 · Family", capacity: 8, shape: "round", x: 0, y: 0 },
  { name: "T2 · College", capacity: 10, shape: "round", x: 200, y: 0 },
  { name: "T3 · Work", capacity: 8, shape: "round", x: 400, y: 0 },
  { name: "T4 · Head table", capacity: 6, shape: "head", x: 200, y: 200 },
];

const SEED_GUESTS: Array<{
  name: string;
  party: string;
  rsvp: "attending" | "maybe" | "declined" | "pending";
  meal?: string | null;
  table?: string;
  is_kid?: boolean;
}> = [
  { name: "Maya Okafor", party: "Couple", rsvp: "attending", table: "T4 · Head table" },
  { name: "Jordan Ross", party: "Couple", rsvp: "attending", table: "T4 · Head table" },
  { name: "Adaeze Okafor", party: "Family · Bride", rsvp: "attending", table: "T1 · Family" },
  { name: "Daniel Okonkwo", party: "Family · Groom", rsvp: "attending", table: "T1 · Family" },
  { name: "Imani Brown", party: "Family · Groom", rsvp: "attending", meal: "V", table: "T1 · Family" },
  { name: "Eleanor Whitman", party: "Family · Bride", rsvp: "attending", table: "T1 · Family" },
  { name: "Benjamin Ross", party: "College · Bride", rsvp: "attending", table: "T2 · College" },
  { name: "Gabriela Reyes", party: "College · Bride", rsvp: "attending", table: "T2 · College" },
  { name: "Felix Andersson", party: "College · Groom", rsvp: "attending", meal: "V", table: "T2 · College" },
  { name: "Camila Vargas", party: "Work · Groom", rsvp: "maybe", meal: "GF" },
  { name: "Hiroki Tanaka", party: "Work · Bride", rsvp: "attending", table: "T3 · Work" },
  { name: "Jasper Lindqvist", party: "Family · Bride", rsvp: "maybe" },
];

const SEED_CONSTRAINTS: Array<{ a: string; b: string; kind: "with" | "not_with" }> = [
  { a: "Benjamin Ross", b: "Gabriela Reyes", kind: "with" },
  { a: "Felix Andersson", b: "Hiroki Tanaka", kind: "not_with" },
];

/**
 * Idempotently load (or create) the public sample plan and return its code.
 * The sample plan owns itself via a sentinel UUID so visitors see a polished
 * read-only view (no claim banner, no edits propagate to other visitors).
 */
export async function loadOrCreateSamplePlan(): Promise<string> {
  const { data: existing } = await supabase
    .from("plans")
    .select("id, code")
    .eq("code", SAMPLE_PLAN_CODE)
    .maybeSingle();
  if (existing) return existing.code;

  const { data: plan, error: planErr } = await supabase
    .from("plans")
    .insert({ code: SAMPLE_PLAN_CODE, name: "Maya & Jordan", event_date: null })
    .select()
    .single();
  if (planErr || !plan) throw planErr ?? new Error("could not create sample plan");

  // Synthetic owner so the plan reads as "owned" to plan_has_any_owner RPC,
  // which means everyone gets the view-only banner instead of a claim banner.
  await supabase
    .from("plan_owners")
    .insert({ plan_id: plan.id, user_id: SAMPLE_OWNER_UUID, role: "owner" });

  const { data: scenario, error: scnErr } = await supabase
    .from("scenarios")
    .insert({ plan_id: plan.id, name: "Default", is_default: true })
    .select()
    .single();
  if (scnErr || !scenario) throw scnErr ?? new Error("could not create sample scenario");

  const { data: tables, error: tErr } = await supabase
    .from("tables_def")
    .insert(SEED_TABLES.map(t => ({ ...t, plan_id: plan.id, scenario_id: scenario.id })))
    .select();
  if (tErr || !tables) throw tErr ?? new Error("could not seed tables");

  const { data: guests, error: gErr } = await supabase
    .from("guests")
    .insert(SEED_GUESTS.map(g => ({
      plan_id: plan.id,
      name: g.name,
      party: g.party,
      rsvp: g.rsvp,
      meal: g.meal ?? null,
      is_kid: g.is_kid ?? false,
    })))
    .select();
  if (gErr || !guests) throw gErr ?? new Error("could not seed guests");

  const tableByName = new Map(tables.map(t => [t.name, t.id]));
  const guestByName = new Map(guests.map(g => [g.name, g.id]));

  type AssignmentInsert = {
    plan_id: string;
    scenario_id: string;
    guest_id: string;
    table_id: string;
    seat_index: number;
    pinned: boolean;
  };
  const assignments: AssignmentInsert[] = [];
  SEED_GUESTS.forEach((g, i) => {
    if (!g.table) return;
    const tableId = tableByName.get(g.table);
    const guestId = guestByName.get(g.name);
    if (!tableId || !guestId) return;
    assignments.push({
      plan_id: plan.id,
      scenario_id: scenario.id,
      guest_id: guestId,
      table_id: tableId,
      seat_index: i % 8,
      pinned: false,
    });
  });
  if (assignments.length) await supabase.from("assignments").insert(assignments);

  type ConstraintInsert = { plan_id: string; guest_a: string; guest_b: string; kind: "with" | "not_with" };
  const constraintRows: ConstraintInsert[] = [];
  for (const c of SEED_CONSTRAINTS) {
    const a = guestByName.get(c.a);
    const b = guestByName.get(c.b);
    if (!a || !b) continue;
    constraintRows.push({ plan_id: plan.id, guest_a: a, guest_b: b, kind: c.kind });
  }
  if (constraintRows.length) await supabase.from("constraints_def").insert(constraintRows);

  return plan.code;
}
