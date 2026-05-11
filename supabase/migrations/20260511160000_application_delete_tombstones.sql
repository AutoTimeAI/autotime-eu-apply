create table if not exists public.deleted_application_tombstones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid,
  url_key text not null,
  deleted_at timestamptz not null default now(),
  source_surface text not null default 'web'
    check (source_surface in ('web', 'extension')),
  reason text,
  unique (user_id, url_key)
);

alter table public.deleted_application_tombstones enable row level security;

drop policy if exists "Users can read their deleted application tombstones"
  on public.deleted_application_tombstones;
create policy "Users can read their deleted application tombstones"
  on public.deleted_application_tombstones
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their deleted application tombstones"
  on public.deleted_application_tombstones;
create policy "Users can insert their deleted application tombstones"
  on public.deleted_application_tombstones
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their deleted application tombstones"
  on public.deleted_application_tombstones;
create policy "Users can update their deleted application tombstones"
  on public.deleted_application_tombstones
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists deleted_application_tombstones_user_deleted_idx
  on public.deleted_application_tombstones (user_id, deleted_at desc);
