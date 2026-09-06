-- ============================================================================
-- Migration: real saved_locations table
-- ============================================================================
-- SavedLocations.tsx previously rendered three hardcoded "Home/Work/Gym"
-- places plus fake "recent searches" for every account, regardless of what
-- that user actually saved (2026-09-06 audit). This backs "Saved Places"
-- with a real, owner-scoped table. "Recent Searches" is a separate, smaller
-- concern (no search-history table exists anywhere) and is left as an honest
-- static list of example queries in the UI, not wired here.
-- ============================================================================

create table public.saved_locations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  label      text not null,
  address    text not null,
  latitude   double precision not null,
  longitude  double precision not null,
  created_at timestamptz not null default now()
);

create index if not exists saved_locations_user_id_idx on public.saved_locations(user_id);

alter table public.saved_locations enable row level security;

create policy "Users can view their own saved locations"
  on public.saved_locations for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can save their own locations"
  on public.saved_locations for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can delete their own saved locations"
  on public.saved_locations for delete
  to authenticated
  using (user_id = auth.uid());
