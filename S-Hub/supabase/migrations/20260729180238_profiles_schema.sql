-- ============================================================================
-- Migration: Create profiles table and handle auth user metadata
-- ============================================================================
-- This migration creates a `profiles` table that stores the user's role
-- (user/customer), full name, and other profile data. It also sets up a
-- trigger to automatically create a profile row when a new auth user is
-- created, using the user_metadata (full_name, role) passed during sign-up.
-- ============================================================================

-- Enable the pgcrypto extension for gen_random_uuid()
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Table: public.profiles
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'user' check (role in ('user', 'customer')),
  phone       text,
  email       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Enable Row Level Security
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Policy: Users can view their own profile
create policy "Profiles are viewable by owner"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Policy: Users can insert their own profile
create policy "Profiles are insertable by owner"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Policy: Users can update their own profile
create policy "Profiles are updatable by owner"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- Function: handle_new_user
-- Automatically creates a profile row when a new auth user signs up.
-- Reads `full_name` and `role` from the new user's metadata.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, phone, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'role', 'user'),
    new.phone,
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Trigger: on_auth_user_created
-- Fires the handle_new_user function whenever a new user is added to auth.users
-- ----------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Function: update_updated_at_column
-- Automatically updates the updated_at column on row update.
-- ----------------------------------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Trigger: profiles_updated_at
-- ----------------------------------------------------------------------------
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();