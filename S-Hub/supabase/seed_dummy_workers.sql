-- ============================================================================
-- One-off seed script: dummy worker accounts for browse/search testing
-- ============================================================================
-- NOT a schema migration — do not put this in supabase/migrations/ and do not
-- run it through `supabase db push`. Run it once, directly, against the
-- project database:
--
--   Option A (Supabase Dashboard): SQL Editor -> paste this whole file -> Run
--   Option B (CLI):                supabase db query --linked -f supabase/seed_dummy_workers.sql
--
-- What it does:
--   Creates 96 fake worker accounts (auth.users -> profiles + profile_contact
--   via the existing handle_new_user trigger -> worker_profiles ->
--   worker_verifications) -- a fixed 8 workers per category (not random
--   sampling, so every trade -- plumbing, electrical, carpentry, painting,
--   cleaning, masonry, welding, AC, tiling, roofing, security, handyman --
--   is guaranteed real coverage, not just whichever categories luck landed
--   on), spread across Ghanaian regions/cities, with varied rates, ratings,
--   availability and verification status (~85% verified, ~10% pending, ~5%
--   rejected) so the client-side worker search/browse screens have real
--   variety in every category instead of just the ~2 real workers currently
--   in the database.
--
-- All fake accounts use the email domain `@seed.adwuma.test` and a random
-- unguessable password — they can never sign in, they exist purely so the
-- public.profiles/worker_profiles FK chain has something to point at.
--
-- To remove all of this later, run supabase/seed_dummy_workers_rollback.sql
-- (a single DELETE on auth.users cascades through every table it created).
-- ============================================================================

begin;

create temporary table _seed_categories (
  category    text,
  skills      text[],
  bio         text,
  rate_min    numeric,
  rate_max    numeric,
  perjob_min  numeric,
  perjob_max  numeric
) on commit drop;

insert into _seed_categories (category, skills, bio, rate_min, rate_max, perjob_min, perjob_max) values
('plumbing',  array['Pipe Repair','Leak Detection','Bathroom Fitting','Drainage','Water Heater Installation','Pump Installation','Kitchen Plumbing'], 'Experienced plumber handling leaks, installations and drainage work across homes and small businesses.', 25,60, 150,900),
('electrical', array['Wiring','Socket Installation','Circuit Breaker Repair','Lighting Installation','Generator Setup','Fault Finding'], 'Electrician for wiring, repairs and installations, residential and commercial.', 30,70, 150,1000),
('carpentry', array['Furniture Repair','Custom Cabinets','Door Installation','Wood Flooring','Roof Framing'], 'Skilled carpenter for furniture, fittings and structural woodwork.', 20,55, 120,800),
('painting', array['Interior Painting','Exterior Painting','Wall Texturing','Spray Painting','Waterproofing'], 'Professional painter delivering clean, durable finishes for homes and offices.', 18,45, 200,1200),
('cleaning', array['Deep Cleaning','Move-in/Move-out Cleaning','Office Cleaning','Upholstery Cleaning','Post-Construction Cleaning'], 'Reliable cleaner offering thorough home and office cleaning services.', 15,35, 100,500),
('masonry', array['Block Laying','Plastering','Tiling Foundations','Concrete Work','Wall Construction'], 'Mason with years of experience in block work, plastering and concrete finishing.', 25,60, 300,1500),
('welding', array['Gate Fabrication','Window Grills','Metal Furniture','Structural Welding','Repair Welding'], 'Welder and metal fabricator for gates, grills and structural work.', 25,65, 200,1200),
('ac', array['AC Installation','AC Servicing','Refrigerator Repair','Gas Refill','Duct Cleaning'], 'AC and refrigeration technician handling installation, servicing and repairs.', 35,80, 200,1000),
('tiling', array['Floor Tiling','Wall Tiling','Tile Repair','Grouting','Bathroom Tiling'], 'Tiler specializing in floor and wall tiling for homes and offices.', 25,55, 250,1400),
('roofing', array['Roof Repair','Roof Installation','Gutter Installation','Leak Repair','Roof Sheeting'], 'Roofing specialist for repairs, new installations and leak fixes.', 30,70, 400,2000),
('security', array['CCTV Installation','Alarm Systems','Access Control','Camera Repair','Security Consulting'], 'Security systems installer for CCTV, alarms and access control.', 30,75, 300,1500),
('other', array['Furniture Assembly','General Repairs','Odd Jobs','Home Maintenance','Appliance Installation'], 'Reliable handyman for a wide range of home repair and maintenance tasks.', 15,40, 80,500),
('mechanic', array [  'Car Repair', 'Motorcycle Repair', 'Engine Repair', 'Brake Repair', 'Suspension Repair', 'Car Service', 'Engine Tuning', 'Transmission Repair', 'Clutch Repair', 'Battery Replacement'],  'Auto mechanic providing engine diagnostics, repairs and routine maintenance for cars and light vehicles.', 20, 55, 100, 1200)

