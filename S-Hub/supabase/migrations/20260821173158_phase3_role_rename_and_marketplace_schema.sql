-- ============================================================================
-- Migration: Role rename (customer -> client) + marketplace core schema
-- ============================================================================
-- Part 1: renames the 'customer' role value to 'client' (matching app code
-- updated in the same pass) and adds 'admin' to the allowed set for future
-- use (no admin screens exist yet -- this just future-proofs the enum).
--
-- Part 2: the peer-to-peer request/bid/booking/chat schema --
--   service_requests: a client's posted task, open for bidding.
--   worker_bids: a worker's offer on a request, with counter-offer support.
--   bookings: the accepted engagement (1:1 with a request once assigned),
--     created only via accept_bid() -- carries granular status + GPS columns
--     for later live-tracking work.
--   messages: per-booking chat -- structurally impossible to start before a
--     bid is accepted, since messages.booking_id requires a booking to exist.
--
-- All tables are created first, then all RLS policies (several policies
-- cross-reference sibling tables, so every table must exist before any
-- policy referencing it is created).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Part 1: role rename
-- ----------------------------------------------------------------------------
-- Constraint must be widened before the backfill can write 'client' rows.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('customer', 'client', 'worker', 'admin'));

update public.profiles set role = 'client' where role = 'customer';

-- Now narrow the constraint to drop the transitional 'customer' value.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('client', 'worker', 'admin'));

