-- ============================================================================
-- Migration: read the push webhook secret from Supabase Vault, not a literal
-- ============================================================================
-- The previous version of this trigger (20260903081554) hardcoded the actual
-- PUSH_WEBHOOK_SECRET value directly in its function body. That value ended
-- up committed and pushed to the project's GitHub remote, so it has to be
-- treated as compromised. This migration:
--
-- 1. Rotates the secret (a new value was set via `supabase secrets set` on
--    the send-push edge function, and stored here via
--    `vault.create_secret(..., 'push_webhook_secret')` — never written to
--    any file).
-- 2. Changes the trigger function to read it from
--    vault.decrypted_secrets at call time, so no future rotation ever
--    requires committing the value into a migration again.
--
-- `alter database ... set app.settings.*` was tried first and rejected —
-- Supabase's hosted `postgres` role isn't a true superuser and can't set
-- database-level custom GUCs. Vault is the platform's own answer to this
-- exact problem.
-- ============================================================================

create or replace function public.trigger_send_push_notification()
returns trigger
language plpgsql
security definer set search_path = public, net, vault
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'push_webhook_secret';

  perform net.http_post(
    url := 'https://ldyqkrrhnkkfmevpnyes.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Secret', coalesce(v_secret, '')
    ),
    body := jsonb_build_object('type', 'INSERT', 'table', 'notifications', 'record', to_jsonb(new))
  );
  return new;
end;
$$;
