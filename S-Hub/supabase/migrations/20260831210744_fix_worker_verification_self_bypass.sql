-- ============================================================================
-- Migration: close the worker_verifications self-verification bypass
-- ============================================================================
-- worker_verifications' INSERT/UPDATE policies let the owner write any
-- column, including `status` — so a worker could INSERT (or PATCH) their own
-- row straight to status='verified' via direct REST/supabase-js, skipping
-- finalize_verification() entirely (its minimum-wait check, and — until now —
-- even the requirement of having actually submitted an ID document).
--
-- Fix mirrors guard_profile_role_change's approach (see
-- 20260823120000_phase4_fix_profile_role_escalation.sql): a BEFORE
-- INSERT/UPDATE trigger blocks direct client control of `status`, with two
-- escape hatches — service_role (trusted server-side/admin tooling), and a
-- transaction-local flag that finalize_verification() sets immediately
-- before performing its own, already-gated update.
-- ============================================================================

create or replace function public.guard_worker_verification_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Every client-initiated submission starts 'pending' — 'verified'/
    -- 'rejected' can only be set by finalize_verification() or admin tooling.
    new.status := 'pending';
    return new;
  end if;

  if new.status is distinct from old.status then
    if current_setting('app.allow_verification_finalize', true) = 'true' then
      return new;
    end if;
    raise exception 'Verification status can only be changed via finalize_verification().';
  end if;

  return new;
end;
$$;

drop trigger if exists worker_verifications_guard_status_change on public.worker_verifications;
create trigger worker_verifications_guard_status_change
  before insert or update on public.worker_verifications
  for each row execute function public.guard_worker_verification_status_change();

-- Re-point finalize_verification() through the new guard, and additionally
-- require an ID document actually be on file — closes the adjacent gap where
-- an empty submission (no id_document_url) could still self-finalize after
-- the minimum wait.
create or replace function public.finalize_verification(min_seconds integer default 3)
returns public.worker_verifications
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.worker_verifications;
begin
  select * into v_row from public.worker_verifications where id = auth.uid();

  if v_row.id is null then
    raise exception 'No verification submission found for this account.';
  end if;

  if v_row.status = 'verified' then
    return v_row;
  end if;

  if v_row.id_document_url is null then
    raise exception 'No ID document has been submitted for this account.';
  end if;

  if now() - v_row.submitted_at < make_interval(secs => min_seconds) then
    raise exception 'Verification cannot be finalized yet.';
  end if;

  perform set_config('app.allow_verification_finalize', 'true', true);

  update public.worker_verifications
  set status = 'verified', reviewed_at = now()
  where id = auth.uid()
  returning * into v_row;

  return v_row;
end;
$$;
