-- Read-only production preflight for the mobility entry-gate migration.
-- This script reports metadata only and does not inspect application rows.

select
  current_database() as database_name,
  to_regclass('public.mobility_profiles') is not null as mobility_table_exists,
  to_regclass('auth.users') is not null as auth_users_available,
  to_regprocedure('public.set_updated_at()') is not null as updated_at_function_available,
  exists (select 1 from pg_roles where rolname = 'authenticated') as authenticated_role_available,
  exists (select 1 from pg_roles where rolname = 'anon') as anonymous_role_available;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where policyname in (
  'mobility_profiles_select_own',
  'mobility_profiles_insert_own',
  'mobility_profiles_update_own',
  'mobility_profiles_delete_own'
)
order by schemaname, tablename, policyname;

select event_object_schema, event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_name = 'mobility_profiles_set_updated_at'
order by event_object_schema, event_object_table;

select version, statements is not null as has_recorded_statements
from supabase_migrations.schema_migrations
where version = '20260729120000';

select c.oid::regclass::text as foreign_key_target, c.relkind as target_kind
from pg_class c
where c.oid = to_regclass('auth.users');

select n.nspname as schema_name, c.relname as table_name,
  c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'mobility_profiles';