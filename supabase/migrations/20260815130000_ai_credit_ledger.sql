-- Adds durable, non-expiring AI credits.
-- One successful AI action consumes one allowance unit. Purchased credits are
-- used only after the plan's monthly allowance has been exhausted.

create table if not exists public.ai_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('purchase', 'usage', 'refund', 'admin')),
  stripe_checkout_session_id text unique,
  feature text,
  created_at timestamptz not null default now()
);

create index if not exists ai_credit_ledger_user_created_idx
  on public.ai_credit_ledger(user_id, created_at desc);

alter table public.ai_credit_ledger enable row level security;

drop policy if exists "ai_credit_ledger_select_own" on public.ai_credit_ledger;
create policy "ai_credit_ledger_select_own"
on public.ai_credit_ledger
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.get_ai_credit_balance(p_user_id uuid)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select greatest(0, coalesce(sum(delta), 0))::integer
  from public.ai_credit_ledger
  where user_id = p_user_id;
$$;

create or replace function public.grant_ai_credit_pack(
  p_user_id uuid,
  p_credits integer,
  p_checkout_session_id text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_credits <= 0 or length(trim(p_checkout_session_id)) = 0 then
    raise exception 'Invalid credit grant';
  end if;

  insert into public.ai_credit_ledger (
    user_id,
    delta,
    reason,
    stripe_checkout_session_id
  )
  values (p_user_id, p_credits, 'purchase', p_checkout_session_id)
  on conflict (stripe_checkout_session_id) do nothing;

  return public.get_ai_credit_balance(p_user_id);
end;
$$;

create or replace function public.consume_ai_credit(
  p_user_id uuid,
  p_feature text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  balance integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select greatest(0, coalesce(sum(delta), 0))::integer
  into balance
  from public.ai_credit_ledger
  where user_id = p_user_id;

  if balance < 1 then
    return false;
  end if;

  insert into public.ai_credit_ledger (user_id, delta, reason, feature)
  values (p_user_id, -1, 'usage', nullif(trim(p_feature), ''));

  return true;
end;
$$;

revoke all on function public.grant_ai_credit_pack(uuid, integer, text)
  from public, anon, authenticated;
revoke all on function public.consume_ai_credit(uuid, text)
  from public, anon, authenticated;
grant execute on function public.get_ai_credit_balance(uuid) to authenticated;
grant execute on function public.grant_ai_credit_pack(uuid, integer, text)
  to service_role;
grant execute on function public.consume_ai_credit(uuid, text)
  to service_role;
