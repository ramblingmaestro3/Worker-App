-- ============================================================================
-- Rollback for supabase/seed_dummy_workers.sql
-- ============================================================================
-- Deletes every dummy worker account created by that script. profiles,
-- profile_contact, worker_profiles and worker_verifications all reference
-- auth.users(id) (directly or transitively) with `on delete cascade`, so
-- deleting the auth.users rows removes everything in one shot.
--
-- Run the same way as the seed script:
--   supabase db query --linked -f supabase/seed_dummy_workers_rollback.sql
--
-- The '%@seed.adwuma.test' match also covers the dummy.client.* accounts from
-- seed_dummy_reviews.sql, so this removes the review history in the same pass
-- (their service_requests/bids/bookings/reviews all cascade).
-- ============================================================================

delete from auth.users
where email like '%@seed.adwuma.test';

select count(*) as remaining_dummy_workers
from public.profile_contact
where email like '%@seed.adwuma.test';
