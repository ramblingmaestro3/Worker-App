-- ============================================================================
-- Migration: user reports + blocking
-- ============================================================================
-- Two independent features that both back the chat overflow menu's
-- "Report"/"Block" actions, previously bare Alert.alert popups with no
-- backend effect at all.
--
-- `reports` is a one-way mailbox: the reporter can see what they filed,
-- the reported user never can (same convention as real moderation systems
-- -- reports aren't visible to their subject). There's no admin UI yet, so
-- `status` just tracks a lifecycle for whenever one exists.
--
-- `blocked_users` is enforced, not just recorded: a SECURITY DEFINER helper
-- (`is_blocked_pair`) is layered into the existing messages-insert RLS
-- policy so a block actually stops new messages in *either* direction
-- between the two people, not just what each side happens to see client-side.
-- `is_blocked_with` is the same check exposed as a callable RPC so a client
-- can ask "am I blocked with this person" for someone else's block row,
-- which the base blocked_users SELECT policy (owner-only) deliberately
-- doesn't expose directly.
-- ============================================================================

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  booking_id  uuid references public.bookings(id) on delete set null,
  message_id  uuid references public.messages(id) on delete set null,
  reason      text not null,
  status      text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at  timestamptz not null default now(),

  constraint reports_not_self check (reporter_id <> reported_id)
);

create index if not exists reports_reporter_id_idx on public.reports(reporter_id);
create index if not exists reports_reported_id_idx on public.reports(reported_id);

alter table public.reports enable row level security;

create policy "Reporters can view their own filed reports"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid());

create policy "Any signed-in user can file a report"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- ----------------------------------------------------------------------------
create table public.blocked_users (
  id         uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint blocked_users_not_self check (blocker_id <> blocked_id),
  constraint blocked_users_unique unique (blocker_id, blocked_id)
);

create index if not exists blocked_users_blocker_id_idx on public.blocked_users(blocker_id);

alter table public.blocked_users enable row level security;

create policy "Users can view who they've blocked"
  on public.blocked_users for select
  to authenticated
  using (blocker_id = auth.uid());

create policy "Users can block another user"
  on public.blocked_users for insert
  to authenticated
  with check (blocker_id = auth.uid());

create policy "Users can unblock a user they blocked"
  on public.blocked_users for delete
  to authenticated
  using (blocker_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Block-check helpers
-- ----------------------------------------------------------------------------
create or replace function public.is_blocked_pair(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.blocked_users
    where (blocker_id = user_a and blocked_id = user_b)
       or (blocker_id = user_b and blocked_id = user_a)
  );
$$;

-- Callable via supabase.rpc('is_blocked_with', { other_user_id }) -- lets a
-- client check "can I reach this person" without needing SELECT access to
-- a blocked_users row that isn't their own (e.g. when the OTHER party is
-- the one who did the blocking).
create or replace function public.is_blocked_with(other_user_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.is_blocked_pair(auth.uid(), other_user_id);
$$;

-- ----------------------------------------------------------------------------
-- Enforce blocking on new messages -- replaces the phase3 insert policy with
-- the same conditions plus a block check between the sender and whichever
-- booking participant isn't them.
-- ----------------------------------------------------------------------------
drop policy if exists "Booking participants can send messages" on public.messages;
create policy "Booking participants can send messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.client_id = auth.uid() or b.worker_id = auth.uid())
        and not public.is_blocked_pair(
          auth.uid(),
          case when b.client_id = auth.uid() then b.worker_id else b.client_id end
        )
    )
  );
