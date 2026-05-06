-- AutoTime profile memory is not static.
-- Keep public.profiles as the current candidate profile, and record explicit
-- user-approved profile changes in public.profile_revisions.

create table if not exists public.profile_revisions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  revision_number integer not null,
  changed_fields text[] not null default '{}',
  reason text not null default '',
  snapshot jsonb not null,
  source_surface text not null default 'web'
    check (source_surface in ('web', 'extension')),
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  constraint profile_revisions_revision_positive check (revision_number > 0),
  constraint profile_revisions_snapshot_object check (jsonb_typeof(snapshot) = 'object'),
  constraint profile_revisions_user_revision_unique unique (user_id, revision_number)
);

create index if not exists profile_revisions_user_id_created_at_idx
  on public.profile_revisions(user_id, created_at desc);

create index if not exists profile_revisions_profile_id_revision_idx
  on public.profile_revisions(profile_id, revision_number desc);

alter table public.profile_revisions enable row level security;

drop policy if exists "profile_revisions_select_own" on public.profile_revisions;
create policy "profile_revisions_select_own"
on public.profile_revisions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "profile_revisions_insert_own" on public.profile_revisions;
create policy "profile_revisions_insert_own"
on public.profile_revisions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "profile_revisions_delete_own" on public.profile_revisions;
create policy "profile_revisions_delete_own"
on public.profile_revisions
for delete
to authenticated
using (auth.uid() = user_id);

alter table public.sync_events
drop constraint if exists sync_events_entity_type_check;

alter table public.sync_events
add constraint sync_events_entity_type_check
check (entity_type in ('profile', 'profile_revision'));
