-- ============================================================================
-- Migration: Database-driven notifications
-- ============================================================================
-- New `notifications` table, written only by SECURITY DEFINER trigger
-- functions (never directly by users -- no user-facing INSERT policy).
--
-- A single AFTER UPDATE trigger on worker_bids covers all three code paths
-- that can change a bid's status (accept_bid()'s two internal UPDATEs, plus
-- counterBid()/declineBid()'s direct UPDATEs) -- notify logic intentionally
-- does NOT live inside accept_bid() itself, since that would double-fire
-- alongside this trigger.
--
-- matchCounterOffer() resets a bid to 'pending', which isn't a notify-worthy
-- transition here -- the client isn't told "worker matched your counter".
-- Deliberately deferred, not an oversight.
-- ============================================================================

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type in ('bid_countered', 'bid_accepted', 'bid_declined', 'new_message')),
  title      text not null,
  body       text,
  data       jsonb not null default '{}'::jsonb,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_id_unread_idx
  on public.notifications(user_id) where is_read = false;

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can update their own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Trigger: worker_bids status change -> notify the worker who placed the bid
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
    v_body  := 'The client went with another worker for this job.';
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

drop trigger if exists worker_bids_notify_status_change on public.worker_bids;
create trigger worker_bids_notify_status_change
  after update on public.worker_bids
  for each row execute function public.notify_bid_status_change();

-- ----------------------------------------------------------------------------
-- Trigger: new message -> notify the OTHER booking participant
-- ----------------------------------------------------------------------------
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_booking   public.bookings;
  v_recipient uuid;
  v_sender    text;
begin
  select * into v_booking from public.bookings where id = new.booking_id;
  if v_booking.id is null then
    return new;
  end if;

  v_recipient := case when v_booking.client_id = new.sender_id
                      then v_booking.worker_id else v_booking.client_id end;

  select full_name into v_sender from public.profiles where id = new.sender_id;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_recipient, 'new_message', coalesce(nullif(v_sender, ''), 'New message'),
    left(new.message_text, 140),
    jsonb_build_object('booking_id', new.booking_id, 'message_id', new.id)
  );

  return new;
end;
$$;

drop trigger if exists messages_notify_new_message on public.messages;
create trigger messages_notify_new_message
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- ----------------------------------------------------------------------------
-- Realtime -- service_requests/worker_bids/bookings/messages were already
-- added to this publication in the phase3 migration; only these two are new.
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.profiles;
