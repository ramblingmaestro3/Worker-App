-- ============================================================================
-- Migration: stop a worker from modifying a finished booking
-- ============================================================================
-- "The assigned worker can advance booking status and location" had no
-- status condition at all -- worker_id = auth.uid() on both sides. Wiring up
-- real advance-status/cancel UI (lib/api/bookings.ts's advanceBookingStatus,
-- JobDetailScreen) means this is now a reachable path, not dead code, so it
-- needs the same "can't touch a finished row" guard the client's own cancel
-- policy already has (see 20260906140000). New-value freedom is left alone
-- deliberately -- updateWorkerLocation() writes lat/lng without touching
-- status at all, and there's no product requirement yet for a strict
-- step-by-step state machine (accepted -> en_route -> ... ), just that a
-- completed or cancelled booking can't be reopened.
-- ============================================================================

drop policy if exists "The assigned worker can advance booking status and location" on public.bookings;
create policy "The assigned worker can advance booking status and location"
  on public.bookings for update
  to authenticated
  using (worker_id = auth.uid() and status not in ('completed', 'cancelled'))
  with check (worker_id = auth.uid());
