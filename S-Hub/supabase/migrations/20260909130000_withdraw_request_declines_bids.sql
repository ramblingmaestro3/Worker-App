-- ============================================================================
-- Migration: withdrawing a request cleans up the bids on it
-- ============================================================================
-- "Withdraw this request" (BidComparison) flips a service_request from
-- 'seeking_bids' to 'cancelled', but the worker_bids already placed on it were
-- left as 'pending'/'countered' forever — a dead end the worker could never
-- clear and that still showed as an open bid on their dashboard. This declines
-- them in the same transaction (SECURITY DEFINER so it isn't limited by the
-- client's own worker_bids RLS), which also fires the existing
-- notify_bid_status_change trigger so each affected worker is told.
-- ============================================================================

create or replace function public.decline_bids_on_request_cancel()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status = 'seeking_bids' then
    update public.worker_bids
      set status = 'declined', updated_at = now()
      where request_id = new.id and status in ('pending', 'countered');
  end if;
  return new;
end;
$$;

revoke execute on function public.decline_bids_on_request_cancel() from anon, authenticated;

drop trigger if exists service_requests_cancel_declines_bids on public.service_requests;
create trigger service_requests_cancel_declines_bids
  after update on public.service_requests
  for each row execute function public.decline_bids_on_request_cancel();

-- ----------------------------------------------------------------------------
-- Make the "bid declined" notification honest when it was a withdrawal rather
-- than the client picking someone else. Same body otherwise.
-- ----------------------------------------------------------------------------
create or replace function public.notify_bid_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_title text;
  v_body  text;
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'countered' then
    v_title := 'Client countered your bid';
    v_body  := 'They proposed GH' || e'₵' || ' ' || new.counter_price || '. Review and respond.';
  elsif new.status = 'accepted' then
    v_title := 'Your bid was accepted!';
    v_body  := 'The client accepted your bid. Check your bookings to get started.';
  elsif new.status = 'declined' then
    v_title := 'Your bid was declined';
    if exists (
      select 1 from public.service_requests r
      where r.id = new.request_id and r.status = 'cancelled'
    ) then
      v_body := 'The client withdrew this job.';
    else
      v_body := 'The client went with another worker for this job.';
    end if;
  else
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    new.worker_id, 'bid_' || new.status, v_title, v_body,
    jsonb_build_object('bid_id', new.id, 'request_id', new.request_id)
  );

  return new;
end;
$$;

revoke execute on function public.notify_bid_status_change() from anon, authenticated;
