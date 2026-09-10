-- ============================================================================
-- Migration: indexes for the hot read paths (worker discovery / browse / feed)
-- ============================================================================
-- Every one of these filters runs on essentially every screen load and had no
-- supporting index, so each was a sequential scan of the whole table:
--
--   worker_profiles.verification_status = 'verified'
--       — browse (Home), Search, AiAssistant, and every discovery call
--   worker_profiles.skills @> ARRAY['plumbing']   (PostgREST .contains())
--       — skill-matched discovery (listVerifiedWorkersForCategory) and the
--         AI assistant's per-category worker count; a text[] containment test
--         needs a GIN index or it scans + unnests every row
--   service_requests where status = 'seeking_bids' and category in (...)
--       — the worker job feed (listOpenServiceRequestsForCategories)
--
-- All are `if not exists` and non-unique, so this migration is safe to re-run
-- and safe to apply on a live table.
-- ============================================================================

create index if not exists worker_profiles_verification_status_idx
  on public.worker_profiles (verification_status);

create index if not exists worker_profiles_skills_gin_idx
  on public.worker_profiles using gin (skills);

create index if not exists service_requests_status_category_idx
  on public.service_requests (status, category);
