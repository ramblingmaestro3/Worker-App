-- ============================================================================
-- Migration: constrain worker_bids status transitions + add booking cancel
-- ============================================================================
-- Two RLS gaps found in the 2026-09-06 audit:
--
-- 1. Both worker_bids UPDATE policies only checked ownership and the *new*
--    status value, never the row's *current* status (their USING clauses had
--    no status condition). That let a worker revert an already-accepted or
--    already-declined bid back to 'pending'/'withdrawn', and let a client
--    re-decline or re-counter a bid that was already accepted or withdrawn.
--    Fixed by adding "status in ('pending','countered')" to each USING
--    clause — the only two states either side is ever meant to act from
--    (see lib/api/workerBids.ts: matchCounterOffer/withdrawBid act on a
--    'pending' or 'countered' bid; counterBid/declineBid do the same from
--    the client's side).
--
-- 2. bookings had no client-side UPDATE policy at all, so a client could
--    never cancel a booking themselves. Adds one, mirroring the worker's
--    existing policy shape but restricted to only ever landing on
--    'cancelled', and only from a still-open state.
-- ============================================================================

drop policy if exists "Workers can update or withdraw their own pending bid" on public.worker_bids;
create policy "Workers can update or withdraw their own pending bid"
  on public.worker_bids for update
  to authenticated
  using (worker_id = auth.uid() and status in ('pending', 'countered'))
  with check (worker_id = auth.uid() and status in ('pending', 'withdrawn'));

drop policy if exists "Clients can counter or decline bids on their own requests" on public.worker_bids;
create policy "Clients can counter or decline bids on their own requests"
  on public.worker_bids for update
  to authenticated
  using (owns_request(request_id, auth.uid()) and status in ('pending', 'countered'))
  with check (owns_request(request_id, auth.uid()) and status in ('countered', 'declined'));

create policy "Clients can cancel their own booking"
  on public.bookings for update
  to authenticated
  using (client_id = auth.uid() and status not in ('completed', 'cancelled'))
  with check (client_id = auth.uid() and status = 'cancelled');
