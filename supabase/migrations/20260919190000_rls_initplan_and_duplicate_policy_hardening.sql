-- Found during the same pre-release Supabase performance-advisor sweep
-- as the security migration above (20260919180000). Two independent
-- WARN-level findings, both purely mechanical rewrites with no behaviour
-- change - every rewritten policy keeps the exact same access rule
-- (owner-only row access via user_id), just evaluated once per query
-- instead of once per row.
--
-- 1. auth_rls_initplan (119 findings): every "_own" policy below used a
--    bare `auth.uid()` in its USING/WITH CHECK clause. Postgres's planner
--    re-evaluates a bare function call once per row scanned, whereas
--    wrapping it as `(select auth.uid())` lets the planner treat it as a
--    stable sub-select and evaluate it once per query (Supabase's own
--    documented RLS performance guidance). Negligible at current beta
--    scale, but a pure win with no downside, and degrades roughly
--    linearly with row count as usage grows - worth fixing now rather
--    than waiting for it to show up in a slow-query report.
-- 2. multiple_permissive_policies (4 findings, all on
--    custom_job_sources): this table had both a single ALL policy
--    ("Users manage their own custom job sources", already using the
--    (select auth.uid()) form) AND three separate per-action "_own"
--    policies duplicating the exact same rule - so every query on this
--    table was evaluating two overlapping permissive policies. The three
--    redundant ones are dropped outright below rather than rewritten.