create temporary table _seed_regions (
  region text,
  city   text,
  lat    double precision,
  lng    double precision
) on commit drop;

insert into _seed_regions (region, city, lat, lng) values
('Greater Accra','Accra',5.6037,-0.1870),
('Greater Accra','Tema',5.6698,-0.0166),
('Ashanti','Kumasi',6.6885,-1.6244),
('Ashanti','Obuasi',6.2025,-1.6708),
('Western','Takoradi',4.8845,-1.7554),
('Central','Cape Coast',5.1053,-1.2466),
('Eastern','Koforidua',6.0940,-0.2591),
('Volta','Ho',6.6110,0.4708),
('Northern','Tamale',9.4008,-0.8393),
('Bono','Sunyani',7.3399,-2.3268);

create temporary table _seed_workers (
  id               uuid primary key,
  email            text,
  phone            text,
  full_name        text,
  category         text,
  skills           text[],
  bio              text,
  rate_min         numeric,
  rate_max         numeric,
  perjob_min       numeric,
  perjob_max       numeric,
  region           text,
  city             text,
  lat              double precision,
  lng              double precision,
  years_experience integer,
  languages        text,
  is_online        boolean,
  target_status    text,
  id_number        text,
  submitted_at     timestamptz,
  created_at       timestamptz
) on commit drop;

insert into _seed_workers
select
  gen_random_uuid(),
  'dummy.worker.' || base.n || '@seed.adwuma.test',
  '+2332' || lpad((10000000 + base.n)::text, 8, '0'),
  (array['Kwame','Kofi','Kwabena','Yaw','Kwaku','Kojo','Kwesi','Kwamena','Nii','Fiifi',
         'Mawuli','Selorm','Elikem','Fuseini','Alhassan','Iddrisu','Kwadwo','Kobina','Nana','Ato',
         'Akosua','Abena','Ama','Efua','Yaa','Adjoa','Esi','Adwoa','Naa','Sena',
         'Zainab','Aisha','Afia','Araba','Akua','Abla','Delali','Enyonam','Baaba','Maame'
  ])[1 + floor(random()*40)::int]
  || ' ' ||
  (array['Mensah','Owusu','Asante','Boateng','Osei','Agyeman','Appiah','Amoah','Darko','Adjei',
         'Tetteh','Ankrah','Quaye','Aryee','Sackey','Nartey','Larbi','Frimpong','Yeboah','Danso',
         'Attipoe','Nyarko','Ampofo','Gyasi','Baidoo','Okine','Lartey','Adofo','Kutu','Bediako'
  ])[1 + floor(random()*30)::int],
  base.category, base.skills, base.bio, base.rate_min, base.rate_max, base.perjob_min, base.perjob_max,
  base.region, base.city, base.lat, base.lng,
  1 + floor(random()*15)::int,
  (
    select string_agg(x, ', ') from (
      select unnest(array['English','Twi','Ga','Ewe','Hausa','Dagbani','Fante']) as x
      order by random() limit (1 + floor(random()*3)::int)
    ) l
  ),
  random() < 0.8,
  case
    when random() < 0.85 then 'verified'
    when random() < 0.97 then 'pending'
    else 'rejected'
  end,
  'GHA-' || lpad(floor(random()*1000000000)::text, 9, '0') || '-' || floor(random()*10)::int,
  now() - (floor(random()*30) || ' days')::interval,
  now() - (floor(random()*180) || ' days')::interval
