-- ============================================================================
-- Migration: close a gap letting a worker cancel a client's booking
-- ============================================================================
-- Found while adding the booking-status notification trigger: the worker's
-- UPDATE policy on bookings ("The assigned worker can advance booking status
-- and location") only checks `worker_id = auth.uid()` in WITH CHECK -- it
-- never restricts which status the worker may set. guard_booking_status_
-- transition (20260906160000) allows any non-terminal -> 'cancelled' move
-- for ANY actor, on the explicit assumption (stated in that migration's own
-- comment) that "RLS already restricts who can set this" to the client. That
-- assumption was wrong for the worker's policy, so a worker could set their
-- own accepted/en_route/etc. booking straight to 'cancelled' -- a path meant
-- to be client-only (see "Clients can cancel their own booking").
--
-- Fix: the worker's WITH CHECK now excludes 'cancelled' as a target status,
-- same-status updates (e.g. updateWorkerLocation() pinging lat/lng without
-- changing status) remain unaffected since they don't touch the status
-- column's value at all.
-- ============================================================================

drop policy if exists "The assigned worker can advance booking status and location" on public.bookings;
create policy "The assigned worker can advance booking status and location"
  on public.bookings for update
  to authenticated
  using (worker_id = auth.uid() and status not in ('completed', 'cancelled'))
  with check (worker_id = auth.uid() and status <> 'cancelled');
