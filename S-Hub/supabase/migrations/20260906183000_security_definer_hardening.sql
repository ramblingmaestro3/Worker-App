-- ============================================================================
-- Migration: stop exposing trigger-only functions via PostgREST RPC
-- ============================================================================
-- Supabase's security advisor flags every SECURITY DEFINER function as
-- callable directly by anon/authenticated via /rest/v1/rpc/<name> unless
-- EXECUTE is explicitly revoked. Postgres itself refuses to invoke a
-- `returns trigger` (or `returns event_trigger`) function outside real
-- trigger context, so none of these were ever actually exploitable through
-- that surface -- but leaving EXECUTE granted is still noise/attack-surface
-- worth closing. This revokes it only from functions confirmed to be:
--   (a) trigger/event-trigger bodies, and
--   (b) never called directly via `.rpc()` from app or edge function code,
--       and never referenced inside any RLS policy expression (which would
--       need the querying role's own EXECUTE grant to evaluate).
--
-- Explicitly NOT touched (checked live against pg_policies + a repo-wide
-- `.rpc(` grep before writing this): accept_bid, finalize_verification,
-- check_ai_analyze_rate_limit (all called directly via .rpc() from app/edge
-- code) and is_blocked_with, is_bidder_on_request, owns_request,
-- request_is_open, is_blocked_pair (all evaluated inside live RLS policies
-- on service_requests/worker_bids/messages -- revoking these would break
-- those policies for real users).
--
-- Also fixes set_updated_at's mutable search_path (separately flagged,
-- unrelated function -- not SECURITY DEFINER, just missing a pinned path).
-- ============================================================================

revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.notify_bid_status_change() from anon, authenticated;
revoke execute on function public.notify_new_message() from anon, authenticated;
revoke execute on function public.notify_booking_status_change() from anon, authenticated;
revoke execute on function public.guard_profile_role_change() from anon, authenticated;
revoke execute on function public.guard_worker_verification_status_change() from anon, authenticated;
revoke execute on function public.guard_booking_status_transition() from anon, authenticated;
revoke execute on function public.recalculate_reviewee_rating() from anon, authenticated;
revoke execute on function public.trigger_send_push_notification() from anon, authenticated;
revoke execute on function public.rls_auto_enable() from anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
