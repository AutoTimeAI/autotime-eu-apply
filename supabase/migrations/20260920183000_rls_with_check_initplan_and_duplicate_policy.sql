-- The 2026-09-19 RLS initplan optimization (rewriting bare auth.uid() to
-- (select auth.uid()) so Postgres evaluates it once per query instead of
-- once per row) only touched policies' USING (qual) clauses. Every
-- INSERT/UPSERT policy's WITH CHECK clause was left with a bare,
-- unwrapped auth.uid() call - confirmed via Supabase's performance
-- advisor (auth_rls_initplan, 30 findings) and a direct pg_policies
-- query showing every one of these 30 policies has qual: null,
-- with_check: "(auth.uid() = user_id)" (unwrapped), while their sibling
-- select/update/delete policies on the same table were already correctly
-- wrapped. This completes that fix for the remaining clause type.
--
-- Also drops a genuinely redundant policy (multiple_permissive_policies
-- advisor finding, count 1): custom_job_sources had both an ALL-command
-- "Users manage their own custom job sources" policy (already covering
-- INSERT with the same check) and a separate, narrower
-- custom_job_sources_insert_own INSERT-only policy doing the identical
-- check - Postgres must evaluate both permissive policies on every
-- insert, pure duplicated work with no behavioural difference.

alter policy "account_settings_insert_own" on public.account_settings
  with check ((select auth.uid()) = user_id);

alter policy "alert_setup_status_insert_own" on public.alert_setup_status
  with check ((select auth.uid()) = user_id);

alter policy "applications_insert_own" on public.applications
  with check ((select auth.uid()) = user_id);

alter policy "capture_handoffs_insert_own" on public.capture_handoffs
  with check ((select auth.uid()) = user_id);

alter policy "career_search_profiles_upsert_own" on public.career_search_profiles
  with check ((select auth.uid()) = user_id);

alter policy "cover_letters_insert_own" on public.cover_letters
  with check ((select auth.uid()) = user_id);

alter policy "custom_sponsor_companies_insert_own" on public.custom_sponsor_companies
  with check ((select auth.uid()) = user_id);

alter policy "Users can insert their deleted application tombstones" on public.deleted_application_tombstones
  with check ((select auth.uid()) = user_id);

alter policy "evidence_records_insert_own" on public.evidence_records
  with check ((select auth.uid()) = user_id);

alter policy "extension_connections_insert_own" on public.extension_connections
  with check ((select auth.uid()) = user_id);

alter policy "interview_prep_packs_insert_own" on public.interview_prep_packs
  with check ((select auth.uid()) = user_id);

alter policy "interview_preparation_snapshots_insert_own" on public.interview_preparation_snapshots
  with check ((select auth.uid()) = user_id);

alter policy "interview_questions_insert_own" on public.interview_questions
  with check ((select auth.uid()) = user_id);

alter policy "interview_records_insert_own" on public.interview_records
  with check ((select auth.uid()) = user_id);

alter policy "job_workflow_analysis_snapshots_insert_own" on public.job_workflow_analysis_snapshots
  with check ((select auth.uid()) = user_id);

alter policy "job_workflow_applications_insert_own" on public.job_workflow_applications
  with check ((select auth.uid()) = user_id);

alter policy "job_workflow_jobs_insert_own" on public.job_workflow_jobs
  with check ((select auth.uid()) = user_id);

alter policy "job_workflow_screening_answers_insert_own" on public.job_workflow_screening_answers
  with check ((select auth.uid()) = user_id);

alter policy "mobility_profiles_insert_own" on public.mobility_profiles
  with check ((select auth.uid()) = user_id);

alter policy "outcome_records_insert_own" on public.outcome_records
  with check ((select auth.uid()) = user_id);

alter policy "outreach_contacts_insert_own" on public.outreach_contacts
  with check ((select auth.uid()) = user_id);

alter policy "outreach_insert_own" on public.outreach_messages
  with check ((select auth.uid()) = user_id);

alter policy "profile_revisions_insert_own" on public.profile_revisions
  with check ((select auth.uid()) = user_id);

alter policy "profiles_insert_own" on public.profiles
  with check ((select auth.uid()) = user_id);

alter policy "reusable_answers_insert_own" on public.reusable_answers
  with check ((select auth.uid()) = user_id);

alter policy "seen_job_postings_insert_own" on public.seen_job_postings
  with check ((select auth.uid()) = user_id);

alter policy "sync_events_insert_own" on public.sync_events
  with check ((select auth.uid()) = user_id);

alter policy "tracked_jobs_insert_own" on public.tracked_jobs
  with check ((select auth.uid()) = user_id);

alter policy "user_app_settings_upsert_own" on public.user_app_settings
  with check ((select auth.uid()) = user_id);

-- Redundant with the ALL-command "Users manage their own custom job
-- sources" policy on the same table, which already covers INSERT with
-- an identical (and already-optimized) check.
drop policy "custom_job_sources_insert_own" on public.custom_job_sources;
