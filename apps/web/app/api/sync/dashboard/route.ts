import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  applicationRecordSchema,
  companionDashboardStateSchema,
  evidenceRecordSchema,
  interviewPrepPackSchema,
  outcomeRecordSchema,
  reusableAnswersSchema,
  type ApplicationRecord,
  type CompanionDashboardState,
  type EvidenceRecord,
  type InterviewPrepPack,
  type OutcomeRecord,
  type ReusableAnswers
} from "shared"
import { getRequestUser } from "../../../../lib/api-auth"
import { diagnosticJson } from "../../../../lib/diagnostics"
import { createAdminClient } from "../../../../lib/supabase/admin"
import type { Database } from "../../../../lib/supabase/types"

type ApiResponse<T> = {
  data: T | null
  error: string | null
  status: number
}

type DashboardSyncData = {
  synced: true
}

type DashboardReadData = {
  dashboard: Pick<
    CompanionDashboardState,
    | "reusableAnswers"
    | "applications"
    | "evidenceRecords"
    | "outcomeRecords"
    | "interviewPrepPacks"
  >
}

const dashboardWorkflowSchema = companionDashboardStateSchema.pick({
  reusableAnswers: true,
  applications: true,
  evidenceRecords: true,
  outcomeRecords: true,
  interviewPrepPacks: true
})

type DashboardWorkflowPayload = z.infer<typeof dashboardWorkflowSchema>

function jsonResponse<T>(
  body: ApiResponse<T>
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(body, { status: body.status })
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ""
  return trimmed.length ? trimmed : null
}

function dateToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ""
  return trimmed.length ? trimmed : null
}

function mapReusableAnswersToRow(
  userId: string,
  answers: ReusableAnswers
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
    source_surface: "web",
    schema_version: 1
  }
}

function mapApplicationToRow(
  userId: string,
  application: ApplicationRecord
): Database["public"]["Tables"]["applications"]["Insert"] {
  return {
    id: application.id,
    user_id: userId,
    title: application.title,
    url: application.url,
    company: emptyToNull(application.company),
    role_title: emptyToNull(application.roleTitle),
    source: emptyToNull(application.source),
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
    source_surface: "web",
    schema_version: 1,
    created_at: application.createdAt
  }
}

function mapEvidenceToRow(
  userId: string,
  record: EvidenceRecord
): Database["public"]["Tables"]["evidence_records"]["Insert"] {
  return {
    id: record.id,
    user_id: userId,
    application_id: record.applicationId ?? null,
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
    created_at: record.createdAt
  }
}

function mapOutcomeToRow(
  userId: string,
  record: OutcomeRecord
): Database["public"]["Tables"]["outcome_records"]["Insert"] {
  return {
    id: record.id,
    user_id: userId,
    application_id: record.applicationId,
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
    updated_at: record.updatedAt
  }
}

function mapPrepPackToRow(
  userId: string,
  pack: InterviewPrepPack
): Database["public"]["Tables"]["interview_prep_packs"]["Insert"] {
  return {
    id: pack.id,
    user_id: userId,
    application_id: pack.applicationId,
    role_summary: pack.roleSummary,
    positioning_statement: pack.positioningStatement,
    fit_and_gap_recap: pack.fitAndGapRecap,
    likely_questions: pack.likelyQuestions,
    star_answer_prompts: pack.starAnswerPrompts,
    project_talking_points: pack.projectTalkingPoints,
    skills_to_revise: pack.skillsToRevise,
    questions_to_ask_employer: pack.questionsToAskEmployer,
    final_prep_checklist: pack.finalPrepChecklist,
    source_surface: "web",
    schema_version: 1,
    created_at: pack.createdAt,
    updated_at: pack.updatedAt
  }
}

function rowToReusableAnswers(
  row: Database["public"]["Tables"]["reusable_answers"]["Row"] | null
): ReusableAnswers {
  return reusableAnswersSchema.parse({
    sponsorshipAnswer: row?.sponsorship_answer ?? "",
    relocationAnswer: row?.relocation_answer ?? "",
    workAuthorisationAnswer: row?.work_authorisation_answer ?? "",
    noticePeriodAnswer: row?.notice_period_answer ?? "",
    salaryExpectationAnswer: row?.salary_expectation_answer ?? "",
    motivationAnswer: row?.motivation_answer ?? "",
    strengthsAnswer: row?.strengths_answer ?? "",
    availabilityAnswer: row?.availability_answer ?? ""
  })
}

function rowToApplication(
  row: Database["public"]["Tables"]["applications"]["Row"]
): ApplicationRecord {
  return applicationRecordSchema.parse({
    id: row.id,
    title: row.title,
    url: row.url,
    company: row.company ?? undefined,
    roleTitle: row.role_title ?? undefined,
    source: row.source ?? undefined,
    createdAt: row.created_at,
    status: row.status,
    nextAction: row.next_action ?? undefined,
    nextActionDate: row.next_action_date ?? undefined,
    notes: row.notes ?? undefined,
    outcomeReason: row.outcome_reason,
    fitScore: row.fit_score ?? undefined,
    fitDecision: row.fit_decision ?? undefined,
    contentGate: row.content_gate ?? undefined,
    contentSnapshot: row.content_snapshot ?? undefined
  })
}

function rowToEvidence(
  row: Database["public"]["Tables"]["evidence_records"]["Row"]
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
    createdAt: row.created_at
  })
}

function rowToOutcome(
  row: Database["public"]["Tables"]["outcome_records"]["Row"]
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
    updatedAt: row.updated_at
  })
}

function rowToPrepPack(
  row: Database["public"]["Tables"]["interview_prep_packs"]["Row"]
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
    updatedAt: row.updated_at
  })
}

