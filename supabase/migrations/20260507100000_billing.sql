-- AutoTime production billing and AI usage foundation.
-- Stores subscription state from Stripe and tracks server-side AI usage for
-- feature gating. Payment card data remains in Stripe, never in AutoTime.

create extension if not exists pgcrypto;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free'
    check (plan in ('free', 'pro')),
  status text not null default 'active'
    check (status in ('active', 'past_due', 'cancelled', 'trialing')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_user_unique unique (user_id)
);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  model text not null,
  prompt_tokens integer not null default 0
    check (prompt_tokens >= 0),
  completion_tokens integer not null default 0
    check (completion_tokens >= 0),
  cost_usd numeric(10, 6) not null default 0
    check (cost_usd >= 0),
  created_at timestamptz not null default now(),
  constraint ai_usage_feature_present check (length(trim(feature)) > 0),
  constraint ai_usage_model_present check (length(trim(model)) > 0)
);

create index if not exists subscriptions_user_id_idx
  on public.subscriptions(user_id);

create index if not exists subscriptions_stripe_customer_id_idx
  on public.subscriptions(stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists subscriptions_stripe_subscription_id_idx
  on public.subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists ai_usage_user_id_created_at_idx
  on public.ai_usage(user_id, created_at desc);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

alter table public.subscriptions enable row level security;
alter table public.ai_usage enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own"
on public.subscriptions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own"
on public.ai_usage
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "ai_usage_insert_own" on public.ai_usage;
create policy "ai_usage_insert_own"
on public.ai_usage
for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.get_monthly_ai_calls(p_user_id uuid)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::integer
  from public.ai_usage
  where user_id = p_user_id
    and created_at >= date_trunc('month', now())
    and created_at < date_trunc('month', now()) + interval '1 month';
$$;

create or replace function public.create_free_subscription_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_free_subscription_for_new_user on auth.users;
create trigger create_free_subscription_for_new_user
after insert on auth.users
for each row
execute function public.create_free_subscription_for_new_user();
