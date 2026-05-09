-- Account and extension-sync foundation.
-- Login credentials remain in Supabase Auth (auth.users). Public tables store
-- only product data needed by AutoTime after a user is authenticated.

create extension if not exists pgcrypto;

create table if not exists public.user_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.extension_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  extension_id text,
  browser_label text,
  last_connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint extension_connections_user_extension_unique unique (user_id, extension_id),
  constraint extension_connections_extension_id_present
    check (extension_id is null or length(trim(extension_id)) > 0)
);

create index if not exists user_accounts_email_idx
  on public.user_accounts(email);

create index if not exists extension_connections_user_id_idx
  on public.extension_connections(user_id, last_connected_at desc);

drop trigger if exists user_accounts_set_updated_at on public.user_accounts;
create trigger user_accounts_set_updated_at
before update on public.user_accounts
for each row
execute function public.set_updated_at();

drop trigger if exists extension_connections_set_updated_at on public.extension_connections;
create trigger extension_connections_set_updated_at
before update on public.extension_connections
for each row
execute function public.set_updated_at();

create or replace function public.create_user_account_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_accounts (
    user_id,
    email,
    full_name,
    avatar_url,
    last_sign_in_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    new.last_sign_in_at
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.user_accounts.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.user_accounts.avatar_url),
    last_sign_in_at = excluded.last_sign_in_at,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists auth_user_created_user_account on auth.users;
create trigger auth_user_created_user_account
after insert or update of email, raw_user_meta_data, last_sign_in_at on auth.users
for each row
execute function public.create_user_account_from_auth();

alter table public.user_accounts enable row level security;
alter table public.extension_connections enable row level security;

drop policy if exists "user_accounts_select_own" on public.user_accounts;
create policy "user_accounts_select_own"
on public.user_accounts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_accounts_update_own" on public.user_accounts;
create policy "user_accounts_update_own"
on public.user_accounts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "extension_connections_select_own" on public.extension_connections;
create policy "extension_connections_select_own"
on public.extension_connections
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "extension_connections_insert_own" on public.extension_connections;
create policy "extension_connections_insert_own"
on public.extension_connections
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "extension_connections_update_own" on public.extension_connections;
create policy "extension_connections_update_own"
on public.extension_connections
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
