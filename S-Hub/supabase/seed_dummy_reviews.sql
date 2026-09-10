-- ============================================================================
-- One-off seed script: review history behind the dummy workers' ratings
-- ============================================================================
-- Run AFTER supabase/seed_dummy_workers.sql. NOT a schema migration — do not
-- put this in supabase/migrations/ and do not run it through `supabase db push`.
--
--   Option A (Supabase Dashboard): SQL Editor -> paste this whole file -> Run
--   Option B (CLI):                supabase db query --linked -f supabase/seed_dummy_reviews.sql
--
-- Why:
--   seed_dummy_workers.sql gives every dummy worker a rating_avg (3.5-5.0) and a
--   rating_count (5-119) that are pure invented numbers — nothing backs them.
--   The public worker-profile screen and BidComparison show those figures, and
--   a worker card that says "4.8 (73)" with zero actual reviews is a hollow
--   demo. This script builds the real rows underneath each VERIFIED dummy
--   worker's rating:
--
--     150 fake "client" accounts  (dummy.client.N@seed.adwuma.test)
--       -> one completed service_request per review
--       -> one accepted worker_bid  per review
--       -> one completed booking     per review
--       -> one review (client -> worker), rating sampled around the worker's
--          seeded average, with a realistic comment ~65% of the time.
--
--   Review count per worker = min(seeded rating_count, ~1 job / 2 days since the
--   account's join date) so a 3-week-old worker doesn't end up with 90 reviews.
--   The reviews_recalculate_rating trigger keeps worker_profiles + profiles
--   rating_avg / rating_count in step as each row goes in; a final scoped
--   recompute makes sure the shown number is exactly the average of the rows
--   that landed.
--
--   Only VERIFIED dummy workers get reviews (pending/rejected workers never
--   surface in client browse/search, and "completed jobs for a worker who was
--   never verified" makes no sense).
--
-- To remove just this (keeping the dummy workers): seed_dummy_reviews_rollback.sql
-- To remove everything: seed_dummy_workers_rollback.sql (cascades through the
--   dummy.client.* accounts too, since they share the @seed.adwuma.test domain).
-- ============================================================================

begin;

-- ---- guards -----------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.profile_contact where email like 'dummy.worker.%@seed.adwuma.test') then
    raise exception 'No dummy workers found. Run supabase/seed_dummy_workers.sql first.';
  end if;
  if exists (select 1 from public.profile_contact where email like 'dummy.client.%@seed.adwuma.test') then
    raise exception 'Dummy reviews already seeded. Run supabase/seed_dummy_reviews_rollback.sql first.';
  end if;
end $$;

-- ---- 1. fake client accounts ----------------------------------------------
-- auth.users insert fires handle_new_user() -> profiles (role 'client') + profile_contact.
create temporary table _seed_clients on commit drop as
select
  gen_random_uuid() as id,
  'dummy.client.' || gs.n || '@seed.adwuma.test' as email,
  '+2335' || lpad((20000000 + gs.n)::text, 8, '0') as phone,
  (array[
    'Kwame','Ama','Kofi','Akosua','Yaw','Abena','Kwabena','Adjoa','Kwaku','Efua',
    'Kojo','Yaa','Kwesi','Esi','Nii','Naa','Mawuli','Selorm','Elikem','Sena',
    'Fuseini','Zainab','Alhassan','Aisha','Kwadwo','Afia','Kobina','Araba','Nana','Ato'
  ])[1 + floor(random() * 30)::int]
  || ' ' ||
  (array[
    'Mensah','Owusu','Asante','Boateng','Osei','Agyeman','Appiah','Amoah','Darko','Adjei',
    'Tetteh','Ankrah','Quaye','Aryee','Sackey','Nartey','Larbi','Frimpong','Yeboah','Danso',
    'Nyarko','Ampofo','Gyasi','Baidoo','Okine','Lartey','Adofo','Kutu','Bediako','Addo'
  ])[1 + floor(random() * 30)::int] as full_name,
  now() - (floor(random() * 220) || ' days')::interval as created_at
from generate_series(1, 150) as gs(n);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, phone, phone_confirmed_at
)
select
  '00000000-0000-0000-0000-000000000000',
  id, 'authenticated', 'authenticated', email,
  crypt(gen_random_uuid()::text, gen_salt('bf')),
  created_at,
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', full_name, 'role', 'client'),
  created_at, created_at, phone, created_at
