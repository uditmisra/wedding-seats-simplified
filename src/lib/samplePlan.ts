import { supabase } from "@/integrations/supabase/client";

export const SAMPLE_PLAN_CODE = "sample-maya-jordan";

/**
 * Idempotently load (or create) the public sample plan via a SECURITY DEFINER
 * RPC, so anonymous visitors can seed it without violating RLS. The plan is
 * owned by a sentinel UUID so visitors see a polished read-only view.
 */
export async function loadOrCreateSamplePlan(): Promise<string> {
  const { data, error } = await supabase.rpc("ensure_sample_plan");
  if (error) throw error;
  return (data as string) ?? SAMPLE_PLAN_CODE;
}
