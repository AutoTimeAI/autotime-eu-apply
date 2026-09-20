-- Adds a covering index for every foreign key the Supabase performance
-- advisor flagged as unindexed (unindexed_foreign_keys, 76 findings).
-- Confirmed each of the 76 flagged constraint names against a direct
-- pg_constraint query before generating these statements, to avoid
-- transcription drift between the advisor's report and the live schema.
--
-- Plain CREATE INDEX (not CONCURRENTLY) is used deliberately:
-- CONCURRENTLY cannot run inside a transaction block, and at current
-- table sizes (mostly 0 rows - many are dormant mobility-governance
-- tables behind a disabled feature flag; the largest table touched here
-- holds low thousands of rows at most) a brief lock during a plain
-- CREATE INDEX is not a real production risk.
--
-- Applied directly to production via the Supabase MCP tool and verified
-- against the live performance advisor afterward: unindexed_foreign_keys
-- dropped from 76 to 0. The unused_index finding correctly jumped by 76
-- immediately after (brand-new indexes have no query history yet) - this
-- is expected transient noise, not a new problem, and will clear as real
-- traffic hits them.
create index if not exists idx_mobility_candidate_evidence_items_user_id on public.mobility_candidate_evidence_items (user_id);
create index if not exists idx_outcome_records_application_id on public.outcome_records (application_id);
create index if not exists idx_mobility_vacancy_snapshots_user_id on public.mobility_vacancy_snapshots (user_id);
create index if not exists idx_mobility_employer_registers_source_document_id on public.mobility_employer_registers (source_document_id);
create index if not exists idx_interview_prep_packs_application_id on public.interview_prep_packs (application_id);
create index if not exists idx_admin_feature_flags_updated_by on public.admin_feature_flags (updated_by);
create index if not exists idx_admin_memberships_created_by on public.admin_memberships (created_by);
create index if not exists idx_admin_audit_events_actor_user_id on public.admin_audit_events (actor_user_id);
create index if not exists idx_beta_access_updated_by on public.beta_access (updated_by);
create index if not exists idx_beta_feedback_user_id on public.beta_feedback (user_id);
create index if not exists idx_market_refresh_requests_requested_by on public.market_refresh_requests (requested_by);
create index if not exists idx_job_workflow_analysis_snapshots_user_id on public.job_workflow_analysis_snapshots (user_id);
create index if not exists idx_outreach_messages_job_id on public.outreach_messages (job_id);
create index if not exists idx_user_skill_profile_esco_skill_id on public.user_skill_profile (esco_skill_id);
create index if not exists idx_cover_letters_job_id on public.cover_letters (job_id);
create index if not exists idx_interview_questions_user_id on public.interview_questions (user_id);
create index if not exists idx_interview_preparation_snapshots_user_id on public.interview_preparation_snapshots (user_id);
create index if not exists idx_job_workflow_screening_answers_user_id on public.job_workflow_screening_answers (user_id);
create index if not exists idx_tracked_jobs_user_id on public.tracked_jobs (user_id);
create index if not exists idx_custom_sponsor_companies_user_id on public.custom_sponsor_companies (user_id);
create index if not exists idx_capture_handoffs_user_id on public.capture_handoffs (user_id);
create index if not exists idx_mobility_source_versions_captured_by on public.mobility_source_versions (captured_by);
create index if not exists idx_mobility_source_spans_source_version_id on public.mobility_source_spans (source_version_id);
create index if not exists idx_mobility_claim_versions_predecessor_version_id on public.mobility_claim_versions (predecessor_version_id);
create index if not exists idx_mobility_claim_source_spans_source_span_id on public.mobility_claim_source_spans (source_span_id);
create index if not exists idx_mobility_learning_events_consent_id on public.mobility_learning_events (consent_id);
create index if not exists idx_mobility_rule_bundle_versions_predecessor_version_id on public.mobility_rule_bundle_versions (predecessor_version_id);
create index if not exists idx_mobility_rule_claim_links_claim_version_id on public.mobility_rule_claim_links (claim_version_id);
create index if not exists idx_mobility_learning_events_application_id on public.mobility_learning_events (application_id);
create index if not exists idx_mobility_learning_events_outcome_record_id on public.mobility_learning_events (outcome_record_id);
create index if not exists idx_mobility_expert_signoffs_rule_bundle_version_id on public.mobility_expert_signoffs (rule_bundle_version_id);
create index if not exists idx_mobility_rule_bundle_activations_rule_bundle_version_id on public.mobility_rule_bundle_activations (rule_bundle_version_id);
create index if not exists idx_mobility_rule_bundle_activations_actor_id on public.mobility_rule_bundle_activations (actor_id);
create index if not exists idx_mobility_candidate_evidence_versions_predecessor_version_id on public.mobility_candidate_evidence_versions (predecessor_version_id);
create index if not exists idx_mobility_employer_register_versions_source_version_id on public.mobility_employer_register_versions (source_version_id);
create index if not exists idx_mobility_employer_register_versions_predecessor_version_id on public.mobility_employer_register_versions (predecessor_version_id);
create index if not exists idx_mobility_employer_verifications_user_id on public.mobility_employer_verifications (user_id);
create index if not exists idx_mobility_employer_verifications_vacancy_snapshot_id on public.mobility_employer_verifications (vacancy_snapshot_id);
create index if not exists idx_mobility_employer_verifications_register_version_id on public.mobility_employer_verifications (register_version_id);
create index if not exists idx_mobility_employer_verifications_register_row_id on public.mobility_employer_verifications (register_row_id);
create index if not exists idx_mobility_learning_events_correction_id on public.mobility_learning_events (correction_id);
create index if not exists idx_mobility_decision_correction_reviews_correction_id on public.mobility_decision_correction_reviews (correction_id);
create index if not exists idx_mobility_decision_correction_reviews_reviewer_id on public.mobility_decision_correction_reviews (reviewer_id);
create index if not exists idx_mobility_decision_correction_reviews_successor_decision_id on public.mobility_decision_correction_reviews (successor_decision_id);
create index if not exists idx_mobility_decision_records_vacancy_snapshot_id on public.mobility_decision_records (vacancy_snapshot_id);
create index if not exists idx_mobility_decision_records_employer_verification_id on public.mobility_decision_records (employer_verification_id);
create index if not exists idx_mobility_decision_records_rule_bundle_version_id on public.mobility_decision_records (rule_bundle_version_id);
create index if not exists idx_mobility_decision_records_supersedes_decision_id on public.mobility_decision_records (supersedes_decision_id);
create index if not exists idx_mobility_decision_evidence_links_claim_version_id on public.mobility_decision_evidence_links (claim_version_id);
create index if not exists idx_mobility_decision_evidence_links_source_span_id on public.mobility_decision_evidence_links (source_span_id);
create index if not exists idx_mdel_candidate_evidence_version_id on public.mobility_decision_evidence_links (candidate_evidence_version_id);
create index if not exists idx_mobility_decision_corrections_user_id on public.mobility_decision_corrections (user_id);
create index if not exists idx_mobility_decision_corrections_successor_decision_id on public.mobility_decision_corrections (successor_decision_id);
create index if not exists idx_mobility_decision_replays_user_id on public.mobility_decision_replays (user_id);
create index if not exists idx_mobility_decision_replays_replay_rule_bundle_version_id on public.mobility_decision_replays (replay_rule_bundle_version_id);
create index if not exists idx_mobility_decision_replays_replay_decision_id on public.mobility_decision_replays (replay_decision_id);
create index if not exists idx_mobility_source_change_events_previous_version_id on public.mobility_source_change_events (previous_version_id);
create index if not exists idx_mobility_source_change_events_observed_version_id on public.mobility_source_change_events (observed_version_id);
create index if not exists idx_mobility_country_readiness_snapshots_rule_bundle_version_id on public.mobility_country_readiness_snapshots (rule_bundle_version_id);
create index if not exists idx_mobility_country_readiness_snapshots_expert_signoff_id on public.mobility_country_readiness_snapshots (expert_signoff_id);
create index if not exists idx_mobility_learning_consents_predecessor_consent_id on public.mobility_learning_consents (predecessor_consent_id);
create index if not exists idx_mobility_learning_experiment_events_experiment_id on public.mobility_learning_experiment_events (experiment_id);
create index if not exists idx_mobility_learning_experiment_events_actor_id on public.mobility_learning_experiment_events (actor_id);
create index if not exists idx_mobility_learning_assignments_user_id on public.mobility_learning_assignments (user_id);
create index if not exists idx_mobility_learning_assignments_consent_id on public.mobility_learning_assignments (consent_id);
create index if not exists idx_mobility_learning_evaluation_runs_experiment_id on public.mobility_learning_evaluation_runs (experiment_id);
create index if not exists idx_mobility_source_capture_reviews_source_version_id on public.mobility_source_capture_reviews (source_version_id);
create index if not exists idx_mobility_source_capture_reviews_reviewer_user_id on public.mobility_source_capture_reviews (reviewer_user_id);
create index if not exists idx_mobility_expert_signoffs_recorded_by on public.mobility_expert_signoffs (recorded_by);
create index if not exists idx_mobility_claim_reviews_recorded_by on public.mobility_claim_reviews (recorded_by);
create index if not exists idx_mobility_rule_bundle_current_activated_by on public.mobility_rule_bundle_current (activated_by);
create index if not exists idx_mobility_evaluation_fixture_sets_recorded_by on public.mobility_evaluation_fixture_sets (recorded_by);
create index if not exists idx_mobility_rule_bundle_evaluation_results_fixture_set_id on public.mobility_rule_bundle_evaluation_results (fixture_set_id);
create index if not exists idx_mobility_decision_comprehension_responses_user_id on public.mobility_decision_comprehension_responses (user_id);
create index if not exists idx_mobility_decision_comprehension_responses_consent_id on public.mobility_decision_comprehension_responses (consent_id);
create index if not exists idx_mdcr_predecessor_response_id on public.mobility_decision_comprehension_responses (predecessor_response_id);
