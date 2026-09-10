-- ============================================================================
-- Rollback for supabase/seed_dummy_reviews.sql
-- ============================================================================
-- Removes ONLY the review history (fake clients + their requests/bids/bookings/
-- reviews) and leaves the dummy workers in place. Run the same way as the seed:
--
--   supabase db query --linked -f supabase/seed_dummy_reviews_rollback.sql
--
-- Deleting the dummy.client.* auth.users rows cascades:
--   profiles -> service_requests (client_id) -> bookings + worker_bids (request_id)
--   -> reviews + messages (booking_id).
--
-- The reviews_recalculate_rating trigger is AFTER INSERT only, so it does NOT
-- fire on delete — the dummy workers' rating_avg / rating_count would be left
-- frozen at whatever the reviews last computed. This resets them to the same
-- invented-number formula seed_dummy_workers.sql uses, i.e. back to the
-- pre-review-seed state.
--
-- (supabase/seed_dummy_workers_rollback.sql also removes all of this — its
--  '%@seed.adwuma.test' match covers dummy.client.* too.)
-- ============================================================================

begin;

delete from auth.users
where email like 'dummy.client.%@seed.adwuma.test';

update public.worker_profiles wp
set rating_avg   = round((3.5 + random() * 1.5)::numeric, 1),
    rating_count = (5 + floor(random() * 115))::int
from public.profile_contact pc
where pc.id = wp.id
  and pc.email like 'dummy.worker.%@seed.adwuma.test';

update public.profiles p
set rating_avg   = wp.rating_avg,
    rating_count = wp.rating_count
from public.worker_profiles wp
join public.profile_contact pc on pc.id = wp.id
where p.id = wp.id
  and pc.email like 'dummy.worker.%@seed.adwuma.test';

commit;

select
  (select count(*) from public.profile_contact where email like 'dummy.client.%@seed.adwuma.test') as remaining_fake_clients,
  (select count(*) from public.reviews r
     join public.profile_contact pc on pc.id = r.reviewee_id
    where pc.email like 'dummy.worker.%@seed.adwuma.test') as remaining_dummy_worker_reviews;
