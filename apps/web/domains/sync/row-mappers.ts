import {
  applicationRecordSchema,
  evidenceRecordSchema,
  interviewPrepPackSchema,
  outcomeRecordSchema,
  reusableAnswersSchema,
  type ApplicationRecord,
  type CompanionDashboardState,
  type EvidenceRecord,
  type InterviewPrepPack,
  type OutcomeRecord,
  type ReusableAnswers,
} from "shared"
import { parseContentSnapshot } from "../../lib/dashboard-content-snapshot.ts"
import type { Database } from "../../lib/supabase/types.ts"
import { normalizeApplicationUrlKey } from "./url-key.ts"
import type { SourceSurface } from "./sync-events.ts"

export type DashboardSnapshot = Pick<
  CompanionDashboardState,
  | "reusableAnswers"
  | "applications"
  | "evidenceRecords"
  | "outcomeRecords"
  | "interviewPrepPacks"
>

export const emptyReusableAnswers: ReusableAnswers = {
  sponsorshipAnswer: "",
  relocationAnswer: "",
  workAuthorisationAnswer: "",
  noticePeriodAnswer: "",
  salaryExpectationAnswer: "",
  motivationAnswer: "",
  strengthsAnswer: "",
  availabilityAnswer: "",
}

export function emptyDashboard(): DashboardSnapshot {
  return {
    reusableAnswers: emptyReusableAnswers,
    applications: [],
    evidenceRecords: [],
    outcomeRecords: [],
    interviewPrepPacks: [],
  }
}

export function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ""
  return trimmed.length ? trimmed : null
}

export function dateToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ""
  return trimmed.length ? trimmed : null
}

export function mapReusableAnswersToRow(
  userId: string,
  answers: ReusableAnswers,
  sourceSurface: SourceSurface,
): Database["public"]["Tables"]["reusable_answers"]["Insert"] {
  return {
    user_id: userId,
    sponsorship_answer: answers.sponsorshipAnswer,
    relocation_answer: answers.relocationAnswer,
    work_authorisation_answer: answers.workAuthorisationAnswer,
    notice_period_answer: answers.noticePeriodAnswer,
    salary_expectation_answer: answers.salaryExpectationAnswer,
    motivation_answer: answers.motivationAnswer,
    strengths_answer: answers.strengthsAnswer,
    availability_answer: answers.availabilityAnswer,
    source_surface: sourceSurface,
    schema_version: 1,
  }
}

export function mapApplicationToRow(
  userId: string,
  application: ApplicationRecord,
  sourceSurface: SourceSurface,
  idOverride?: string,
): Database["public"]["Tables"]["applications"]["Insert"] {
  return {
    id: idOverride ?? application.id,
    user_id: userId,
    title: application.title,
    url: application.url,
    url_key: normalizeApplicationUrlKey(application.url || application.id),
    company: emptyToNull(application.company),
    role_title: emptyToNull(application.roleTitle),
    source: emptyToNull(application.source),
    ats_platform: application.atsPlatform ?? "unknown",
    status: application.status,
    next_action: emptyToNull(application.nextAction),
    next_action_date: dateToNull(application.nextActionDate),
    notes: emptyToNull(application.notes),
    outcome_reason: application.outcomeReason ?? "Unknown",
    fit_score: application.fitScore ?? null,
    fit_decision: application.fitDecision ?? null,
    content_gate: application.contentGate ?? null,
    content_snapshot: application.contentSnapshot ?? null,
    job_snapshot: null,
    source_surface: sourceSurface,
    schema_version: 1,
    created_at: application.createdAt,
    updated_at: application.updatedAt ?? new Date().toISOString(),
  }
}

export function mapEvidenceToRow(
  userId: string,
  record: EvidenceRecord,
  applicationIdMap: Map<string, string> = new Map(),
): Database["public"]["Tables"]["evidence_records"]["Insert"] {
  return {
    id: record.id,
    user_id: userId,
    application_id: record.applicationId
      ? (applicationIdMap.get(record.applicationId) ?? record.applicationId)
      : null,
    job_url: emptyToNull(record.jobUrl),
    check_key: record.checkKey,
    check_label: record.checkLabel,
    status: record.status,
    evidence_text: record.evidenceText,
    source_type: record.sourceType,
    source_label: record.sourceLabel,
    missing_input: emptyToNull(record.missingInput),
    risk_flag: emptyToNull(record.riskFlag),
    explanation: record.explanation,
    limit_text: record.limit,
    schema_version: 1,
    created_at: record.createdAt,
  }
}

