-- Persistent production operational logs.
-- These rows are written by server-side code using the service role client and
-- read only through admin-gated server routes. They are not user-visible data.

create extension if not exists pgcrypto;

create table if not exists public.operational_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('severe', 'warn', 'info')),
  area text not null,
  code text not null,
  message text not null,
  diagnostic_id text,
  user_id uuid references auth.users(id) on delete set null,
  request_method text,
  request_path text,
  http_status integer,
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint operational_logs_area_present check (length(trim(area)) > 0),
  constraint operational_logs_code_present check (length(trim(code)) > 0),
  constraint operational_logs_message_present check (length(trim(message)) > 0),
  constraint operational_logs_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists operational_logs_created_at_idx
  on public.operational_logs(created_at desc);

create index if not exists operational_logs_level_created_at_idx
  on public.operational_logs(level, created_at desc);

create index if not exists operational_logs_area_created_at_idx
  on public.operational_logs(area, created_at desc);

create index if not exists operational_logs_user_id_created_at_idx
  on public.operational_logs(user_id, created_at desc)
  where user_id is not null;

alter table public.operational_logs enable row level security;

drop policy if exists "operational_logs_no_client_select" on public.operational_logs;
create policy "operational_logs_no_client_select"
on public.operational_logs
for select
to authenticated
using (false);

drop policy if exists "operational_logs_no_client_insert" on public.operational_logs;
create policy "operational_logs_no_client_insert"
on public.operational_logs
for insert
to authenticated
with check (false);

drop policy if exists "operational_logs_no_client_update" on public.operational_logs;
create policy "operational_logs_no_client_update"
on public.operational_logs
for update
to authenticated
using (false)
with check (false);

drop policy if exists "operational_logs_no_client_delete" on public.operational_logs;
create policy "operational_logs_no_client_delete"
on public.operational_logs
for delete
to authenticated
using (false);
