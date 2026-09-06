-- ============================================================================
-- Migration: the previous revoke targeted the wrong grantee
-- ============================================================================
-- 20260906183000 revoked EXECUTE from anon/authenticated specifically, but
-- live verification (has_function_privilege) showed those functions still
-- executable by both roles afterward. Cause: Postgres grants EXECUTE on
-- every new function to the PUBLIC pseudo-role by default, and
-- information_schema.routine_privileges confirmed these ten functions carry
-- exactly that PUBLIC grant (not a separate named grant to anon/
-- authenticated) -- revoking from named roles does nothing while PUBLIC
-- still has it, since PUBLIC's privilege applies to every role. This revokes
-- from PUBLIC instead, which is what's actually needed.
-- ============================================================================

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.notify_bid_status_change() from public;
revoke execute on function public.notify_new_message() from public;
revoke execute on function public.notify_booking_status_change() from public;
revoke execute on function public.guard_profile_role_change() from public;
revoke execute on function public.guard_worker_verification_status_change() from public;
revoke execute on function public.guard_booking_status_transition() from public;
revoke execute on function public.recalculate_reviewee_rating() from public;
revoke execute on function public.trigger_send_push_notification() from public;
revoke execute on function public.rls_auto_enable() from public;