alter policy "account_settings_select_own" on public.account_settings using ((select auth.uid()) = user_id);
alter policy "account_settings_update_own" on public.account_settings using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "ai_credit_ledger_select_own" on public.ai_credit_ledger using ((select auth.uid()) = user_id);
alter policy "ai_usage_select_own" on public.ai_usage using ((select auth.uid()) = user_id);
alter policy "alert_setup_status_delete_own" on public.alert_setup_status using ((select auth.uid()) = user_id);
alter policy "alert_setup_status_select_own" on public.alert_setup_status using ((select auth.uid()) = user_id);
alter policy "alert_setup_status_update_own" on public.alert_setup_status using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "applications_delete_own" on public.applications using ((select auth.uid()) = user_id);
alter policy "applications_select_own" on public.applications using ((select auth.uid()) = user_id);
alter policy "applications_update_own" on public.applications using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "capture_handoffs_delete_own" on public.capture_handoffs using ((select auth.uid()) = user_id);
alter policy "capture_handoffs_select_own" on public.capture_handoffs using ((select auth.uid()) = user_id);
alter policy "capture_handoffs_update_own" on public.capture_handoffs using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "career_search_profiles_select_own" on public.career_search_profiles using ((select auth.uid()) = user_id);
alter policy "career_search_profiles_update_own" on public.career_search_profiles using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "cover_letters_delete_own" on public.cover_letters using ((select auth.uid()) = user_id);
alter policy "cover_letters_select_own" on public.cover_letters using ((select auth.uid()) = user_id);
alter policy "cover_letters_update_own" on public.cover_letters using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "custom_sponsor_companies_delete_own" on public.custom_sponsor_companies using ((select auth.uid()) = user_id);
alter policy "custom_sponsor_companies_select_own" on public.custom_sponsor_companies using ((select auth.uid()) = user_id);
alter policy "custom_sponsor_companies_update_own" on public.custom_sponsor_companies using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users can read their deleted application tombstones" on public.deleted_application_tombstones using ((select auth.uid()) = user_id);
alter policy "Users can update their deleted application tombstones" on public.deleted_application_tombstones using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "esco_questionnaire_answers_own" on public.esco_questionnaire_answers using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "evidence_records_delete_own" on public.evidence_records using ((select auth.uid()) = user_id);
alter policy "evidence_records_select_own" on public.evidence_records using ((select auth.uid()) = user_id);
alter policy "evidence_records_update_own" on public.evidence_records using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "extension_connections_select_own" on public.extension_connections using ((select auth.uid()) = user_id);
alter policy "extension_connections_update_own" on public.extension_connections using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "interview_prep_packs_delete_own" on public.interview_prep_packs using ((select auth.uid()) = user_id);
alter policy "interview_prep_packs_select_own" on public.interview_prep_packs using ((select auth.uid()) = user_id);
alter policy "interview_prep_packs_update_own" on public.interview_prep_packs using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "interview_preparation_snapshots_delete_own" on public.interview_preparation_snapshots using ((select auth.uid()) = user_id);
alter policy "interview_preparation_snapshots_select_own" on public.interview_preparation_snapshots using ((select auth.uid()) = user_id);
alter policy "interview_preparation_snapshots_update_own" on public.interview_preparation_snapshots using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "interview_questions_delete_own" on public.interview_questions using ((select auth.uid()) = user_id);
alter policy "interview_questions_select_own" on public.interview_questions using ((select auth.uid()) = user_id);
alter policy "interview_questions_update_own" on public.interview_questions using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "interview_records_delete_own" on public.interview_records using ((select auth.uid()) = user_id);
alter policy "interview_records_select_own" on public.interview_records using ((select auth.uid()) = user_id);
alter policy "interview_records_update_own" on public.interview_records using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "job_workflow_analysis_snapshots_delete_own" on public.job_workflow_analysis_snapshots using ((select auth.uid()) = user_id);
alter policy "job_workflow_analysis_snapshots_select_own" on public.job_workflow_analysis_snapshots using ((select auth.uid()) = user_id);
alter policy "job_workflow_analysis_snapshots_update_own" on public.job_workflow_analysis_snapshots using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "job_workflow_applications_delete_own" on public.job_workflow_applications using ((select auth.uid()) = user_id);
alter policy "job_workflow_applications_select_own" on public.job_workflow_applications using ((select auth.uid()) = user_id);
alter policy "job_workflow_applications_update_own" on public.job_workflow_applications using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "job_workflow_jobs_delete_own" on public.job_workflow_jobs using ((select auth.uid()) = user_id);
alter policy "job_workflow_jobs_select_own" on public.job_workflow_jobs using ((select auth.uid()) = user_id);
alter policy "job_workflow_jobs_update_own" on public.job_workflow_jobs using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "job_workflow_screening_answers_delete_own" on public.job_workflow_screening_answers using ((select auth.uid()) = user_id);
alter policy "job_workflow_screening_answers_select_own" on public.job_workflow_screening_answers using ((select auth.uid()) = user_id);
alter policy "job_workflow_screening_answers_update_own" on public.job_workflow_screening_answers using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "mobility_profiles_delete_own" on public.mobility_profiles using ((select auth.uid()) = user_id);
alter policy "mobility_profiles_select_own" on public.mobility_profiles using ((select auth.uid()) = user_id);
alter policy "mobility_profiles_update_own" on public.mobility_profiles using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "outcome_records_delete_own" on public.outcome_records using ((select auth.uid()) = user_id);
alter policy "outcome_records_select_own" on public.outcome_records using ((select auth.uid()) = user_id);
alter policy "outcome_records_update_own" on public.outcome_records using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "outreach_contacts_delete_own" on public.outreach_contacts using ((select auth.uid()) = user_id);
alter policy "outreach_contacts_select_own" on public.outreach_contacts using ((select auth.uid()) = user_id);
alter policy "outreach_contacts_update_own" on public.outreach_contacts using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "outreach_delete_own" on public.outreach_messages using ((select auth.uid()) = user_id);
alter policy "outreach_select_own" on public.outreach_messages using ((select auth.uid()) = user_id);
alter policy "outreach_update_own" on public.outreach_messages using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "profile_revisions_delete_own" on public.profile_revisions using ((select auth.uid()) = user_id);
alter policy "profile_revisions_select_own" on public.profile_revisions using ((select auth.uid()) = user_id);
alter policy "profiles_delete_own" on public.profiles using ((select auth.uid()) = user_id);
alter policy "profiles_select_own" on public.profiles using ((select auth.uid()) = user_id);
alter policy "profiles_update_own" on public.profiles using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "reusable_answers_delete_own" on public.reusable_answers using ((select auth.uid()) = user_id);
alter policy "reusable_answers_select_own" on public.reusable_answers using ((select auth.uid()) = user_id);
alter policy "reusable_answers_update_own" on public.reusable_answers using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "seen_job_postings_delete_own" on public.seen_job_postings using ((select auth.uid()) = user_id);
alter policy "seen_job_postings_select_own" on public.seen_job_postings using ((select auth.uid()) = user_id);
alter policy "seen_job_postings_update_own" on public.seen_job_postings using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "subscriptions_select_own" on public.subscriptions using ((select auth.uid()) = user_id);
alter policy "sync_events_select_own" on public.sync_events using ((select auth.uid()) = user_id);
alter policy "tracked_jobs_delete_own" on public.tracked_jobs using ((select auth.uid()) = user_id);
alter policy "tracked_jobs_select_own" on public.tracked_jobs using ((select auth.uid()) = user_id);
alter policy "tracked_jobs_update_own" on public.tracked_jobs using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "user_accounts_select_own" on public.user_accounts using ((select auth.uid()) = user_id);
alter policy "user_accounts_update_own" on public.user_accounts using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "user_app_settings_select_own" on public.user_app_settings using ((select auth.uid()) = user_id);
alter policy "user_app_settings_update_own" on public.user_app_settings using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "user_skill_profile_own" on public.user_skill_profile using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "custom_job_sources_delete_own" on public.custom_job_sources;
drop policy if exists "custom_job_sources_select_own" on public.custom_job_sources;
drop policy if exists "custom_job_sources_update_own" on public.custom_job_sources;
