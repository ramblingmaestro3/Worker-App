-- ============================================================================
-- Migration: two small worker_profiles columns needed to make
-- worker-pricing.tsx and worker-personal-info.tsx real instead of mock.
-- (skills and availability already existed; these were the only two fields
-- those screens edit that had no real column behind them.)
-- ============================================================================

alter table public.worker_profiles add column if not exists min_job_value numeric;
alter table public.worker_profiles add column if not exists languages text;
