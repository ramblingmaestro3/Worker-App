-- ============================================================================
-- Migration: Fix RLS infinite recursion between service_requests and worker_bids
-- ============================================================================
-- service_requests' SELECT policy checks worker_bids (via `exists`), and
-- worker_bids' SELECT/INSERT/UPDATE policies check service_requests back --
-- evaluating either policy re-triggers the other's RLS, which recurses
-- forever. Fix: SECURITY DEFINER helper functions bypass RLS internally
-- for these specific existence checks, breaking the cycle while keeping
-- the same access rules.
-- ============================================================================

create or replace function public.is_bidder_on_request(p_request_id uuid, p_worker_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.worker_bids b
    where b.request_id = p_request_id and b.worker_id = p_worker_id
  );
$$;

create or replace function public.owns_request(p_request_id uuid, p_client_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.service_requests r
    where r.id = p_request_id and r.client_id = p_client_id
  );
$$;

create or replace function public.request_is_open(p_request_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.service_requests r
    where r.id = p_request_id and r.status = 'seeking_bids'
  );
$$;

-- ----------------------------------------------------------------------------
-- service_requests: replace the SELECT policy to use the helper function
-- ----------------------------------------------------------------------------
drop policy if exists "Requests are viewable by owner, open listings, or bidders" on public.service_requests;

create policy "Requests are viewable by owner, open listings, or bidders"
  on public.service_requests for select
  to authenticated
  using (
    client_id = auth.uid()
    or status = 'seeking_bids'
    or public.is_bidder_on_request(id, auth.uid())
  );

-- ----------------------------------------------------------------------------
-- worker_bids: replace policies that referenced service_requests directly
-- ----------------------------------------------------------------------------
drop policy if exists "Bids are viewable by the request owner or the bidder" on public.worker_bids;

create policy "Bids are viewable by the request owner or the bidder"
  on public.worker_bids for select
  to authenticated
  using (
    worker_id = auth.uid()
    or public.owns_request(request_id, auth.uid())
  );

drop policy if exists "Verified workers can bid on open requests" on public.worker_bids;

create policy "Verified workers can bid on open requests"
  on public.worker_bids for insert
  to authenticated
  with check (
    worker_id = auth.uid()
    and exists (
      select 1 from public.worker_profiles wp
      where wp.id = auth.uid() and wp.verification_status = 'verified'
    )
    and public.request_is_open(request_id)
  );

drop policy if exists "Clients can counter or decline bids on their own requests" on public.worker_bids;

create policy "Clients can counter or decline bids on their own requests"
  on public.worker_bids for update
  to authenticated
  using (public.owns_request(request_id, auth.uid()))
  with check (public.owns_request(request_id, auth.uid()) and status in ('countered', 'declined'));
