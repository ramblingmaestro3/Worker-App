-- ============================================================================
-- Migration: Mutual post-booking reviews
-- ============================================================================
-- New `reviews` table -- either participant on a *completed* booking may
-- leave exactly one review of the other (client -> worker and worker ->
-- client are both allowed; that's "mutual", not "one review per booking" --
-- a completed booking can accumulate up to two rows, one per direction).
--
-- An AFTER INSERT trigger recalculates the reviewee's rating_avg/rating_count
-- on BOTH `profiles` (read by e.g. worker_bids' client-facing worker-rating
-- join) and `worker_profiles` (read by the public worker-profile screen) --
-- these two tables carry independent copies of the same aggregate, kept in
-- sync from this one source of truth.
-- ============================================================================

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),

  constraint reviews_reviewer_not_reviewee check (reviewer_id <> reviewee_id),
  -- One review per booking per direction -- a reviewer can't leave two
  -- reviews for the same booking, but both participants can each leave one.
  constraint reviews_one_per_booking_direction unique (booking_id, reviewer_id)
);

create index if not exists reviews_reviewee_id_idx on public.reviews(reviewee_id);
create index if not exists reviews_booking_id_idx on public.reviews(booking_id);

alter table public.reviews enable row level security;

-- Reviews are read broadly -- same "public trust signal" convention already
-- used for verified worker_profiles rows; a rating/comment isn't PII.
create policy "Reviews are viewable by any signed-in user"
  on public.reviews for select
  to authenticated
  using (true);

-- A reviewer may only insert as themselves, only for a booking that's
-- actually completed, and only reviewing the *other* participant on that
-- exact booking -- never an arbitrary user, never before completion, never
-- impersonating the other side. This is the only INSERT path; there's no
-- UPDATE/DELETE policy, so a submitted review is immutable in v1.
create policy "Booking participants can review each other after completion"
  on public.reviews for insert
  to authenticated
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.status = 'completed'
        and (
          (b.client_id = reviewer_id and b.worker_id = reviewee_id)
          or
          (b.worker_id = reviewer_id and b.client_id = reviewee_id)
        )
    )
  );

-- ----------------------------------------------------------------------------
-- Trigger: recalculate the reviewee's rating_avg/rating_count on both
-- profiles and worker_profiles whenever a review is inserted.
-- ----------------------------------------------------------------------------
create or replace function public.recalculate_reviewee_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_avg   numeric;
  v_count integer;
begin
  select avg(rating), count(*) into v_avg, v_count
  from public.reviews
  where reviewee_id = new.reviewee_id;

  update public.profiles
  set rating_avg = coalesce(v_avg, 0), rating_count = v_count
  where id = new.reviewee_id;

  -- No-ops if the reviewee has no worker_profiles row (e.g. a client being
  -- reviewed by a worker who has never become one themselves).
  update public.worker_profiles
  set rating_avg = coalesce(v_avg, 0), rating_count = v_count
  where id = new.reviewee_id;

  return new;
end;
$$;

drop trigger if exists reviews_recalculate_rating on public.reviews;
create trigger reviews_recalculate_rating
  after insert on public.reviews
  for each row execute function public.recalculate_reviewee_rating();

alter publication supabase_realtime add table public.reviews;
