-- Fix AI rate-limit RPC timestamp handling.
-- `current_time` is a PostgreSQL reserved expression that returns timetz, so
-- use an explicit timestamptz variable name for reset_at comparisons.

create or replace function public.increment_ai_rate_limit(
  p_rate_limit_key text,
  p_window_seconds integer,
  p_max_requests integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
  current_timestamp_at timestamptz := now();
begin
  insert into public.ai_rate_limits (
    rate_limit_key,
    request_count,
    reset_at
  )
  values (
    p_rate_limit_key,
    1,
    current_timestamp_at + make_interval(secs => p_window_seconds)
  )
  on conflict (rate_limit_key) do update
  set
    request_count = case
      when public.ai_rate_limits.reset_at <= current_timestamp_at then 1
      else public.ai_rate_limits.request_count + 1
    end,
    reset_at = case
      when public.ai_rate_limits.reset_at <= current_timestamp_at
        then current_timestamp_at + make_interval(secs => p_window_seconds)
      else public.ai_rate_limits.reset_at
    end
  returning request_count into current_count;

  return current_count <= p_max_requests;
end;
$$;

revoke all on function public.increment_ai_rate_limit(text, integer, integer)
from public;

grant execute on function public.increment_ai_rate_limit(text, integer, integer)
to service_role;
