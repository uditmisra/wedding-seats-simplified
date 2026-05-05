import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_EMAIL = "udit.misra93@gmail.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: cors });
  }

  // Verify caller is the admin
  const callerClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authErr } = await callerClient.auth.getUser();
  if (authErr || !user || user.email !== ADMIN_EMAIL) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: cors });
  }

  // Service-role client for privileged operations
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const body = await req.json().catch(() => ({}));
  const { action, userId } = body as { action?: string; userId?: string };

  if (action === "impersonate") {
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId required" }), { status: 400, headers: cors });
    }
    const { data: target } = await admin.auth.admin.getUserById(userId);
    if (!target.user?.email) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: cors });
    }
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: target.user.email,
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
    }
    return new Response(
      JSON.stringify({ url: data?.properties?.action_link }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  if (action === "delete_user") {
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId required" }), { status: 400, headers: cors });
    }
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: cors });
});