from (
  -- Fixed 8 rows per category (12 categories x 8 = 96) so every trade gets
  -- guaranteed coverage, instead of a random pick per row that could leave
  -- some categories thin or empty by chance. Region is still randomized per
  -- row via the LATERAL join.
  select
    row_number() over () as n,
    c.category, c.skills, c.bio, c.rate_min, c.rate_max, c.perjob_min, c.perjob_max,
    r.region, r.city, r.lat, r.lng
  from _seed_categories c
  cross join generate_series(1, 8) as gs(k)
  cross join lateral (select * from _seed_regions order by random() limit 1) r
) base;

-- ----------------------------------------------------------------------------
-- auth.users -> fires handle_new_user() -> creates profiles + profile_contact
-- ----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, phone, phone_confirmed_at
)
select
  '00000000-0000-0000-0000-000000000000',
  id,
  'authenticated',
  'authenticated',
  email,
  crypt(gen_random_uuid()::text, gen_salt('bf')),
  created_at,
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', full_name, 'role', 'worker'),
  created_at,
  created_at,
  phone,
  created_at
from _seed_workers
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- worker_profiles
-- ----------------------------------------------------------------------------
insert into public.worker_profiles (
  id, skills, bio, years_experience, hourly_rate, per_job_rate, min_job_value,
  languages, availability, preferred_times, is_online, latitude, longitude,
  address, rating_avg, rating_count
)
select
  id,
  (select array_agg(x) from (select unnest(skills) as x order by random() limit (2 + floor(random()*2)::int)) s),
  bio || ' Based in ' || city || '.',
  years_experience,
  round((rate_min + random()*(rate_max-rate_min))::numeric, 2),
  round((perjob_min + random()*(perjob_max-perjob_min))::numeric, 2),
  round((perjob_min*0.5)::numeric, 2),
  languages,
  (select jsonb_agg(jsonb_build_object('day', d, 'on', (random() < 0.75)))
     from unnest(array['Mon','Tue','Wed','Thu','Fri','Sat','Sun']) as d),
  (select array_agg(pt) from (select unnest(array['morning','afternoon','evening']) as pt order by random() limit (1 + floor(random()*3)::int)) p),
  is_online,
  lat + (random()-0.5)*0.06,
  lng + (random()-0.5)*0.06,
  city || ', ' || region,
  round((3.5 + random()*1.5)::numeric, 1),
  (5 + floor(random()*115))::int
from _seed_workers;

-- ----------------------------------------------------------------------------
-- worker_verifications -- the guard trigger forces every INSERT to 'pending'
-- regardless of what we pass, so we finalize the real status in a follow-up
-- UPDATE (same pattern finalize_verification() itself uses).
-- ----------------------------------------------------------------------------
insert into public.worker_verifications (id, id_type, id_number, id_document_url, selfie_url, submitted_at)
select
  id, 'ghana_card', id_number,
  'seed-data/' || id || '/ghana_card.jpg',
  'seed-data/' || id || '/selfie.jpg',
  submitted_at
from _seed_workers;

select set_config('app.allow_verification_finalize', 'true', false);

update public.worker_verifications v
set status = s.target_status,
    reviewed_at = case when s.target_status <> 'pending' then s.submitted_at + interval '1 hour' else null end
from _seed_workers s
where v.id = s.id;

-- Mirror the rating onto profiles too (worker_bids/other screens read rating
-- from profiles in a couple of places; worker_profiles is the primary copy).
update public.profiles p
set rating_avg = wp.rating_avg, rating_count = wp.rating_count
from public.worker_profiles wp
join _seed_workers s on s.id = wp.id
where p.id = s.id;

select set_config('app.allow_verification_finalize', 'false', false);

-- ----------------------------------------------------------------------------
-- Verify per-category coverage (must run before commit -- _seed_workers is
-- dropped on commit).
-- ----------------------------------------------------------------------------
select
  s.category,
  count(*) as total,
  count(*) filter (where v.status = 'verified') as verified
from _seed_workers s
join public.worker_verifications v on v.id = s.id
group by s.category
order by s.category;

commit;

-- ----------------------------------------------------------------------------
-- Verify overall status breakdown
-- ----------------------------------------------------------------------------
select
  wp.verification_status,
  count(*) as workers
from public.worker_profiles wp
join public.profile_contact pc on pc.id = wp.id
where pc.email like '%@seed.adwuma.test'
group by wp.verification_status
order by wp.verification_status;
