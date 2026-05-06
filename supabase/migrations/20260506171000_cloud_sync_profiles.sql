-- AutoTime post-MVP cloud sync foundation.
-- This migration creates the first safe slice only: candidate profile sync
-- plus sync audit events. It does not store browser cookies, API keys,
-- LinkedIn sessions, or application submission state.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  current_country text not null,
  current_city text,
  target_countries text not null,
  target_roles text not null,
  work_right_details text not null,
  sponsorship_needed boolean not null default false,
  relocation_willingness text not null default 'depends'
    check (relocation_willingness in ('yes', 'no', 'depends')),
  salary_expectation text,
  notice_period text,
  base_cv_text text not null,
  project_summaries text,
  experience_highlights text,
  source_surface text not null default 'web'
    check (source_surface in ('web', 'extension')),
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_user_unique unique (user_id),
  constraint profiles_full_name_present check (length(trim(full_name)) > 0),
  constraint profiles_current_country_present check (length(trim(current_country)) > 0),
  constraint profiles_target_countries_present check (length(trim(target_countries)) > 0),
  constraint profiles_target_roles_present check (length(trim(target_roles)) > 0),
  constraint profiles_work_right_details_present check (length(trim(work_right_details)) > 0),
  constraint profiles_base_cv_text_present check (length(trim(base_cv_text)) > 0)
);

create table if not exists public.sync_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('profile')),
  entity_id uuid not null,
  source_surface text not null check (source_surface in ('web', 'extension')),
  action text not null check (action in ('created', 'updated', 'deleted')),
  message text not null default '',
  schema_version integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists sync_events_user_id_created_at_idx
  on public.sync_events(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.sync_events enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "sync_events_select_own" on public.sync_events;
create policy "sync_events_select_own"
on public.sync_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "sync_events_insert_own" on public.sync_events;
create policy "sync_events_insert_own"
on public.sync_events
for insert
to authenticated
with check (auth.uid() = user_id);
