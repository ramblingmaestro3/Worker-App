-- ============================================================================
-- Migration: Fix a pre-existing public-profile PII leak
-- ============================================================================
-- Discovered while live-testing the worker journey: a policy named
-- "Profiles are viewable by everyone" (qual: true) was already active on
-- public.profiles, undocumented in any migration file here -- meaning any
-- authenticated user could read every other user's phone number and email
-- address, not just their name. This was not introduced by this project's
-- migrations; it's pre-existing drift, found and closed as part of this
-- audit.
--
-- Replaces it with an explicit owner-read policy (without this, dropping
-- the leaky policy would also break users reading their own profile, since
-- no other SELECT policy here covers the owner case) alongside the two
-- narrower policies already added this session (verified-worker-is-public,
-- booking-participants-can-see-each-other) which remain sufficient for
-- everything currently wired.
-- ============================================================================

drop policy if exists "Profiles are viewable by everyone" on public.profiles;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);