async function requireAuthenticatedUser(request: NextRequest) {
  const { user, error } = await getRequestUser(request)

  if (error || !user) {
    return { error: "Unauthorised", status: 401 as const, user: null }
  }

  return { error: null, status: 200 as const, user }
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<DashboardReadData>>> {
  try {
    const auth = await requireAuthenticatedUser(request)

    if (!auth.user) {
      return diagnosticJson({
        area: "sync",
        code: "sync.dashboard.auth.blocked",
        data: null,
        error: auth.error,
        request,
        status: auth.status
      })
    }

    const supabase = createAdminClient()
    const [
      reusableAnswersResult,
      applicationsResult,
      evidenceResult,
      outcomesResult,
      prepPacksResult
    ] = await Promise.all([
      supabase
        .from("reusable_answers")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle(),
      supabase
        .from("applications")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("evidence_records")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("outcome_records")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("interview_prep_packs")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
    ])

    const firstError = [
      reusableAnswersResult.error,
      applicationsResult.error,
      evidenceResult.error,
      outcomesResult.error,
      prepPacksResult.error
    ].find(Boolean)

    if (firstError) {
      return diagnosticJson({
        area: "sync",
        code: "sync.dashboard.read.failed",
        data: null,
        error: firstError.message,
        log: true,
        request,
        status: 500
      })
    }

    return jsonResponse({
      data: {
        dashboard: {
          reusableAnswers: rowToReusableAnswers(reusableAnswersResult.data),
          applications: (applicationsResult.data ?? []).map(rowToApplication),
          evidenceRecords: (evidenceResult.data ?? []).map(rowToEvidence),
          outcomeRecords: (outcomesResult.data ?? []).map(rowToOutcome),
          interviewPrepPacks: (prepPacksResult.data ?? []).map(rowToPrepPack)
        }
      },
      error: null,
      status: 200
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Dashboard sync read failed"

    return diagnosticJson({
      area: "sync",
      code: "sync.dashboard.read.unexpected",
      data: null,
      error: message,
      log: true,
      request,
      status: 500
    })
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<DashboardSyncData>>> {
  try {
    const auth = await requireAuthenticatedUser(request)

    if (!auth.user) {
      return diagnosticJson({
        area: "sync",
        code: "sync.dashboard.auth.blocked",
        data: null,
        error: auth.error,
        request,
        status: auth.status
      })
    }

    const payload = dashboardWorkflowSchema.parse(await request.json())
    const supabase = createAdminClient()

    const deleteSteps = [
      await supabase.from("interview_prep_packs").delete().eq("user_id", auth.user.id),
      await supabase.from("evidence_records").delete().eq("user_id", auth.user.id),
      await supabase.from("outcome_records").delete().eq("user_id", auth.user.id),
      await supabase.from("applications").delete().eq("user_id", auth.user.id)
    ]
    const deleteError = deleteSteps.map((step) => step.error).find(Boolean)

    if (deleteError) {
      return diagnosticJson({
        area: "sync",
        code: "sync.dashboard.delete.failed",
        data: null,
        error: deleteError.message,
        log: true,
        request,
        status: 500
      })
    }

    const reusableAnswersResult = await supabase
      .from("reusable_answers")
      .upsert(mapReusableAnswersToRow(auth.user.id, payload.reusableAnswers), {
        onConflict: "user_id"
      })

    if (reusableAnswersResult.error) {
      return diagnosticJson({
        area: "sync",
        code: "sync.dashboard.answers.failed",
        data: null,
        error: reusableAnswersResult.error.message,
        log: true,
        request,
        status: 500
      })
    }

    if (payload.applications.length) {
      const { error } = await supabase
        .from("applications")
        .insert(payload.applications.map((item) => mapApplicationToRow(auth.user.id, item)))

      if (error) {
        return diagnosticJson({
          area: "sync",
          code: "sync.dashboard.applications.failed",
          data: null,
          error: error.message,
          log: true,
          request,
          status: 500
        })
      }
    }

    if (payload.evidenceRecords?.length) {
      const { error } = await supabase
        .from("evidence_records")
        .insert(payload.evidenceRecords.map((item) => mapEvidenceToRow(auth.user.id, item)))

      if (error) {
        return diagnosticJson({
          area: "sync",
          code: "sync.dashboard.evidence.failed",
          data: null,
          error: error.message,
          log: true,
          request,
          status: 500
        })
      }
    }

    if (payload.outcomeRecords?.length) {
      const { error } = await supabase
        .from("outcome_records")
        .insert(payload.outcomeRecords.map((item) => mapOutcomeToRow(auth.user.id, item)))

      if (error) {
        return diagnosticJson({
          area: "sync",
          code: "sync.dashboard.outcomes.failed",
          data: null,
          error: error.message,
          log: true,
          request,
          status: 500
        })
      }
    }

    if (payload.interviewPrepPacks.length) {
      const { error } = await supabase
        .from("interview_prep_packs")
        .insert(payload.interviewPrepPacks.map((item) => mapPrepPackToRow(auth.user.id, item)))

      if (error) {
        return diagnosticJson({
          area: "sync",
          code: "sync.dashboard.prep.failed",
          data: null,
          error: error.message,
          log: true,
          request,
          status: 500
        })
      }
    }

    return jsonResponse({
      data: { synced: true },
      error: null,
      status: 200
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return diagnosticJson({
        area: "sync",
        code: "sync.dashboard.request.invalid",
        data: null,
        error: "Invalid dashboard sync body",
        request,
        status: 400
      })
    }

    const message =
      error instanceof Error ? error.message : "Dashboard sync failed"

    return diagnosticJson({
      area: "sync",
      code: "sync.dashboard.failed",
      data: null,
      error: message,
      log: true,
      request,
      status: 500
    })
  }
}
