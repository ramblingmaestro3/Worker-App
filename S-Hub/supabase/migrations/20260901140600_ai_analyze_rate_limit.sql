-- ============================================================================
-- Migration: rate limit for the ai-analyze edge function
-- ============================================================================
-- ai-analyze is auth-gated but otherwise unthrottled — any signed-in user can
-- call it as fast as they like, burning the shared GEMINI_API_KEY's quota/cost.
-- Edge functions are stateless/ephemeral (no in-memory counter survives across
-- invocations or instances), so the counter has to live in the DB. Table is
-- unreachable directly (RLS on, no policies) — the only way to touch it is
-- through the security-definer function below, called by the edge function
-- with the caller's own JWT.
-- ============================================================================

create table public.ai_analyze_usage (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  count        int not null default 0
);

alter table public.ai_analyze_usage enable row level security;

create or replace function public.check_ai_analyze_rate_limit(
  max_calls integer default 10,
  window_seconds integer default 3600
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.ai_analyze_usage;
begin
  select * into v_row from public.ai_analyze_usage where user_id = auth.uid() for update;

  if v_row.user_id is null then
    insert into public.ai_analyze_usage (user_id, window_start, count)
    values (auth.uid(), now(), 1);
    return true;
  end if;

  if now() - v_row.window_start > make_interval(secs => window_seconds) then
    update public.ai_analyze_usage
    set window_start = now(), count = 1
    where user_id = auth.uid();
    return true;
  end if;

  if v_row.count >= max_calls then
    return false;
  end if;

  update public.ai_analyze_usage
  set count = count + 1
  where user_id = auth.uid();
  return true;
end;
$$;
