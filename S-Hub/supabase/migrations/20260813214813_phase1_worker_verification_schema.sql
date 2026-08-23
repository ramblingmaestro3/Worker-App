-- ============================================================================
-- Migration: Worker profiles, verification, and role model fixes
-- ============================================================================
-- Note: the remote database already diverged from the checked-in migration
-- history before this change (functions/columns existed that no local
-- migration file recorded, e.g. public.set_updated_at() instead of the
-- public.update_updated_at_column() the old "202" file described, and
-- profiles already had no `email` column and an already-correct
-- 'customer'|'worker' role constraint). This migration is written against
-- the VERIFIED actual remote schema, not the stale local file.
--
-- It also drops a set of orphaned, unwired tables (workers, jobs, bids,
-- bookings, conversations, messages, reviews) that existed on the remote
-- database with no corresponding migration file and no application code
-- referencing them (confirmed empty, 0 rows in every one) — replaced here
-- with the schema design actually used by the app going forward.
--
-- Adds:
--   - worker_profiles: public-safe, searchable worker data (skills, rates,
--     location, rating). Readable by anyone once verified.
--   - worker_verifications: sensitive ID/selfie data. Owner-only, never
--     exposed to other users. Its `status` mirrors into
--     worker_profiles.verification_status via trigger so search/list
--     queries never need to touch the sensitive table.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Drop orphaned, unwired, empty tables from an earlier exploratory schema.
-- ----------------------------------------------------------------------------
drop table if exists public.reviews cascade;
drop table if exists public.messages cascade;
drop table if exists public.bookings cascade;
drop table if exists public.bids cascade;
drop table if exists public.conversations cascade;
drop table if exists public.jobs cascade;
drop table if exists public.workers cascade;

-- ----------------------------------------------------------------------------
-- profiles: add email + rating rollup columns (role/'customer'|'worker'
-- constraint already correct on remote, left untouched).
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists email text,
  add column if not exists rating_avg numeric not null default 0,
  add column if not exists rating_count integer not null default 0;

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
    coalesce(new.raw_user_meta_data ->> 'role', 'customer'),
    new.phone,
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Table: public.worker_profiles
-- ----------------------------------------------------------------------------
create table if not exists public.worker_profiles (
  id                    uuid primary key references public.profiles(id) on delete cascade,
  skills                text[] not null default '{}',
  bio                   text,
  years_experience      integer,
  hourly_rate           numeric,
  per_job_rate          numeric,
  availability          jsonb not null default '{}'::jsonb,
  latitude              double precision,
  longitude             double precision,
  address               text,
  verification_status   text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  rating_avg            numeric not null default 0,
  rating_count          integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.worker_profiles enable row level security;

create policy "Worker profiles are viewable by owner"
  on public.worker_profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Verified worker profiles are viewable by any authenticated user"
  on public.worker_profiles for select
  to authenticated
  using (verification_status = 'verified');

create policy "Worker profiles are insertable by owner"
  on public.worker_profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Worker profiles are updatable by owner"
  on public.worker_profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop trigger if exists worker_profiles_updated_at on public.worker_profiles;
create trigger worker_profiles_updated_at
  before update on public.worker_profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Table: public.worker_verifications
-- ----------------------------------------------------------------------------
create table if not exists public.worker_verifications (
  id               uuid primary key references public.profiles(id) on delete cascade,
  id_type          text check (id_type in ('ghana_card', 'voter_id', 'passport', 'drivers_licence')),
  id_number        text,
  id_document_url  text,
  selfie_url       text,
  status           text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  submitted_at     timestamptz not null default now(),
  reviewed_at      timestamptz
);

alter table public.worker_verifications enable row level security;

create policy "Worker verifications are viewable by owner"
  on public.worker_verifications for select
  to authenticated
  using (auth.uid() = id);

create policy "Worker verifications are insertable by owner"
  on public.worker_verifications for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Worker verifications are updatable by owner"
  on public.worker_verifications for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Mirror worker_verifications.status into worker_profiles.verification_status
-- so search/list queries never need to touch the sensitive table.
create or replace function public.sync_worker_verification_status()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.worker_profiles
  set verification_status = new.status
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_worker_verification_status_change on public.worker_verifications;
create trigger on_worker_verification_status_change
  after insert or update of status on public.worker_verifications
  for each row execute function public.sync_worker_verification_status();

-- ----------------------------------------------------------------------------
-- Storage buckets
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('id-documents', 'id-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', true)
on conflict (id) do nothing;

create policy "Owner can read own id documents"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'id-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Owner can upload own id documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'id-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Owner can update own id documents"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'id-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Job photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'job-photos');

create policy "Authenticated users can upload job photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'job-photos');
