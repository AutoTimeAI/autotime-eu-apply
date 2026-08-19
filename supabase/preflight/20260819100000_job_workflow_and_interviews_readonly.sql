-- Read-only production preflight for the job workflow / interviews migration.
-- This script reports metadata only and does not inspect application rows.

select
  current_database() as database_name,
  to_regclass('public.job_workflow_jobs') is not null as job_workflow_jobs_exists,
  to_regclass('public.job_workflow_analysis_snapshots') is not null as job_workflow_analysis_snapshots_exists,
  to_regclass('public.job_workflow_applications') is not null as job_workflow_applications_exists,
  to_regclass('public.job_workflow_screening_answers') is not null as job_workflow_screening_answers_exists,
  to_regclass('public.interview_records') is not null as interview_records_exists,
  to_regclass('public.interview_questions') is not null as interview_questions_exists,
  to_regclass('public.interview_preparation_snapshots') is not null as interview_preparation_snapshots_exists,
  to_regclass('auth.users') is not null as auth_users_available,
  to_regprocedure('public.set_updated_at()') is not null as updated_at_function_available,
  exists (select 1 from pg_roles where rolname = 'authenticated') as authenticated_role_available,
  exists (select 1 from pg_roles where rolname = 'anon') as anonymous_role_available;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where policyname in (
  'job_workflow_jobs_select_own', 'job_workflow_jobs_insert_own',
  'job_workflow_jobs_update_own', 'job_workflow_jobs_delete_own',
  'job_workflow_analysis_snapshots_select_own', 'job_workflow_analysis_snapshots_insert_own',
  'job_workflow_analysis_snapshots_update_own', 'job_workflow_analysis_snapshots_delete_own',
  'job_workflow_applications_select_own', 'job_workflow_applications_insert_own',
  'job_workflow_applications_update_own', 'job_workflow_applications_delete_own',
  'job_workflow_screening_answers_select_own', 'job_workflow_screening_answers_insert_own',
  'job_workflow_screening_answers_update_own', 'job_workflow_screening_answers_delete_own',
  'interview_records_select_own', 'interview_records_insert_own',
  'interview_records_update_own', 'interview_records_delete_own',
  'interview_questions_select_own', 'interview_questions_insert_own',
  'interview_questions_update_own', 'interview_questions_delete_own',
  'interview_preparation_snapshots_select_own', 'interview_preparation_snapshots_insert_own',
  'interview_preparation_snapshots_update_own', 'interview_preparation_snapshots_delete_own'
)
order by schemaname, tablename, policyname;

select event_object_schema, event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_name in (
  'job_workflow_jobs_set_updated_at',
  'job_workflow_applications_set_updated_at',
  'job_workflow_screening_answers_set_updated_at',
  'interview_records_set_updated_at'
)
order by event_object_schema, event_object_table;

select version, statements is not null as has_recorded_statements
from supabase_migrations.schema_migrations
where version = '20260819100000';

select n.nspname as schema_name, c.relname as table_name,
  c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'job_workflow_jobs',
    'job_workflow_analysis_snapshots',
    'job_workflow_applications',
    'job_workflow_screening_answers',
    'interview_records',
    'interview_questions',
    'interview_preparation_snapshots'
  )
order by c.relname;
