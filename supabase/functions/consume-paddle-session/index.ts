import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

let _sb: ReturnType<typeof createClient> | null = null;
function sb() {
  if (!_sb) {
    _sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }
  return _sb;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { ptxn } = await req.json();
    if (!ptxn || typeof ptxn !== 'string') {
      return new Response(JSON.stringify({ error: 'missing ptxn' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Poll-friendly: webhook may arrive after redirect. Caller retries.
    const { data, error } = await sb()
      .from('pending_paddle_sessions')
      .select('magic_link_url, consumed_at, created_at')
      .eq('paddle_session_id', ptxn)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return new Response(JSON.stringify({ status: 'pending' }), {
        status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (data.consumed_at) {
      return new Response(JSON.stringify({ status: 'consumed' }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // This endpoint must be unauthenticated — the buyer has no account yet —
    // so the magic link is protected by ptxn entropy + one-time consume.
    // Bound the blast radius of a ptxn that leaks (logs, referrer headers):
    // the link only redeems within 15 minutes of the webhook creating it.
    const ageMs = Date.now() - new Date(data.created_at as string).getTime();
    if (ageMs > 15 * 60 * 1000) {
      await sb()
        .from('pending_paddle_sessions')
        .update({ consumed_at: new Date().toISOString() })
        .eq('paddle_session_id', ptxn);
      return new Response(JSON.stringify({ status: 'expired' }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    await sb()
      .from('pending_paddle_sessions')
      .update({ consumed_at: new Date().toISOString() })
      .eq('paddle_session_id', ptxn);
    return new Response(JSON.stringify({ status: 'ok', magic_link_url: data.magic_link_url }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('consume-paddle-session error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
