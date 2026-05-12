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
  deletedApplicationIds: string[]
  synced: true
}

type DashboardDeleteData = {
  deleted: true
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

type SourceSurface = Database["public"]["Tables"]["sync_events"]["Insert"]["source_surface"]

const dashboardWorkflowSchema = companionDashboardStateSchema.pick({
  reusableAnswers: true,
  applications: true,
  evidenceRecords: true,
  outcomeRecords: true,
  interviewPrepPacks: true
})

const dashboardDeleteSchema = z.object({
  applicationId: z.string().trim().min(1).optional(),
  url: z.string().trim().min(1).optional()
}).refine((value) => value.applicationId || value.url, {
  message: "applicationId or url is required"
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

function normalizeApplicationUrlKey(url: string) {
  try {
    const parsed = new URL(url)
    parsed.hash = ""
    parsed.hostname = parsed.hostname.toLowerCase()
    parsed.pathname = parsed.pathname.replace(/\/+$/, "")
    return parsed.toString().replace(/\/$/, "").toLowerCase()
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, "")
  }
}

function mapReusableAnswersToRow(
  userId: string,
  answers: ReusableAnswers,
  sourceSurface: SourceSurface
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
    schema_version: 1
  }
}

function mapApplicationToRow(
  userId: string,
  application: ApplicationRecord,
  sourceSurface: SourceSurface,
  idOverride?: string
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
    updated_at: application.updatedAt ?? new Date().toISOString()
  }
}

function mapEvidenceToRow(
  userId: string,
  record: EvidenceRecord,
  applicationIdMap: Map<string, string> = new Map()
): Database["public"]["Tables"]["evidence_records"]["Insert"] {
  return {
    id: record.id,
    user_id: userId,
    application_id: record.applicationId
      ? applicationIdMap.get(record.applicationId) ?? record.applicationId
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
    created_at: record.createdAt
  }
}

function mapOutcomeToRow(
  userId: string,
  record: OutcomeRecord,
  applicationIdMap: Map<string, string> = new Map()
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
    updated_at: record.updatedAt
  }
}

function mapPrepPackToRow(
  userId: string,
  pack: InterviewPrepPack,
  sourceSurface: SourceSurface,
  applicationIdMap: Map<string, string> = new Map()
): Database["public"]["Tables"]["interview_prep_packs"]["Insert"] {
  return {
    id: pack.id,
    user_id: userId,
    application_id: applicationIdMap.get(pack.applicationId) ?? pack.applicationId,
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
    updated_at: pack.updatedAt
  }
}

function getSourceSurface(request: NextRequest): SourceSurface {
  return request.headers.get("x-autotime-source") === "extension"
    ? "extension"
    : "web"
}

