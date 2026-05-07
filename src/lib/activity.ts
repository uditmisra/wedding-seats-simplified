import { supabase } from "@/integrations/supabase/client";

export function logActivity(
  planId: string,
  userId: string | null,
  userDisplay: string,
  action: string,
  subject?: string,
  detail?: string,
) {
  // Fire-and-forget — never block the UI on logging
  supabase.from("activity_log").insert({
    plan_id: planId,
    user_id: userId ?? null,
    user_display: userDisplay,
    action,
    subject: subject ?? null,
    detail: detail ?? null,
  }).then(() => {});
}

export function displayName(user: { email?: string; user_metadata?: Record<string, unknown> } | null): string {
  if (!user) return "Guest";
  const meta = user.user_metadata as Record<string, string> | undefined;
  return meta?.full_name || meta?.name || user.email?.split("@")[0] || "Someone";
}
