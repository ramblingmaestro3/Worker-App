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
-- ============================================================================

delete from auth.users
where email like '%@seed.adwuma.test';

select count(*) as remaining_dummy_workers
from public.profile_contact
where email like '%@seed.adwuma.test';
