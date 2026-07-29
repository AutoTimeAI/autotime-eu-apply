-- Production mobility entry gate. The server-only feature flag remains disabled.
-- This migration intentionally fails when any intended object already exists.

begin;

do $mobility_preflight$
begin
  if to_regclass('public.mobility_profiles') is not null then
    raise exception
      'mobility migration preflight failed: public.mobility_profiles already exists';
  end if;

  if to_regclass('auth.users') is null then
    raise exception
      'mobility migration preflight failed: auth.users is unavailable';
  end if;

  if to_regprocedure('public.set_updated_at()') is null then
    raise exception
      'mobility migration preflight failed: public.set_updated_at() is unavailable';
  end if;

  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    raise exception
      'mobility migration preflight failed: authenticated role is unavailable';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and policyname in (
        'mobility_profiles_select_own',
        'mobility_profiles_insert_own',
        'mobility_profiles_update_own',
        'mobility_profiles_delete_own'
      )
  ) then
    raise exception
      'mobility migration preflight failed: an intended policy name already exists';
  end if;

  if exists (
    select 1
    from pg_trigger
    where tgname = 'mobility_profiles_set_updated_at'
      and not tgisinternal
  ) then
    raise exception
      'mobility migration preflight failed: the intended trigger name already exists';
  end if;
end
$mobility_preflight$;

create table public.mobility_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null,
  schema_version integer not null default 1 check (schema_version = 1),
  consent_version integer not null check (consent_version = 1),
  consent_granted_at timestamptz not null,
  sync_enabled boolean not null default true,
  migrated_from_legacy_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mobility_profiles_profile_object
    check (jsonb_typeof(profile) = 'object')
);

create trigger mobility_profiles_set_updated_at
before update on public.mobility_profiles
for each row execute function public.set_updated_at();

alter table public.mobility_profiles enable row level security;

create policy "mobility_profiles_select_own"
on public.mobility_profiles for select to authenticated
using (auth.uid() = user_id);

create policy "mobility_profiles_insert_own"
on public.mobility_profiles for insert to authenticated
with check (auth.uid() = user_id);

create policy "mobility_profiles_update_own"
on public.mobility_profiles for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "mobility_profiles_delete_own"
on public.mobility_profiles for delete to authenticated
using (auth.uid() = user_id);

commit;