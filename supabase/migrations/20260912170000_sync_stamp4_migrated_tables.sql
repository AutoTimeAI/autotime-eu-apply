-- Records tables that were applied directly to production
-- (project dorqxmnslzzmrpjbhlcl) without ever being committed to this repo.
--
-- Production migration ledger names (never had matching files here):
--   20260908164138 stamp4_simple_apply_schema
--   20260908164150 stamp4_tables_enable_rls
--   20260908172000 add_user_ownership_to_stamp4_tables
--   20260908181024 backfill_user_id_stamp4_tables
--   20260908182435 add_user_ownership_to_alert_setup_status
--   20260908191423 apply_codex_custom_job_sources_rls
--   20260908200617 migrate_live_data_from_stamp4_simple_apply_v2
--   20260909135507 stamp4_per_user_sponsor_alerts
--   20260909141824 stamp4_correct_owner_account
--   20260909143137 stamp4_per_user_app_settings
--
-- This migration reconstructs the resulting schema (as of 2026-09-12, via
-- `supabase db dump --linked --schema public`) so the repo has an accurate,
-- reviewable record. It is additive/idempotent (`IF NOT EXISTS`) so it is
-- safe to run against a database that already has these objects (production)
-- and against one that doesn't (fresh local resets, other environments).
--
-- KNOWN GAP as originally applied to production: `alert_setup_status_user_id_fkey`
-- and `custom_job_sources_user_id_fkey` had no ON DELETE action (defaulting to
-- NO ACTION), unlike `user_app_settings_user_id_fkey` which cascades. This
-- migration reproduces that original state for an accurate historical record;
-- 20260912180000_fix_stamp4_user_delete_cascade.sql corrects it afterward.

begin;

create table if not exists public.alert_setup_status (
  source_name text not null,
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  user_id uuid not null,
  constraint alert_setup_status_pkey primary key (user_id, source_name),
  constraint alert_setup_status_user_id_fkey foreign key (user_id) references auth.users(id)
);

create table if not exists public.app_settings (
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  constraint app_settings_pkey primary key (key)
);

create table if not exists public.custom_job_sources (
  id uuid not null default gen_random_uuid(),
  name text not null,
  url text,
  region text not null,
  reasoning text,
  confidence text,
  added_at timestamptz not null default now(),
  user_id uuid,
  constraint custom_job_sources_pkey primary key (id),
  constraint custom_job_sources_user_id_fkey foreign key (user_id) references auth.users(id)
);

create index if not exists custom_job_sources_user_id_idx on public.custom_job_sources using btree (user_id);

create table if not exists public.user_app_settings (
  user_id uuid not null,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  constraint user_app_settings_pkey primary key (user_id, key),
  constraint user_app_settings_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
);

alter table public.alert_setup_status enable row level security;
alter table public.app_settings enable row level security;
alter table public.custom_job_sources enable row level security;
alter table public.user_app_settings enable row level security;

do $policies$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'alert_setup_status' and policyname = 'alert_setup_status_delete_own') then
    create policy alert_setup_status_delete_own on public.alert_setup_status for delete using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'alert_setup_status' and policyname = 'alert_setup_status_insert_own') then
    create policy alert_setup_status_insert_own on public.alert_setup_status for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'alert_setup_status' and policyname = 'alert_setup_status_select_own') then
    create policy alert_setup_status_select_own on public.alert_setup_status for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'alert_setup_status' and policyname = 'alert_setup_status_update_own') then
    create policy alert_setup_status_update_own on public.alert_setup_status for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  -- app_settings intentionally has RLS enabled with zero policies: default-deny
  -- for anon/authenticated (only service_role, which bypasses RLS, can read/write).
  -- Production also GRANTs ALL on this table to anon/authenticated; the grant is
  -- redundant given RLS default-deny but is reproduced here unchanged rather than
  -- narrowed, since narrowing a production grant is a deliberate decision.

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'custom_job_sources' and policyname = 'Users manage their own custom job sources') then
    create policy "Users manage their own custom job sources" on public.custom_job_sources to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'custom_job_sources' and policyname = 'custom_job_sources_delete_own') then
    create policy custom_job_sources_delete_own on public.custom_job_sources for delete using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'custom_job_sources' and policyname = 'custom_job_sources_insert_own') then
    create policy custom_job_sources_insert_own on public.custom_job_sources for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'custom_job_sources' and policyname = 'custom_job_sources_select_own') then
    create policy custom_job_sources_select_own on public.custom_job_sources for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'custom_job_sources' and policyname = 'custom_job_sources_update_own') then
    create policy custom_job_sources_update_own on public.custom_job_sources for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_app_settings' and policyname = 'user_app_settings_select_own') then
    create policy user_app_settings_select_own on public.user_app_settings for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_app_settings' and policyname = 'user_app_settings_update_own') then
    create policy user_app_settings_update_own on public.user_app_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_app_settings' and policyname = 'user_app_settings_upsert_own') then
    create policy user_app_settings_upsert_own on public.user_app_settings for insert with check (auth.uid() = user_id);
  end if;
end
$policies$;

grant all on table public.alert_setup_status to anon, authenticated, service_role;
grant all on table public.app_settings to anon, authenticated, service_role;
grant all on table public.custom_job_sources to anon, authenticated, service_role;
grant all on table public.user_app_settings to anon, authenticated, service_role;

commit;
