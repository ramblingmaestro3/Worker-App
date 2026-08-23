-- ============================================================================
-- Migration: finalize_verification RPC
-- ============================================================================
-- verification-pending.tsx runs a short visual "reviewing" animation, then
-- calls this to flip the worker's verification to 'verified'. There is no
-- human reviewer/admin panel in this app, so the flip is inherently
-- self-attested — this RPC closes the trivial bypass of just calling the
-- REST API directly by requiring a minimum elapsed time server-side since
-- the verification was submitted, instead of trusting a client-side timer.
-- ============================================================================

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

  if now() - v_row.submitted_at < make_interval(secs => min_seconds) then
    raise exception 'Verification cannot be finalized yet.';
  end if;

  update public.worker_verifications
  set status = 'verified', reviewed_at = now()
  where id = auth.uid()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.finalize_verification(integer) to authenticated;
