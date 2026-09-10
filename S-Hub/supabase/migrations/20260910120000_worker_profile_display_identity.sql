-- ============================================================================
-- Migration: separate worker-facing identity from the personal (client-side) one
-- ============================================================================
-- One account can be both a client and a worker. Until now `profiles.full_name`
-- / `profiles.avatar_url` were the single identity shown on both sides. A
-- tradesperson usually wants a business name / a photo in work clothes on the
-- worker side, distinct from their personal name/photo on the client side.
--
-- These two OPTIONAL columns on `worker_profiles` are that worker-side override.
-- NULL = fall back to `profiles.full_name` / `profiles.avatar_url` (so existing
-- workers are unchanged until they set one). The app coalesces on read for
-- every client-facing worker surface and the worker's own dashboard.
--
-- No RLS change needed: the owner already reads/writes their whole
-- worker_profiles row, and verified rows are already readable by any
-- authenticated user (20260813214813 / 20260822010850).
-- ============================================================================

alter table public.worker_profiles
  add column if not exists display_name text,
  add column if not exists photo_url    text;

comment on column public.worker_profiles.display_name is
  'Optional worker-facing name shown to clients and on the worker''s own dashboard. NULL falls back to profiles.full_name.';
comment on column public.worker_profiles.photo_url is
  'Optional worker-facing avatar URL. NULL falls back to profiles.avatar_url.';
