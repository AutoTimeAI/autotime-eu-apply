-- Shared AI rate limiting and fuller Stripe subscription status support.
-- Serverless functions cannot rely on module-level memory for limits because
-- each function instance has its own process.

create table if not exists public.ai_rate_limits (
  rate_limit_key text primary key,
  request_count integer not null default 0
    check (request_count >= 0),
  reset_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint ai_rate_limits_key_present check (length(trim(rate_limit_key)) > 0)
);

drop trigger if exists ai_rate_limits_set_updated_at on public.ai_rate_limits;
create trigger ai_rate_limits_set_updated_at
before update on public.ai_rate_limits
for each row
execute function public.set_updated_at();

alter table public.ai_rate_limits enable row level security;

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
  current_time timestamptz := now();
begin
  insert into public.ai_rate_limits (
    rate_limit_key,
    request_count,
    reset_at
  )
  values (
    p_rate_limit_key,
    1,
    current_time + make_interval(secs => p_window_seconds)
  )
  on conflict (rate_limit_key) do update
  set
    request_count = case
      when public.ai_rate_limits.reset_at <= current_time then 1
      else public.ai_rate_limits.request_count + 1
    end,
    reset_at = case
      when public.ai_rate_limits.reset_at <= current_time
        then current_time + make_interval(secs => p_window_seconds)
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

alter table public.subscriptions
drop constraint if exists subscriptions_status_check;

alter table public.subscriptions
add constraint subscriptions_status_check
check (
  status in (
    'active',
    'past_due',
    'cancelled',
    'trialing',
    'incomplete',
    'incomplete_expired',
    'unpaid',
    'paused'
  )
);
