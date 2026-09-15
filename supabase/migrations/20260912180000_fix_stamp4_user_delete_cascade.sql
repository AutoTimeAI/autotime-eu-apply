-- Fixes an account-deletion gap in the tables synced from production in
-- 20260912170000_sync_stamp4_migrated_tables.sql: `alert_setup_status` and
-- `custom_job_sources` reference auth.users(id) with no ON DELETE action
-- (defaults to NO ACTION), so deleting a user with rows in either table
-- currently fails. `user_app_settings` already cascades correctly; this
-- migration brings the other two in line with it.
--
-- Idempotent: safe to run whether the constraint is still the old
-- non-cascading version (production, unpatched local/staging) or already
-- fixed (re-run, or a fresh environment created after this migration exists).

begin;

do $fix_cascade$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'alert_setup_status_user_id_fkey'
      and confdeltype <> 'c'
  ) then
    alter table public.alert_setup_status
      drop constraint alert_setup_status_user_id_fkey;
    alter table public.alert_setup_status
      add constraint alert_setup_status_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if exists (
    select 1 from pg_constraint
    where conname = 'custom_job_sources_user_id_fkey'
      and confdeltype <> 'c'
  ) then
    alter table public.custom_job_sources
      drop constraint custom_job_sources_user_id_fkey;
    alter table public.custom_job_sources
      add constraint custom_job_sources_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end
$fix_cascade$;

commit;