from _seed_clients
on conflict (id) do nothing;

-- ---- 2. the verified dummy workers we're backing ------------------------
create temporary table _seed_targets on commit drop as
select
  wp.id as worker_id,
  case
    when wp.bio ilike '%plumber%'        then 'plumbing'
    when wp.bio ilike '%electrician%'     then 'electrical'
    when wp.bio ilike '%carpenter%'       then 'carpentry'
    when wp.bio ilike '%painter%'         then 'painting'
    when wp.bio ilike '%cleaner%'         then 'cleaning'
    when wp.bio ilike '%mason%'           then 'masonry'
    when wp.bio ilike '%welder%'          then 'welding'
    when wp.bio ilike '%refrigeration%'   then 'ac'
    when wp.bio ilike '%tiler%'           then 'tiling'
    when wp.bio ilike '%roofing%'         then 'roofing'
    when wp.bio ilike '%security%'        then 'security'
    else 'other'
  end as category,
  split_part(wp.address, ', ', 1) as city,
  case when split_part(wp.address, ', ', 2) in (
    'Ahafo','Ashanti','Bono','Bono East','Central','Eastern','Greater Accra','North East',
    'Northern','Oti','Savannah','Upper East','Upper West','Volta','Western','Western North'
  ) then split_part(wp.address, ', ', 2) else 'Greater Accra' end as region,
  wp.latitude  as lat,
  wp.longitude as lng,
  greatest(least(wp.rating_avg, 5.0), 3.3) as target_avg,
  coalesce(nullif(wp.per_job_rate, 0), nullif(wp.hourly_rate, 0) * 4, 200) as price_base,
  greatest(3, least(
    coalesce(nullif(wp.rating_count, 0), 12),
    (extract(epoch from (now() - u.created_at)) / 86400.0 / 2.0)::int + 3,
    140
  )) as n_reviews
from public.worker_profiles wp
join public.profile_contact pc on pc.id = wp.id
join auth.users u            on u.id  = wp.id
where pc.email like 'dummy.worker.%@seed.adwuma.test'
  and wp.verification_status = 'verified';

-- ---- 3. the plan: one row per review, with every id pre-generated -------
create temporary table _review_plan on commit drop as
with picked as (
  select
    gen_random_uuid() as request_id,
    gen_random_uuid() as bid_id,
    gen_random_uuid() as booking_id,
    gen_random_uuid() as review_id,
    t.worker_id, t.category, t.city, t.region, t.target_avg, t.price_base,
    t.lat + (random() - 0.5) * 0.05 as lat,
    t.lng + (random() - 0.5) * 0.05 as lng,
    c.id as client_id,
    -- booking sits somewhere in this client's / worker's shared history
    greatest(cu.created_at, wu.created_at)
      + (now() - greatest(cu.created_at, wu.created_at)) * (0.02 + random() * 0.80) as req_created
  from _seed_targets t
  cross join lateral (
    select id from _seed_clients order by random() limit t.n_reviews
  ) c
  join auth.users cu on cu.id = c.id
  join auth.users wu on wu.id = t.worker_id
),
timed as (
  select
    p.*,
    least(now() - interval '3 hours',
          p.req_created + (interval '6 hours' * random()) + interval '1 day' * (0.2 + random() * 2.5)
    ) as completed_at
  from picked p
)
select
  t.*,
  t.req_created + (interval '3 hours' * random()) as accepted_at,
  least(now() - interval '1 hour', t.completed_at + interval '1 day' * (0.3 + random() * 4)) as review_created,
  least(5, greatest(1, round(t.target_avg + (random() + random() + random() - 1.5) * 1.15)))::smallint as rating,
  round((t.price_base * (0.6 + random() * 0.9))::numeric, 2) as price,
  case when random() < 0.34 then null else (array[
    'Very professional and finished on time.',
    'Good work, fair price. Would hire again.',
    'Came prepared with all his tools. Neat job.',
    'Communication was excellent throughout.',
    'Solved the problem quickly. Highly recommend.',
    'Arrived a bit late but the work was solid.',
    'Polite and hardworking. Cleaned up after himself.',
    'Knew exactly what to do, no wasted time.',
    'Reasonable pricing and quality work.',
    'Did the job well but took longer than expected.',
    'Excellent service, the place looks great now.',
    'Fixed everything on the first visit.',
    'Respectful and skilled. Thank you!',
    'Honest about the cost from the start.',
    'Would have liked more updates, but the result was good.',
    'Top quality. Everyone should book this one.',
    'Punctual, tidy and very knowledgeable.',
    'The finishing could have been a little cleaner.',
    'Handled a tricky job with no stress.',
    'Great attitude and a strong work ethic.',
    'Charged exactly what we agreed, no surprises.',
    'Very patient explaining what was wrong.',
    'Job done well and the site was left clean.',
    'Reliable - showed up when he said he would.',
    'Small delay on parts but overall happy.',
    'Impressive craftsmanship, worth every cedi.',
    'Friendly and got straight to work.',
    'Will definitely call again for future work.'
  ])[1 + floor(random() * 28)::int] end as comment
