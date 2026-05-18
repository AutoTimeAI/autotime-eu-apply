-- Account-level settings that are not part of the application workflow.

create table if not exists public.account_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_region text not null default 'United Kingdom',
  ai_tone text not null default 'coaching',
  notifications_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_settings_ai_tone_check
    check (ai_tone in ('concise', 'coaching', 'detailed')),
  constraint account_settings_default_region_present
    check (length(trim(default_region)) > 0)
);

drop trigger if exists account_settings_set_updated_at on public.account_settings;
create trigger account_settings_set_updated_at
before update on public.account_settings
for each row
execute function public.set_updated_at();

alter table public.account_settings enable row level security;

drop policy if exists "account_settings_select_own" on public.account_settings;
create policy "account_settings_select_own"
on public.account_settings
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "account_settings_insert_own" on public.account_settings;
create policy "account_settings_insert_own"
on public.account_settings
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "account_settings_update_own" on public.account_settings;
create policy "account_settings_update_own"
on public.account_settings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
