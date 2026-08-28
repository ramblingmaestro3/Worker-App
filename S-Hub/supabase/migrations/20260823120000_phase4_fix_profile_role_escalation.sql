-- ============================================================================
-- Migration: Close profiles.role self-escalation
-- ============================================================================
-- Two related gaps, both discovered during a security sweep:
--
-- 1. handle_new_user() copies raw_user_meta_data->>'role' straight through,
--    only defaulting a missing value to 'client'. Since profiles_role_check
--    allows 'admin' (added in the phase3 rename migration for future use),
--    any client can call
--      supabase.auth.signUp({ options: { data: { role: 'admin' } } })
--    and be inserted with role='admin'.
--
-- 2. "Profiles are updatable by owner" (from the very first migration) is
--    `using (auth.uid() = id) with check (auth.uid() = id)` — it doesn't
--    restrict which columns can change. Combined with the same check
--    constraint, any authenticated user can run
--      update profiles set role = 'admin' where id = auth.uid()
--    directly via supabase-js, bypassing the app's becomeWorker() flow
--    (lib/api/profiles.ts) entirely.
--
-- Neither is exploitable through the app's own UI today (no admin surface
-- exists yet), but both are live escalation paths against the RLS layer
-- itself, which is the actual security boundary given the frontend talks to
-- Supabase directly. Fixed here rather than left for when an admin role
-- becomes load-bearing.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Whitelist self-signup role: only 'worker' is honored from metadata,
--    everything else (including 'admin' or garbage) becomes 'client'.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'role' = 'worker' then 'worker' else 'client' end,
    new.phone,
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. Trigger-enforced column guard: a normal `authenticated` update may only
--    ever move role from 'client' to 'worker' (the one-way becomeWorker()
--    upgrade) and may never touch 'admin' in either direction. Calls made
--    with the service_role key (trusted server-side/admin tooling) bypass
--    this, since auth.role() reports 'service_role' for those, not
--    'authenticated'.
-- ----------------------------------------------------------------------------
create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.role() = 'service_role' then
      return new;
    end if;
    if old.role <> 'client' or new.role <> 'worker' then
      raise exception 'role can only be changed from client to worker.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role_change on public.profiles;
create trigger profiles_guard_role_change
  before update on public.profiles
  for each row execute function public.guard_profile_role_change();
