-- ============================================================================
-- Migration: worker's preferred time-of-day (morning/afternoon/evening).
--
-- Deliberately a separate column, not folded into the existing `availability`
-- jsonb column -- that column is already treated as a plain [{day, on}] array
-- by worker-availability.tsx and become-worker.tsx, and overloading its shape
-- again would repeat the exact bug just fixed there.
-- ============================================================================

alter table public.worker_profiles
  add column if not exists preferred_times text[] not null default '{}';
