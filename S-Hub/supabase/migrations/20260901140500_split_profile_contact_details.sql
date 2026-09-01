-- ============================================================================
-- Migration: split phone/email into an owner-only-readable table
-- ============================================================================
-- "Verified workers' basic profile is public" and "Booking participants can
-- view each other's profile" (20260822010850_phase3_profile_visibility.sql)
-- grant SELECT on the *entire* public.profiles row to any authenticated user
-- for verified workers / the other side of a booking. RLS is row-level, not
-- column-level, so despite both policies' stated intent of exposing only
-- name/avatar, they also hand out profiles.phone and profiles.email to any
-- authenticated user querying those columns directly via supabase-js/REST —
-- the same PII-leak class already found and closed once in
-- 20260822012601_phase3_fix_public_profile_leak.sql, reintroduced here in
-- narrower form.
--
-- Rather than trying to fake column-level RLS, phone/email move to their own
-- table with a strict owner-only policy. The existing "public" policies on
-- profiles are then safe by construction: the row they expose no longer has
-- anything sensitive left in it.
-- ============================================================================

create table public.profile_contact (
  id    uuid primary key references public.profiles(id) on delete cascade,
  phone text,
  email text
);

alter table public.profile_contact enable row level security;

create policy "Users can view their own contact details"
  on public.profile_contact for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert their own contact details"
  on public.profile_contact for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own contact details"
  on public.profile_contact for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

insert into public.profile_contact (id, phone, email)
select id, phone, email from public.profiles
on conflict (id) do nothing;

alter table public.profiles drop column phone;
alter table public.profiles drop column email;

-- handle_new_user now splits the insert across both tables.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'role' = 'worker' then 'worker' else 'client' end
  )
  on conflict (id) do nothing;

  insert into public.profile_contact (id, phone, email)
  values (new.id, new.phone, new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;