export function mapOutcomeToRow(
  userId: string,
  record: OutcomeRecord,
  applicationIdMap: Map<string, string> = new Map(),
): Database["public"]["Tables"]["outcome_records"]["Insert"] {
  return {
    id: record.id,
    user_id: userId,
    application_id:
      applicationIdMap.get(record.applicationId) ?? record.applicationId,
    role_title: record.roleTitle,
    company: emptyToNull(record.company),
    country: emptyToNull(record.country),
    source: emptyToNull(record.source),
    status: record.status,
    outcome_reason: record.outcomeReason,
    decision_index_at_save: record.decisionIndexAtSave ?? null,
    decision_label_at_save: record.decisionLabelAtSave ?? null,
    content_gate_at_save: record.contentGateAtSave ?? null,
    applied_at: record.appliedAt ?? null,
    interview_at: record.interviewAt ?? null,
    closed_at: record.closedAt ?? null,
    notes: emptyToNull(record.notes),
    schema_version: 1,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

export function mapPrepPackToRow(
  userId: string,
  pack: InterviewPrepPack,
  sourceSurface: SourceSurface,
  applicationIdMap: Map<string, string> = new Map(),
): Database["public"]["Tables"]["interview_prep_packs"]["Insert"] {
  return {
    id: pack.id,
    user_id: userId,
    application_id:
      applicationIdMap.get(pack.applicationId) ?? pack.applicationId,
    role_summary: pack.roleSummary,
    positioning_statement: pack.positioningStatement,
    fit_and_gap_recap: pack.fitAndGapRecap,
    likely_questions: pack.likelyQuestions,
    star_answer_prompts: pack.starAnswerPrompts,
    project_talking_points: pack.projectTalkingPoints,
    skills_to_revise: pack.skillsToRevise,
    questions_to_ask_employer: pack.questionsToAskEmployer,
    final_prep_checklist: pack.finalPrepChecklist,
    source_surface: sourceSurface,
    schema_version: 1,
    created_at: pack.createdAt,
    updated_at: pack.updatedAt,
  }
}

export function rowToReusableAnswers(
  row: Database["public"]["Tables"]["reusable_answers"]["Row"] | null,
): ReusableAnswers {
  return reusableAnswersSchema.parse({
    sponsorshipAnswer: row?.sponsorship_answer ?? "",
    relocationAnswer: row?.relocation_answer ?? "",
    workAuthorisationAnswer: row?.work_authorisation_answer ?? "",
    noticePeriodAnswer: row?.notice_period_answer ?? "",
    salaryExpectationAnswer: row?.salary_expectation_answer ?? "",
    motivationAnswer: row?.motivation_answer ?? "",
    strengthsAnswer: row?.strengths_answer ?? "",
    availabilityAnswer: row?.availability_answer ?? "",
  })
}

export function rowToApplication(
  row: Database["public"]["Tables"]["applications"]["Row"],
): ApplicationRecord {
  return applicationRecordSchema.parse({
    id: row.id,
    title: row.title,
    url: row.url,
    company: row.company ?? undefined,
    roleTitle: row.role_title ?? undefined,
    source: row.source ?? undefined,
    atsPlatform: row.ats_platform,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    nextAction: row.next_action ?? undefined,
    nextActionDate: row.next_action_date ?? undefined,
    notes: row.notes ?? undefined,
    outcomeReason: row.outcome_reason,
    fitScore: row.fit_score ?? undefined,
    fitDecision: row.fit_decision ?? undefined,
    contentGate: row.content_gate ?? undefined,
    contentSnapshot: parseContentSnapshot(row.id, row.content_snapshot),
  })
}

export function rowToEvidence(
  row: Database["public"]["Tables"]["evidence_records"]["Row"],
): EvidenceRecord {
  return evidenceRecordSchema.parse({
    id: row.id,
    applicationId: row.application_id ?? undefined,
    jobUrl: row.job_url ?? undefined,
    checkKey: row.check_key,
    checkLabel: row.check_label,
    status: row.status,
    evidenceText: row.evidence_text,
    sourceType: row.source_type,
    sourceLabel: row.source_label,
    missingInput: row.missing_input ?? undefined,
    riskFlag: row.risk_flag ?? undefined,
    explanation: row.explanation,
    limit: row.limit_text,
    createdAt: row.created_at,
  })
}

export function rowToOutcome(
  row: Database["public"]["Tables"]["outcome_records"]["Row"],
): OutcomeRecord {
  return outcomeRecordSchema.parse({
    id: row.id,
    applicationId: row.application_id,
    roleTitle: row.role_title,
    company: row.company ?? undefined,
    country: row.country ?? undefined,
    source: row.source ?? undefined,
    status: row.status,
    outcomeReason: row.outcome_reason,
    decisionIndexAtSave: row.decision_index_at_save ?? undefined,
    decisionLabelAtSave: row.decision_label_at_save ?? undefined,
    contentGateAtSave: row.content_gate_at_save ?? undefined,
    appliedAt: row.applied_at ?? undefined,
    interviewAt: row.interview_at ?? undefined,
    closedAt: row.closed_at ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

export function rowToPrepPack(
  row: Database["public"]["Tables"]["interview_prep_packs"]["Row"],
): InterviewPrepPack {
  return interviewPrepPackSchema.parse({
    id: row.id,
    applicationId: row.application_id,
    roleSummary: row.role_summary,
    positioningStatement: row.positioning_statement,
    fitAndGapRecap: row.fit_and_gap_recap,
    likelyQuestions: row.likely_questions,
    starAnswerPrompts: row.star_answer_prompts,
    projectTalkingPoints: row.project_talking_points,
    skillsToRevise: row.skills_to_revise,
    questionsToAskEmployer: row.questions_to_ask_employer,
    finalPrepChecklist: row.final_prep_checklist,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}
