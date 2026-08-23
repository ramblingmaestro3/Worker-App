-- ============================================================================
-- Migration: Cross-user profile visibility (additive)
-- ============================================================================
-- profiles RLS was owner-only-read from the very first migration. That's
-- fine for account data, but it means a worker's job feed can't show a
-- verified worker's name in search, and a booking's two participants can't
-- see each other's name/avatar — both needed for the worker-side job feed,
-- bid, and assignment screens landing in this pass.
-- ============================================================================

create policy "Verified workers' basic profile is public"
  on public.profiles for select
  to authenticated
  using (
    role = 'worker'
    and exists (
      select 1 from public.worker_profiles wp
      where wp.id = profiles.id and wp.verification_status = 'verified'
    )
  );

create policy "Booking participants can view each other's profile"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where (b.client_id = auth.uid() and b.worker_id = profiles.id)
         or (b.worker_id = auth.uid() and b.client_id = profiles.id)
    )
  );
