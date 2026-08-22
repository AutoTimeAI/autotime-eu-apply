// Tables holding a user's own data, each with a user_id column and an
// ON DELETE CASCADE ownership link to auth.users(id) - see
// app/api/account/export/route.ts for the GDPR Article 20 rationale and
// the deliberately-excluded operational/metering tables.
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
] as const