function mapSyncEvents({
  applicationIdMap,
  payload,
  sourceSurface,
  userId
}: {
  applicationIdMap?: Map<string, string>
  payload: DashboardWorkflowPayload
  sourceSurface: SourceSurface
  userId: string
}): Database["public"]["Tables"]["sync_events"]["Insert"][] {
  const events: Database["public"]["Tables"]["sync_events"]["Insert"][] = [
    {
      action: "updated",
      entity_id: userId,
      entity_type: "reusable_answers",
      message: "Reusable answers synced to dashboard.",
      source_surface: sourceSurface,
      user_id: userId
    }
  ]

  for (const application of payload.applications) {
    events.push({
      action: "updated",
      entity_id: applicationIdMap?.get(application.id) ?? application.id,
      entity_type: "application",
      message: "Application synced to dashboard.",
      source_surface: sourceSurface,
      user_id: userId
    })
  }

  for (const record of payload.evidenceRecords ?? []) {
    events.push({
      action: "updated",
      entity_id: record.id,
      entity_type: "evidence_record",
      message: "Evidence record synced to dashboard.",
      source_surface: sourceSurface,
      user_id: userId
    })
  }

  for (const record of payload.outcomeRecords ?? []) {
    events.push({
      action: "updated",
      entity_id: record.id,
      entity_type: "outcome_record",
      message: "Outcome record synced to dashboard.",
      source_surface: sourceSurface,
      user_id: userId
    })
  }

  for (const pack of payload.interviewPrepPacks ?? []) {
    events.push({
      action: "updated",
      entity_id: pack.id,
      entity_type: "interview_prep_pack",
      message: "Interview prep pack synced to dashboard.",
      source_surface: sourceSurface,
      user_id: userId
    })
  }

  return events
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
    updatedAt: row.updated_at,
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
    const sourceSurface = getSourceSurface(request)
    const applicationUrlKeys = payload.applications.map((application) =>
      normalizeApplicationUrlKey(application.url || application.id)
    )
    const tombstoneResult = applicationUrlKeys.length
      ? await supabase
          .from("deleted_application_tombstones")
          .select("url_key")
          .eq("user_id", auth.user.id)
          .in("url_key", applicationUrlKeys)
      : { data: [], error: null }

    if (tombstoneResult.error) {
      return diagnosticJson({
        area: "sync",
        code: "sync.dashboard.tombstones.failed",
        data: null,
        error: tombstoneResult.error.message,
        log: true,
        request,
        status: 500
      })
    }

    const deletedUrlKeys = new Set(
      (tombstoneResult.data ?? []).map((row) => row.url_key)
    )
    const deletedApplicationIds = payload.applications
      .filter((application) =>
        deletedUrlKeys.has(
          normalizeApplicationUrlKey(application.url || application.id)
        )
      )
      .map((application) => application.id)
    const activeApplications = payload.applications.filter(
      (application) =>
        !deletedUrlKeys.has(
          normalizeApplicationUrlKey(application.url || application.id)
        )
    )
    const applicationIdMap = new Map<string, string>()

    if (activeApplications.length) {
      const { data, error } = await supabase
        .from("applications")
        .select("id, url_key")
        .eq("user_id", auth.user.id)
        .in(
          "url_key",
          activeApplications.map((application) =>
            normalizeApplicationUrlKey(application.url || application.id)
          )
        )

      if (error) {
        return diagnosticJson({
          area: "sync",
          code: "sync.dashboard.application-identity.failed",
          data: null,
          error: error.message,
          log: true,
          request,
          status: 500
        })
      }

      const existingByUrlKey = new Map(
        (data ?? []).map((row) => [row.url_key, row.id])
      )

      for (const application of activeApplications) {
        const existingId = existingByUrlKey.get(
          normalizeApplicationUrlKey(application.url || application.id)
        )

        if (existingId) {
          applicationIdMap.set(application.id, existingId)
        }
      }
    }

    const reusableAnswersResult = await supabase
      .from("reusable_answers")
      .upsert(
        mapReusableAnswersToRow(
          auth.user.id,
          payload.reusableAnswers,
          sourceSurface
        ),
        { onConflict: "user_id" }
      )

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

    if (activeApplications.length) {
      const { error } = await supabase
        .from("applications")
        .upsert(
          activeApplications.map((item) =>
            mapApplicationToRow(
              auth.user.id,
              item,
              sourceSurface,
              applicationIdMap.get(item.id)
            )
          ),
          { onConflict: "user_id,url_key" }
        )

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

    const activeApplicationIds = new Set(
      activeApplications.map((application) => application.id)
    )
    const activeEvidenceRecords = (payload.evidenceRecords ?? []).filter(
      (record) => !record.applicationId || activeApplicationIds.has(record.applicationId)
    )
    const activeOutcomeRecords = (payload.outcomeRecords ?? []).filter((record) =>
      activeApplicationIds.has(record.applicationId)
    )
    const activeInterviewPrepPacks = payload.interviewPrepPacks.filter((pack) =>
      activeApplicationIds.has(pack.applicationId)
    )

    if (activeEvidenceRecords.length) {
      const { error } = await supabase
        .from("evidence_records")
        .upsert(
          activeEvidenceRecords.map((item) =>
            mapEvidenceToRow(auth.user.id, item, applicationIdMap)
          ),
          { onConflict: "id" }
        )

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

    if (activeOutcomeRecords.length) {
      const { error } = await supabase
        .from("outcome_records")
        .upsert(
          activeOutcomeRecords.map((item) =>
            mapOutcomeToRow(auth.user.id, item, applicationIdMap)
          ),
          { onConflict: "user_id,application_id" }
        )

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

    if (activeInterviewPrepPacks.length) {
      const { error } = await supabase
        .from("interview_prep_packs")
        .upsert(
          activeInterviewPrepPacks.map((item) =>
            mapPrepPackToRow(
              auth.user.id,
              item,
              sourceSurface,
              applicationIdMap
            )
          ),
          { onConflict: "user_id,application_id" }
        )

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

    const syncEvents = mapSyncEvents({
      applicationIdMap,
      payload: {
        ...payload,
        applications: activeApplications,
        evidenceRecords: activeEvidenceRecords,
        outcomeRecords: activeOutcomeRecords,
        interviewPrepPacks: activeInterviewPrepPacks
      },
      sourceSurface,
      userId: auth.user.id
    })

    if (syncEvents.length) {
      const { error } = await supabase.from("sync_events").insert(syncEvents)

      if (error) {
        return diagnosticJson({
          area: "sync",
          code: "sync.dashboard.events.failed",
          data: null,
          error: error.message,
          log: true,
          request,
          status: 500
        })
      }
    }

    if (sourceSurface === "extension") {
      const { error } = await supabase
        .from("extension_connections")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("user_id", auth.user.id)
        .is("revoked_at", null)

      if (error) {
        return diagnosticJson({
          area: "sync",
          code: "sync.dashboard.extension-touch.failed",
          data: null,
          error: error.message,
          log: true,
          request,
          status: 500
        })
      }
    }

    return jsonResponse({
      data: { deletedApplicationIds, synced: true },
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

export async function DELETE(
  request: NextRequest
): Promise<NextResponse<ApiResponse<DashboardDeleteData>>> {
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

    const body = dashboardDeleteSchema.parse(await request.json())
    const supabase = createAdminClient()
    const sourceSurface = getSourceSurface(request)
    const existingQuery = supabase
      .from("applications")
      .select("id, url_key")
      .eq("user_id", auth.user.id)

    const { data: existingApplications, error: readError } = body.url
      ? await existingQuery.eq("url_key", normalizeApplicationUrlKey(body.url))
      : await existingQuery.eq("id", body.applicationId ?? "")

    if (readError) {
      return diagnosticJson({
        area: "sync",
        code: "sync.dashboard.delete.read.failed",
        data: null,
        error: readError.message,
        log: true,
        request,
        status: 500
      })
    }

    const targetApplications = existingApplications ?? []
    const targetIds = targetApplications.map((application) => application.id)
    const urlKey =
      targetApplications[0]?.url_key ??
      normalizeApplicationUrlKey(body.url ?? body.applicationId ?? "")

    const tombstoneResult = await supabase
      .from("deleted_application_tombstones")
      .upsert(
        {
          user_id: auth.user.id,
          application_id: targetIds[0] ?? body.applicationId ?? null,
          url_key: urlKey,
          source_surface: sourceSurface,
          reason: "user_deleted"
        },
        { onConflict: "user_id,url_key" }
      )

    if (tombstoneResult.error) {
      return diagnosticJson({
        area: "sync",
        code: "sync.dashboard.delete.tombstone.failed",
        data: null,
        error: tombstoneResult.error.message,
        log: true,
        request,
        status: 500
      })
    }

    if (targetIds.length) {
      const [prepResult, outcomeResult, evidenceResult] = await Promise.all([
        supabase
          .from("interview_prep_packs")
          .delete()
          .eq("user_id", auth.user.id)
          .in("application_id", targetIds),
        supabase
          .from("outcome_records")
          .delete()
          .eq("user_id", auth.user.id)
          .in("application_id", targetIds),
        supabase
          .from("evidence_records")
          .delete()
          .eq("user_id", auth.user.id)
          .in("application_id", targetIds)
      ])
      const childError = [prepResult.error, outcomeResult.error, evidenceResult.error].find(Boolean)

      if (childError) {
        return diagnosticJson({
          area: "sync",
          code: "sync.dashboard.delete.children.failed",
          data: null,
          error: childError.message,
          log: true,
          request,
          status: 500
        })
      }

      const deleteResult = await supabase
        .from("applications")
        .delete()
        .eq("user_id", auth.user.id)
        .in("id", targetIds)

      if (deleteResult.error) {
        return diagnosticJson({
          area: "sync",
          code: "sync.dashboard.delete.application.failed",
          data: null,
          error: deleteResult.error.message,
          log: true,
          request,
          status: 500
        })
      }
    }

    await supabase.from("sync_events").insert({
      action: "deleted",
      entity_id: targetIds[0] ?? body.applicationId ?? urlKey,
      entity_type: "application",
      message: "Application deleted from dashboard.",
      source_surface: sourceSurface,
      user_id: auth.user.id
    })

    return jsonResponse({
      data: { deleted: true },
      error: null,
      status: 200
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return diagnosticJson({
        area: "sync",
        code: "sync.dashboard.delete.request.invalid",
        data: null,
        error: "Invalid dashboard delete body",
        request,
        status: 400
      })
    }

    const message =
      error instanceof Error ? error.message : "Dashboard delete failed"

    return diagnosticJson({
      area: "sync",
      code: "sync.dashboard.delete.failed",
      data: null,
      error: message,
      log: true,
      request,
      status: 500
    })
  }
}
