import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, type PaddleEnv } from '../_shared/paddle.ts';

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }
  return _supabase;
}

async function findOrCreateUserByEmail(email: string): Promise<string | null> {
  const sb = getSupabase();
  // Look up existing user via auth.users
  const { data: existing } = await sb
    .schema('auth' as any)
    .from('users')
    .select('id')
    .ilike('email', email)
    .maybeSingle();
  if (existing?.id) return existing.id as string;
  const { data: created, error } = await (sb.auth as any).admin.createUser({
    email,
    email_confirm: true,
  });
  if (error) {
    console.error('admin.createUser failed', error);
    return null;
  }
  return created?.user?.id ?? null;
}

async function stashMagicLink(opts: {
  paddleSessionId: string;
  userId: string;
  email: string;
}) {
  const sb = getSupabase();
  const origin = Deno.env.get('PUBLIC_SITE_URL') || 'https://weddingseater.app';
  const { data, error } = await (sb.auth as any).admin.generateLink({
    type: 'magiclink',
    email: opts.email,
    options: { redirectTo: `${origin}/dashboard?unlock=success` },
  });
  if (error || !data?.properties?.action_link) {
    console.error('generateLink failed', error);
    return;
  }
  await sb.from('pending_paddle_sessions').upsert({
    paddle_session_id: opts.paddleSessionId,
    user_id: opts.userId,
    email: opts.email,
    magic_link_url: data.properties.action_link,
  }, { onConflict: 'paddle_session_id' });
}

// Account-wide one-time unlock: mark profiles.is_paid = true.
async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  // Strict price-ID gating was checking item.price.importMeta.externalId,
  // but Paddle's webhook payload returns this as undefined for prices
  // created via the API (import_meta is a migration-only field). The
  // result was every paid transaction being silently ignored.
  //
  // Approach: process any transaction.completed for now, since this app
  // only sells one product. If a second SKU is added, gate by either
  // item.price.id (resolved via get-paddle-price) or check
  // item.price.customData (where Lovable likely sets external IDs).
  const item = data.items?.[0];
  const priceId = item?.price?.id;
  const externalPriceId =
    item?.price?.customData?.externalId ??
    item?.price?.importMeta?.externalId;
  console.log('transaction.completed', {
    transactionId: data.id,
    priceId,
    externalPriceId,
    hasCustomData: !!item?.price?.customData,
  });

  let userId: string | undefined = data.customData?.userId;
  let email: string | undefined = data.customer?.email;

  // Fallback: look up customer email via Paddle if not in payload, then
  // find or create the auth user and stash a magic link for /post-pay.
  if (!userId) {
    if (!email && data.customerId) {
      try {
        const { gatewayFetch } = await import('../_shared/paddle.ts');
        const res = await gatewayFetch(env, `/customers/${data.customerId}`);
        const j = await res.json();
        email = j?.data?.email;
      } catch (e) {
        console.error('paddle customer lookup failed', e);
      }
    }
    if (!email) {
      console.warn('transaction.completed: no userId and no email', { id: data.id });
      return;
    }
    const found = await findOrCreateUserByEmail(email);
    if (!found) return;
    userId = found;
    await stashMagicLink({ paddleSessionId: data.id, userId, email });
  }

  const { error } = await getSupabase()
    .from('profiles')
    .update({
      is_paid: true,
      paid_at: new Date().toISOString(),
      paddle_customer_id: data.customerId,
      paddle_transaction_id: data.id,
      environment: env,
    })
    .eq('id', userId);
  if (error) console.error('profiles update failed', error);
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.eventType) {
    case EventName.TransactionCompleted:
      await handleTransactionCompleted(event.data, env);
      break;
    default:
      console.log('Unhandled event:', event.eventType);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const url = new URL(req.url);
  const env = (url.searchParams.get('env') || 'sandbox') as PaddleEnv;
  try {
    await handleWebhook(req, env);
    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('Webhook error', { status: 400 });
  }
});