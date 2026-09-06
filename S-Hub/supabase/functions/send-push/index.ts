// Supabase Edge Function: send-push
//
// Fires an Expo push notification whenever a row lands in public.notifications.
// Invoked by a pg_net-based trigger on public.notifications (see migration
// 20260903081554_push_tokens_and_webhook.sql) -- NOT called by app clients.
// verify_jwt is off (config.toml), same as ai-analyze, since this project's
// API keys are the newer sb_publishable_/sb_secret_ format rather than
// legacy JWTs -- there's no portable "send the anon key as Bearer" story to
// rely on for gateway-level verification here. Auth is instead a shared
// secret the trigger sends as X-Webhook-Secret, checked below.
//
// Deploy: supabase functions deploy send-push
// Secret:  supabase secrets set PUSH_WEBHOOK_SECRET=d54f9b56b2a1cbfbd07aba93f336aa595b3426ab97d2a3357840b37306bcad74

import { createClient } from 'npm:@supabase/supabase-js@2';

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
};

type WebhookPayload = {
  type: string;
  table: string;
  record: NotificationRow;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const expectedSecret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  if (!expectedSecret || req.headers.get('X-Webhook-Secret') !== expectedSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const row = payload?.record;
  if (!row?.user_id || !row?.title) {
    return json({ error: 'Missing notification fields' }, 400);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const { data: tokenRows, error: tokenError } = await admin
    .from('push_tokens')
    .select('token')
    .eq('user_id', row.user_id);

  if (tokenError) {
    console.error('push_tokens lookup failed', tokenError);
    return json({ error: 'Could not look up push tokens' }, 500);
  }

  const tokens = (tokenRows ?? []).map((t) => t.token as string);
  if (tokens.length === 0) {
    return json({ skipped: 'no registered devices' }, 200);
  }

  const messages = tokens.map((to) => ({
    to,
    title: row.title,
    body: row.body ?? undefined,
    data: { ...row.data, notificationId: row.id, type: row.type },
    sound: 'default',
  }));

  let staleTokens: string[] = [];
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    const result = await res.json().catch(() => null);
    const tickets: any[] = Array.isArray(result?.data) ? result.data : [];
    staleTokens = tickets
      .map((ticket, i) => (ticket?.details?.error === 'DeviceNotRegistered' ? tokens[i] : null))
      .filter((t): t is string => !!t);
  } catch (err) {
    console.error('expo push send failed', err);
    return json({ error: 'Could not reach the push service' }, 502);
  }

  // Clean up tokens Expo says are no longer valid (app uninstalled, etc.) so
  // future sends don't keep retrying them.
  if (staleTokens.length > 0) {
    await admin.from('push_tokens').delete().in('token', staleTokens);
  }

  return json({ sent: tokens.length - staleTokens.length, pruned: staleTokens.length }, 200);
});
