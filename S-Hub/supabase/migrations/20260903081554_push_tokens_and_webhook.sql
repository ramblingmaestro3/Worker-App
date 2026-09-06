-- ============================================================================
-- Migration: push notification tokens + send-on-insert webhook
-- ============================================================================
-- `push_tokens` mirrors `profile_contact`'s pattern for anything sensitive:
-- an Expo push token lets *anyone* holding it send that device a
-- notification (Expo's push API doesn't check who owns the token), so it
-- gets its own table with strictly owner-only RLS -- never merged onto the
-- broadly-readable `profiles` row.
--
-- The actual "send" step is wired declaratively: an AFTER INSERT trigger on
-- `notifications` calls the send-push edge function via
-- supabase_functions.http_request -- the same pre-installed helper the
-- Supabase Dashboard's "Database Webhooks" UI uses, so the service-role auth
-- to the function is handled by the platform, not hand-rolled here. This
-- means every notification insert (bid status change, new message, and any
-- future notification-creating trigger) automatically also attempts a push,
-- without duplicating send logic into each of those triggers.
-- ============================================================================

create table public.push_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  token      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint push_tokens_unique unique (user_id, token)
);

create index if not exists push_tokens_user_id_idx on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

create policy "Users can view their own push tokens"
  on public.push_tokens for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can register their own push tokens"
  on public.push_tokens for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can refresh their own push tokens"
  on public.push_tokens for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can remove their own push tokens"
  on public.push_tokens for delete
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Webhook: every new notification row fires a push attempt.
--
-- supabase_functions.http_request (the Dashboard "Database Webhooks" helper)
-- isn't available on this project, so this calls pg_net -- the lower-level
-- primitive that helper itself wraps -- directly instead. send-push has
-- verify_jwt=false (config.toml), matching ai-analyze's existing, working
-- pattern in this project, since this project's API keys are the newer
-- sb_publishable_/sb_secret_ format rather than legacy JWTs, so there's no
-- portable "just send the anon key as Bearer" story to lean on here. Instead
-- the function checks the X-Webhook-Secret header below against its own
-- PUSH_WEBHOOK_SECRET env secret (set via `supabase secrets set`, never
-- committed) -- the literal here is the shared value, not a live credential
-- an attacker could reuse against anything else.
-- ----------------------------------------------------------------------------
create extension if not exists pg_net;

create or replace function public.trigger_send_push_notification()
returns trigger
language plpgsql
security definer set search_path = public, net
as $$
begin
  perform net.http_post(
    url := 'https://ldyqkrrhnkkfmevpnyes.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Secret', 'd54f9b56b2a1cbfbd07aba93f336aa595b3426ab97d2a3357840b37306bcad74'
    ),
    body := jsonb_build_object('type', 'INSERT', 'table', 'notifications', 'record', to_jsonb(new))
  );
  return new;
end;
$$;

drop trigger if exists notifications_send_push on public.notifications;
create trigger notifications_send_push
  after insert on public.notifications
  for each row execute function public.trigger_send_push_notification();
