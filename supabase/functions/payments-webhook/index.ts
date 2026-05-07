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

// Account-wide one-time unlock: mark profiles.is_paid = true.
async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  const userId = data.customData?.userId;
  if (!userId) {
    console.warn('transaction.completed missing customData.userId', { id: data.id });
    return;
  }
  const item = data.items?.[0];
  const externalPriceId = item?.price?.importMeta?.externalId;
  if (externalPriceId !== 'unlock_lifetime') {
    console.log('Ignoring transaction for unrecognized price', externalPriceId);
    return;
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