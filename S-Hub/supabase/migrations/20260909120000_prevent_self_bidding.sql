-- ============================================================================
-- Migration: a worker cannot bid on (and so cannot be booked for) their own job
-- ============================================================================
-- Nothing stopped a verified worker from placing a bid on a service_request
-- they themselves posted as a client. Accepting it then created a booking with
-- client_id = worker_id -- a "conversation with yourself": the chat header
-- shows your own name and every message sits on your own side. The fix closes
-- it at the two entry points:
--   1. the worker_bids INSERT policy rejects a bid on your own request
--   2. accept_bid() refuses to create a self-booking (defence in depth, and
--      covers any self-bid rows that predate this migration)
-- ============================================================================

drop policy if exists "Verified workers can bid on open requests" on public.worker_bids;

create policy "Verified workers can bid on open requests"
  on public.worker_bids for insert
  to authenticated
  with check (
    worker_id = auth.uid()
    and exists (
      select 1 from public.worker_profiles wp
      where wp.id = auth.uid() and wp.verification_status = 'verified'
    )
    and public.request_is_open(request_id)
    and not public.owns_request(request_id, auth.uid())
  );

create or replace function public.accept_bid(p_bid_id uuid)
returns public.bookings
language plpgsql
security definer set search_path = public
as $$
declare
  v_bid public.worker_bids;
  v_request public.service_requests;
  v_booking public.bookings;
begin
  select * into v_bid from public.worker_bids where id = p_bid_id for update;
  if v_bid.id is null then
    raise exception 'Bid not found.';
  end if;

  select * into v_request from public.service_requests where id = v_bid.request_id for update;
  if v_request.id is null then
    raise exception 'Service request not found.';
  end if;

  if v_request.client_id <> auth.uid() then
    raise exception 'Only the requesting client can accept a bid.';
  end if;

  if v_request.status <> 'seeking_bids' then
    raise exception 'This request is no longer seeking bids.';
  end if;

  if v_bid.status not in ('pending', 'countered') then
    raise exception 'This bid is no longer active.';
  end if;

  if v_bid.worker_id = v_request.client_id then
    raise exception 'You cannot hire yourself for your own job.';
  end if;

  insert into public.bookings (request_id, bid_id, client_id, worker_id, status, accepted_at)
  values (v_request.id, v_bid.id, v_request.client_id, v_bid.worker_id, 'accepted', now())
  returning * into v_booking;

  update public.worker_bids set status = 'accepted', updated_at = now() where id = v_bid.id;
  update public.worker_bids set status = 'declined', updated_at = now()
    where request_id = v_request.id and id <> v_bid.id and status in ('pending', 'countered');
  update public.service_requests set status = 'assigned', updated_at = now() where id = v_request.id;

  return v_booking;
end;
$$;

grant execute on function public.accept_bid(uuid) to authenticated;