from timed t;

-- ---- 4. insert the chain (RLS is bypassed running as the table owner) ---
insert into public.service_requests
  (id, client_id, category, description, location_string, latitude, longitude,
   location_region, initial_offer_price, status, scheduled_for, created_at, updated_at)
select
  p.request_id, p.client_id, p.category,
  initcap(p.category) || ' job in ' || p.city,
  p.city || ', ' || p.region, p.lat, p.lng,
  p.region, p.price, 'completed', p.req_created, p.req_created, p.completed_at
from _review_plan p;

insert into public.worker_bids
  (id, request_id, worker_id, proposed_price, message, status, created_at, updated_at)
select
  p.bid_id, p.request_id, p.worker_id, p.price,
  'ETA: 30 min. Ready to start.', 'accepted', p.req_created, p.accepted_at
from _review_plan p;

insert into public.bookings
  (id, request_id, bid_id, client_id, worker_id, status, accepted_at, completed_at, created_at, updated_at)
select
  p.booking_id, p.request_id, p.bid_id, p.client_id, p.worker_id,
  'completed', p.accepted_at, p.completed_at, p.accepted_at, p.completed_at
from _review_plan p;

insert into public.reviews (id, booking_id, reviewer_id, reviewee_id, rating, comment, created_at)
select p.review_id, p.booking_id, p.client_id, p.worker_id, p.rating, p.comment, p.review_created
from _review_plan p;

-- ---- 5. recompute the aggregates from the rows that landed -----------------
-- The reviews_recalculate_rating trigger already updated these incrementally as
-- each row went in; this is a scoped, authoritative re-run over the dummy
-- workers only, so a real worker's rating is never touched.
with agg as (
  select r.reviewee_id, round(avg(r.rating)::numeric, 2) as avg_r, count(*)::int as cnt
  from public.reviews r
  where r.reviewee_id in (select worker_id from _seed_targets)
  group by r.reviewee_id
)
update public.worker_profiles wp
set rating_avg = agg.avg_r, rating_count = agg.cnt
from agg
where agg.reviewee_id = wp.id;

with agg as (
  select r.reviewee_id, round(avg(r.rating)::numeric, 2) as avg_r, count(*)::int as cnt
  from public.reviews r
  where r.reviewee_id in (select worker_id from _seed_targets)
  group by r.reviewee_id
)
update public.profiles p
set rating_avg = agg.avg_r, rating_count = agg.cnt
from agg
where agg.reviewee_id = p.id;

-- ---- report (before commit drops the temp tables) ---------------------------
select
  (select count(*) from _seed_clients)                          as fake_clients,
  (select count(*) from _seed_targets)                          as workers_reviewed,
  (select count(*) from _review_plan)                           as reviews_created,
  (select round(avg(rating), 2) from _review_plan)              as mean_star,
  (select min(cnt) from (select count(*) cnt from _review_plan group by worker_id) x) as min_per_worker,
  (select max(cnt) from (select count(*) cnt from _review_plan group by worker_id) x) as max_per_worker;

commit;

-- Post-commit sanity check: ratings now match their review rows.
select
  round(avg(wp.rating_avg), 2)  as avg_rating_shown,
  round(avg(wp.rating_count), 1) as avg_reviews_each,
  sum(wp.rating_count)          as total_reviews
from public.worker_profiles wp
join public.profile_contact pc on pc.id = wp.id
where pc.email like 'dummy.worker.%@seed.adwuma.test'
  and wp.verification_status = 'verified';
