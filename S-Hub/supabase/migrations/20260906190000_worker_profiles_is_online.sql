-- ============================================================================
-- Migration: make the worker dashboard's online/offline toggle real
-- ============================================================================
-- WorkerDashboard.tsx's "You're online/offline" Switch was local component
-- state only -- never persisted, never read anywhere else -- despite reading
-- as a live presence status. Clients' "available now" dot (Home.tsx,
-- Search.tsx) was computed purely from the weekly availability schedule
-- matching today's day, with no way for a worker to say "not right now"
-- without editing that schedule. This adds the missing column so the
-- toggle is a real, persisted, client-visible signal.
-- ============================================================================

alter table public.worker_profiles add column if not exists is_online boolean not null default true;