alter table public.profiles alter column role set default 'client';

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
    coalesce(new.raw_user_meta_data ->> 'role', 'client'),
    new.phone,
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Table: public.service_requests
-- ----------------------------------------------------------------------------
create table if not exists public.service_requests (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.profiles(id) on delete cascade,
  category           text not null,
  description        text,
  location_string    text,
  latitude           double precision,
  longitude          double precision,
  location_region    text check (location_region is null or location_region in (
                       'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern',
                       'Greater Accra', 'North East', 'Northern', 'Oti', 'Savannah',
                       'Upper East', 'Upper West', 'Volta', 'Western', 'Western North'
                     )),
  initial_offer_price numeric,
  photos             text[] not null default '{}',
  status             text not null default 'seeking_bids' check (status in (
                       'seeking_bids', 'assigned', 'in_progress', 'completed', 'cancelled'
                     )),
  scheduled_for      timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists service_requests_status_idx on public.service_requests(status);
create index if not exists service_requests_client_id_idx on public.service_requests(client_id);

drop trigger if exists service_requests_updated_at on public.service_requests;
create trigger service_requests_updated_at
  before update on public.service_requests
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Table: public.worker_bids
-- ----------------------------------------------------------------------------
create table if not exists public.worker_bids (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references public.service_requests(id) on delete cascade,
  worker_id       uuid not null references public.profiles(id) on delete cascade,
  proposed_price  numeric not null,
  message         text,
  counter_price   numeric,
  counter_message text,
  status          text not null default 'pending' check (status in (
                    'pending', 'accepted', 'countered', 'declined', 'withdrawn'
                  )),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- A worker can only have one ACTIVE (pending/countered) bid per request at a time;
-- declined/withdrawn/accepted rows don't block a fresh bid.
create unique index if not exists worker_bids_one_active_per_worker
  on public.worker_bids(request_id, worker_id)
  where status in ('pending', 'countered');

create index if not exists worker_bids_request_id_idx on public.worker_bids(request_id);
create index if not exists worker_bids_worker_id_idx on public.worker_bids(worker_id);
create index if not exists worker_bids_status_idx on public.worker_bids(status);

drop trigger if exists worker_bids_updated_at on public.worker_bids;
create trigger worker_bids_updated_at
  before update on public.worker_bids
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Table: public.bookings
-- ----------------------------------------------------------------------------
create table if not exists public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  request_id          uuid not null unique references public.service_requests(id) on delete cascade,
  bid_id              uuid references public.worker_bids(id),
  client_id           uuid not null references public.profiles(id),
  worker_id           uuid not null references public.profiles(id),
  status              text not null default 'accepted' check (status in (
                        'accepted', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled'
                      )),
  accepted_at         timestamptz,
  en_route_at         timestamptz,
  arrived_at          timestamptz,
  completed_at        timestamptz,
  cancelled_at        timestamptz,
  worker_lat          double precision,
  worker_lng          double precision,
  location_updated_at timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists bookings_client_id_idx on public.bookings(client_id);
create index if not exists bookings_worker_id_idx on public.bookings(worker_id);
create index if not exists bookings_status_idx on public.bookings(status);

drop trigger if exists bookings_updated_at on public.bookings;
create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Table: public.messages
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings(id) on delete cascade,
  sender_id    uuid not null references public.profiles(id),
  message_text text not null,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists messages_booking_id_idx on public.messages(booking_id);
create index if not exists messages_sender_id_idx on public.messages(sender_id);

-- ----------------------------------------------------------------------------
-- RPC: accept_bid -- the only way a booking gets created.
-- ----------------------------------------------------------------------------
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

-- ============================================================================
-- Row Level Security -- all tables exist by this point, so cross-table
-- policy references (e.g. service_requests policies referencing worker_bids)
-- resolve correctly.
-- ============================================================================

alter table public.service_requests enable row level security;

create policy "Requests are viewable by owner, open listings, or bidders"
  on public.service_requests for select
  to authenticated
  using (
    client_id = auth.uid()
    or status = 'seeking_bids'
    or exists (
      select 1 from public.worker_bids b
      where b.request_id = service_requests.id and b.worker_id = auth.uid()
    )
  );

create policy "Clients can create their own requests"
  on public.service_requests for insert
  to authenticated
  with check (client_id = auth.uid());

create policy "Clients can edit or cancel their own open requests"
  on public.service_requests for update
  to authenticated
  using (client_id = auth.uid() and status = 'seeking_bids')
  with check (client_id = auth.uid() and status in ('seeking_bids', 'cancelled'));

alter table public.worker_bids enable row level security;

create policy "Bids are viewable by the request owner or the bidder"
  on public.worker_bids for select
  to authenticated
  using (
    worker_id = auth.uid()
    or exists (
      select 1 from public.service_requests r
      where r.id = worker_bids.request_id and r.client_id = auth.uid()
    )
  );

create policy "Verified workers can bid on open requests"
  on public.worker_bids for insert
  to authenticated
  with check (
    worker_id = auth.uid()
    and exists (
      select 1 from public.worker_profiles wp
      where wp.id = auth.uid() and wp.verification_status = 'verified'
    )
    and exists (
      select 1 from public.service_requests r
      where r.id = request_id and r.status = 'seeking_bids'
    )
  );

create policy "Workers can update or withdraw their own pending bid"
  on public.worker_bids for update
  to authenticated
  using (worker_id = auth.uid())
  with check (worker_id = auth.uid() and status in ('pending', 'withdrawn'));

create policy "Clients can counter or decline bids on their own requests"
  on public.worker_bids for update
  to authenticated
  using (
    exists (
      select 1 from public.service_requests r
      where r.id = worker_bids.request_id and r.client_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.service_requests r
      where r.id = worker_bids.request_id and r.client_id = auth.uid()
    )
    and status in ('countered', 'declined')
  );

alter table public.bookings enable row level security;

create policy "Bookings are viewable by their client or worker"
  on public.bookings for select
  to authenticated
  using (client_id = auth.uid() or worker_id = auth.uid());

create policy "The assigned worker can advance booking status and location"
  on public.bookings for update
  to authenticated
  using (worker_id = auth.uid())
  with check (worker_id = auth.uid());

alter table public.messages enable row level security;

create policy "Booking participants can read their messages"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = messages.booking_id
        and (b.client_id = auth.uid() or b.worker_id = auth.uid())
    )
  );

create policy "Booking participants can send messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.client_id = auth.uid() or b.worker_id = auth.uid())
    )
  );

create policy "Booking participants can mark messages read"
  on public.messages for update
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = messages.booking_id
        and (b.client_id = auth.uid() or b.worker_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = messages.booking_id
        and (b.client_id = auth.uid() or b.worker_id = auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- Realtime
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.service_requests;
alter publication supabase_realtime add table public.worker_bids;
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.messages;
