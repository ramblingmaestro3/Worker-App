-- ============================================================================
-- Migration: notify the client when a worker advances a booking's status
-- ============================================================================
-- guard_booking_status_transition (20260906160000) enforces which status
-- transitions are legal, but nothing tells the OTHER participant it happened
-- -- a worker moving accepted -> en_route -> arrived -> in_progress ->
-- completed left the client with no signal beyond their original
-- bid-accepted notification. Mirrors notify_bid_status_change's shape: one
-- AFTER UPDATE trigger on bookings, SECURITY DEFINER so it can insert
-- regardless of who made the update.
--
-- Recipient routing: cancellation is client-only (RLS + the fix in
-- 20260906181500), every other transition is worker-only, so the recipient
-- is always "whichever side didn't cause the change."
-- ============================================================================

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'bid_countered', 'bid_accepted', 'bid_declined', 'new_message',
    'booking_en_route', 'booking_arrived', 'booking_in_progress',
    'booking_completed', 'booking_cancelled'
  ));

create or replace function public.notify_booking_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_recipient uuid;
  v_title     text;
  v_body      text;
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'cancelled' then
    v_recipient := new.worker_id;
    v_title := 'Booking cancelled';
    v_body  := 'The client cancelled this booking.';
  elsif new.status = 'en_route' then
    v_recipient := new.client_id;
    v_title := 'Your worker is on the way';
    v_body  := 'They marked themselves en route to your job.';
  elsif new.status = 'arrived' then
    v_recipient := new.client_id;
    v_title := 'Your worker has arrived';
    v_body  := 'They marked themselves arrived at your location.';
  elsif new.status = 'in_progress' then
    v_recipient := new.client_id;
    v_title := 'Job started';
    v_body  := 'Work on your job has begun.';
  elsif new.status = 'completed' then
    v_recipient := new.client_id;
    v_title := 'Job completed';
    v_body  := 'Your worker marked this job as completed. Leave a review!';
  else
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_recipient, 'booking_' || new.status, v_title, v_body,
    jsonb_build_object('booking_id', new.id, 'request_id', new.request_id)
  );

  return new;
end;
$$;

drop trigger if exists bookings_notify_status_change on public.bookings;
create trigger bookings_notify_status_change
  after update on public.bookings
  for each row execute function public.notify_booking_status_change();
