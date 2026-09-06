// Supabase Edge Function: delete-account
//
// Permanently deletes the calling user's own auth.users row. There's no
// SQL-callable way for the `authenticated` role to delete its own auth.users
// row directly (deletion needs the Admin API, which needs the service role
// key) -- so this verifies the caller's own JWT first, then uses a
// service-role client only to delete that exact verified id, never a
// caller-supplied one.
//
// `bookings`/`messages` reference profiles with ON DELETE NO ACTION (by
// design -- transaction/chat history should survive the other participant's
// account existing), so deleting a user who has ever booked or messaged
// fails with a foreign-key violation. That's surfaced as a clear, honest
// "can't delete yet" error rather than a silent no-op or a raw Postgres
// error -- a real self-serve deletion path for accounts with history needs
// a product decision (e.g. anonymize instead of hard-delete) this function
// deliberately doesn't guess at.
//
// Deploy: supabase functions deploy delete-account
// verify_jwt is off, matching ai-analyze/send-push -- the function verifies
// the caller's token itself instead of relying on the gateway.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const authed = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );

  let userId: string;
  try {
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return json({ error: 'Sign in to delete your account' }, 401);
    userId = user.id;
  } catch {
    return json({ error: 'Could not verify your session' }, 401);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    // GoTrue wraps the underlying Postgres error into this generic message
    // for any DB-level failure during the cascade; in this schema the only
    // thing under `profiles` that isn't ON DELETE CASCADE is bookings/
    // messages (NO ACTION, by design), so in practice this means "has
    // booking or message history" -- confirmed live against a real account
    // with a booking during Phase 2 verification.
    if (error.message === 'Database error deleting user') {
      return json(
        {
          error: "Your account has booking or message history, so it can't be fully deleted automatically yet. Contact support to have it removed.",
          code: 'has_history',
        },
        409,
      );
    }
    console.error('delete-account failed', error);
    return json({ error: 'Could not delete your account. Please try again.' }, 500);
  }

  return json({ success: true }, 200);
});
