// Tables holding a user's own data, each with a user_id column - see
// app/api/account/export/route.ts for the GDPR Article 20 rationale and
// the deliberately-excluded operational/metering tables.
//
// Found 2026-09-20 by diffing this list against every public.* table with
// a user_id column (live database query, not migration-file inspection):
// 10 tables held genuine personal content but were in neither this list
// nor the export route's documented exclusion comment - simply never
// accounted for. Added the 9 below that hold real content (career/job
// search data, tracked jobs, app settings, feedback text, mobility
// governance responses); `capture_handoffs` was included too despite
// being a short-lived pass-through token record, since it can contain
// `raw_text` (pasted vacancy text) and costs nothing extra to include.
// `admin_memberships`, `deleted_application_tombstones`,
// `extension_connections`, and the operational/metering tables named in
// the export route's own comment remain deliberately excluded - see that
// comment for the reasoning.
export const exportedTables = [
  "profiles",
  "profile_revisions",
  "account_settings",
  "subscriptions",
  "mobility_profiles",
  "user_accounts",
  "applications",
  "evidence_records",
  "outcome_records",
  "interview_prep_packs",
  "reusable_answers",
  "beta_access",
  "job_workflow_jobs",
  "job_workflow_analysis_snapshots",
  "job_workflow_applications",
  "job_workflow_screening_answers",
  "interview_records",
  "interview_questions",
  "interview_preparation_snapshots",
  "cover_letters",
  "outreach_contacts",
  "outreach_messages",
  "user_skill_profile",
  "esco_questionnaire_answers",
  "mobility_candidate_evidence_items",
  "mobility_vacancy_snapshots",
  "mobility_employer_verifications",
  "mobility_decision_records",
  "mobility_decision_corrections",
  "mobility_decision_replays",
  "mobility_learning_consents",
  "mobility_learning_events",
  "mobility_learning_assignments",
  "mobility_decision_comprehension_responses",
  "career_search_profiles",
  "custom_job_sources",
  "custom_sponsor_companies",
  "tracked_jobs",
  "seen_job_postings",
  "user_app_settings",
  "beta_feedback",
  "capture_handoffs",
] as const
