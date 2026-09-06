-- ============================================================================
-- Migration: enforce a real booking status state machine
-- ============================================================================
-- The RLS policies on bookings (client-cancel, worker-advance) scope *who*
-- can update a row and coarsely gate *when* (not already completed/cancelled),
-- but neither enforces *which* transitions are valid -- a worker could jump
-- straight from 'accepted' to 'completed', skipping en_route/arrived/
-- in_progress, and RLS alone can't see OLD vs NEW status together the way a
-- trigger can. This adds the missing fine-grained guard as a BEFORE UPDATE
-- trigger:
--   - any status -> itself: always fine (e.g. updateWorkerLocation() touches
--     lat/lng without changing status).
--   - any non-terminal status -> 'cancelled': fine (the client's cancel path;
--     RLS already restricts who can set this and to their own booking).
--   - the exact next step in accepted -> en_route -> arrived -> in_progress
--     -> completed: fine.
--   - anything else (skipping a step, moving backward, re-opening a
--     finished booking): rejected with a clear error.
-- ============================================================================

create or replace function public.guard_booking_status_transition()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'cancelled' then
    if old.status in ('completed', 'cancelled') then
      raise exception 'Cannot cancel a booking that is already %.', old.status;
    end if;
    return new;
  end if;

  if (old.status, new.status) in (
    ('accepted', 'en_route'),
    ('en_route', 'arrived'),
    ('arrived', 'in_progress'),
    ('in_progress', 'completed')
  ) then
    return new;
  end if;

  raise exception 'Invalid booking status transition: % -> %.', old.status, new.status;
end;
$$;

drop trigger if exists bookings_guard_status_transition on public.bookings;
create trigger bookings_guard_status_transition
  before update on public.bookings
  for each row execute function public.guard_booking_status_transition();
