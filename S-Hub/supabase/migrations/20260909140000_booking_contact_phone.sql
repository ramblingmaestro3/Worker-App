-- ============================================================================
-- Migration: let booking participants get each other's phone number
-- ============================================================================
-- profile_contact.phone is owner-only-readable (20260901140500), so a client
-- can't see their worker's number to call them (or vice versa). This RPC
-- returns the OTHER party's phone for a booking the caller is actually part
-- of — SECURITY DEFINER so it can read profile_contact, gated on participation
-- so it's not a general phone-lookup. Powers the tap-to-call button on the
-- booking / chat screens.
-- ============================================================================

create or replace function public.get_booking_contact_phone(p_booking_id uuid)
returns text
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_booking public.bookings;
  v_other   uuid;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if v_booking.id is null then
    return null;
  end if;

  if auth.uid() = v_booking.client_id then
    v_other := v_booking.worker_id;
  elsif auth.uid() = v_booking.worker_id then
    v_other := v_booking.client_id;
  else
    return null; -- caller isn't on this booking
  end if;

  return (select phone from public.profile_contact where id = v_other);
end;
$$;

grant execute on function public.get_booking_contact_phone(uuid) to authenticated;
