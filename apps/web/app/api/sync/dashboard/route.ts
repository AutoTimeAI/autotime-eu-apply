import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { companionDashboardStateSchema } from "shared"
import { getRequestUser } from "../../../../lib/api-auth"
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "../../../../lib/configuration-error"
import { diagnosticJson } from "../../../../lib/diagnostics"
import { trackJobImportStarted } from "../../../../lib/sentry-breadcrumbs"
import { createAdminClient } from "../../../../lib/supabase/admin"
import { isTestAuthUserId } from "../../../../lib/test-auth"
import {
  emptyDashboard,
  getSourceSurface,
  mapApplicationToRow,
  mapEvidenceToRow,
  mapOutcomeToRow,
  mapPrepPackToRow,
  mapReusableAnswersToRow,
  mapSyncEvents,
  normalizeApplicationUrlKey,
  normalizeLegacyDashboardPayload,
  rowToApplication,
  rowToEvidence,
  rowToOutcome,
  rowToPrepPack,
  rowToReusableAnswers,
  type DashboardSnapshot,
  type SourceSurface,
} from "../../../../domains/sync"

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
  dashboard: DashboardSnapshot
}

// Defensive ceiling, not a pagination redesign: this GET previously had no
// limit at all on any of the four per-user tables, so cost scaled with a
// single user's entire lifetime history on every dashboard load. This is
// deliberately far above any real user's realistic row count (even a very
// active multi-year job search) - it only ever bites in a pathological
// case, not real usage - so it closes the "zero ceiling" defect without
// truncating anyone's actual data. All four queries already order by
// recency descending, so a cap (if it were ever hit) would drop only the
// oldest rows, never active/recent ones. A real fix for the underlying
// "resync cost grows with total history" concern is incremental
// (updated_at-cursor) sync, which is a genuinely different, much larger
// change to this local-first architecture's data model - out of scope
// here.
const MAX_SYNCED_ROWS_PER_TABLE = 20_000

const dashboardWorkflowSchema = companionDashboardStateSchema
  .pick({
    reusableAnswers: true,
    applications: true,
    evidenceRecords: true,
    outcomeRecords: true,
    interviewPrepPacks: true,
  })
  .partial({
    reusableAnswers: true,
  })

const dashboardDeleteSchema = z
  .object({
    applicationId: z.string().trim().min(1).optional(),
    url: z.string().trim().min(1).optional(),
  })
  .refine((value) => value.applicationId || value.url, {
    message: "applicationId or url is required",
  })

type DashboardWorkflowPayload = z.infer<typeof dashboardWorkflowSchema>

function jsonResponse<T>(body: ApiResponse<T>): NextResponse<ApiResponse<T>> {
  return NextResponse.json(body, { status: body.status })
}

async function requireAuthenticatedUser(request: NextRequest) {
  const { user, error } = await getRequestUser(request)

  if (error || !user) {
    return { error: "Unauthorised", status: 401 as const, user: null }
  }

  return { error: null, status: 200 as const, user }
}

export async function GET(
  request: NextRequest,
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
        status: auth.status,
      })
    }

    if (isTestAuthUserId(auth.user.id)) {
      console.warn(
        "autotime_test_auth_bypass: GET /api/sync/dashboard short-circuited by AUTOTIME_TEST_AUTH_ENABLED - returning an empty dashboard without reading the database. If this is unexpected, check the AUTOTIME_TEST_AUTH_ENABLED environment variable for this deployment.",
      )
      return jsonResponse({
        data: { dashboard: emptyDashboard() },
        error: null,
        status: 200,
      })
    }

    const supabase = createAdminClient()
    const [
      reusableAnswersResult,
      applicationsResult,
      evidenceResult,
      outcomesResult,
      prepPacksResult,
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
        .order("created_at", { ascending: false })
        .limit(MAX_SYNCED_ROWS_PER_TABLE),
      supabase
        .from("evidence_records")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(MAX_SYNCED_ROWS_PER_TABLE),
      supabase
        .from("outcome_records")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("updated_at", { ascending: false })
        .limit(MAX_SYNCED_ROWS_PER_TABLE),
      supabase
        .from("interview_prep_packs")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(MAX_SYNCED_ROWS_PER_TABLE),
    ])

    const firstError = [
      reusableAnswersResult.error,
      applicationsResult.error,
      evidenceResult.error,
      outcomesResult.error,
      prepPacksResult.error,
    ].find(Boolean)

    if (firstError) {
      return diagnosticJson({
        area: "sync",
        code: "sync.dashboard.read.failed",
        data: null,
        error: firstError.message,
        log: true,
        request,
        status: 500,
      })
    }

    return jsonResponse({
      data: {
        dashboard: {
          reusableAnswers: rowToReusableAnswers(reusableAnswersResult.data),
          applications: (applicationsResult.data ?? []).map(rowToApplication),
          evidenceRecords: (evidenceResult.data ?? []).map(rowToEvidence),
          outcomeRecords: (outcomesResult.data ?? []).map(rowToOutcome),
          interviewPrepPacks: (prepPacksResult.data ?? []).map(rowToPrepPack),
        },
      },
      error: null,
      status: 200,
    })
  } catch (error: unknown) {
    if (isConfigurationUnavailableError(error))
      return diagnosticJson({
        area: "sync",
        code: "sync.dashboard.unavailable",
        data: null,
        error: configurationUnavailableMessage,
        request,
        status: 503,
      })
    const message =
      error instanceof Error ? error.message : "Dashboard sync read failed"

    return diagnosticJson({
      area: "sync",
      code: "sync.dashboard.read.unexpected",
      data: null,
      error: message,
      log: true,
      request,
      status: 500,
    })
  }
}

export async function POST(
  request: NextRequest,
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
        status: auth.status,
      })
    }

    const rawBody = (await request.json()) as Record<string, unknown>
    const payload = dashboardWorkflowSchema.parse(
      normalizeLegacyDashboardPayload(rawBody),
    )
    const resurrectUrlKeys = Array.isArray(rawBody.resurrectUrlKeys)
      ? rawBody.resurrectUrlKeys.filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
      : []
    const sourceSurface = getSourceSurface(request)
    trackJobImportStarted({
      applicationCount: payload.applications.length,
      route: "/api/sync/dashboard",
      sourceSurface,
      status: "started",
    })

    if (isTestAuthUserId(auth.user.id)) {
      console.warn(
        "autotime_test_auth_bypass: POST /api/sync/dashboard short-circuited by AUTOTIME_TEST_AUTH_ENABLED - reporting synced without writing to the database. If this is unexpected, check the AUTOTIME_TEST_AUTH_ENABLED environment variable for this deployment.",
      )
      return jsonResponse({
        data: { deletedApplicationIds: [], synced: true },
        error: null,
        status: 200,
      })
    }

    const supabase = createAdminClient()

    if (resurrectUrlKeys.length) {
      const { error: resurrectError } = await supabase
        .from("deleted_application_tombstones")
        .delete()
        .eq("user_id", auth.user.id)
        .in("url_key", resurrectUrlKeys)

      if (resurrectError) {
        return diagnosticJson({
          area: "sync",
          code: "sync.dashboard.resurrect.failed",
          data: null,
          error: resurrectError.message,
          log: true,
          request,
          status: 500,
        })
      }
    }

    const applicationUrlKeys = payload.applications.map((application) =>
      normalizeApplicationUrlKey(application.url || application.id),
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
        status: 500,
      })
    }

    const deletedUrlKeys = new Set(
      (tombstoneResult.data ?? []).map((row) => row.url_key),
    )
    const deletedApplicationIds = payload.applications
      .filter((application) =>
        deletedUrlKeys.has(
          normalizeApplicationUrlKey(application.url || application.id),
        ),
      )
      .map((application) => application.id)
    const activeApplications = payload.applications.filter(
      (application) =>
        !deletedUrlKeys.has(
          normalizeApplicationUrlKey(application.url || application.id),
        ),
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
            normalizeApplicationUrlKey(application.url || application.id),
          ),
        )

      if (error) {
        return diagnosticJson({
          area: "sync",
          code: "sync.dashboard.application-identity.failed",
          data: null,
          error: error.message,
          log: true,
          request,
          status: 500,
        })
      }

      const existingByUrlKey = new Map(
        (data ?? []).map((row) => [row.url_key, row.id]),
      )

      for (const application of activeApplications) {
        const existingId = existingByUrlKey.get(
          normalizeApplicationUrlKey(application.url || application.id),
        )

        if (existingId) {
          applicationIdMap.set(application.id, existingId)
        }
      }
    }

    if (payload.reusableAnswers) {
      const reusableAnswersResult = await supabase
        .from("reusable_answers")
        .upsert(
          mapReusableAnswersToRow(
            auth.user.id,
            payload.reusableAnswers,
            sourceSurface,
          ),
          { onConflict: "user_id" },
        )

      if (reusableAnswersResult.error) {
        return diagnosticJson({
          area: "sync",
          code: "sync.dashboard.answers.failed",
          data: null,
          error: reusableAnswersResult.error.message,
          log: true,
          request,
          status: 500,
        })
      }
    }

    if (activeApplications.length) {
      const { error } = await supabase.from("applications").upsert(
        activeApplications.map((item) =>
          mapApplicationToRow(
            auth.user.id,
            item,
            sourceSurface,
            applicationIdMap.get(item.id),
          ),
        ),
        { onConflict: "user_id,url_key" },
      )

      if (error) {
        return diagnosticJson({
          area: "sync",
          code: "sync.dashboard.applications.failed",
          data: null,
          error: error.message,
          log: true,
          request,
          status: 500,
        })
      }
    }

    const activeApplicationIds = new Set(
      activeApplications.map((application) => application.id),
    )
    const activeEvidenceRecords = (payload.evidenceRecords ?? []).filter(
      (record) =>
        !record.applicationId || activeApplicationIds.has(record.applicationId),
    )
    const activeOutcomeRecords = (payload.outcomeRecords ?? []).filter(
      (record) => activeApplicationIds.has(record.applicationId),
    )
    const activeInterviewPrepPacks = payload.interviewPrepPacks.filter((pack) =>
      activeApplicationIds.has(pack.applicationId),
    )

    if (activeEvidenceRecords.length) {
      const { error } = await supabase.from("evidence_records").upsert(
        activeEvidenceRecords.map((item) =>
          mapEvidenceToRow(auth.user.id, item, applicationIdMap),
        ),
        { onConflict: "id" },
      )

      if (error) {
        return diagnosticJson({
          area: "sync",
          code: "sync.dashboard.evidence.failed",
          data: null,
          error: error.message,
          log: true,
          request,
          status: 500,
        })
      }
    }

    if (activeOutcomeRecords.length) {
      const { error } = await supabase.from("outcome_records").upsert(
        activeOutcomeRecords.map((item) =>
          mapOutcomeToRow(auth.user.id, item, applicationIdMap),
        ),
        { onConflict: "user_id,application_id" },
      )

      if (error) {
        return diagnosticJson({
          area: "sync",
          code: "sync.dashboard.outcomes.failed",
          data: null,
          error: error.message,
          log: true,
          request,
          status: 500,
        })
      }
    }

    if (activeInterviewPrepPacks.length) {
      const { error } = await supabase.from("interview_prep_packs").upsert(
        activeInterviewPrepPacks.map((item) =>
          mapPrepPackToRow(auth.user.id, item, sourceSurface, applicationIdMap),
        ),
        { onConflict: "user_id,application_id" },
      )

      if (error) {
        return diagnosticJson({
          area: "sync",
          code: "sync.dashboard.prep.failed",
          data: null,
          error: error.message,
          log: true,
          request,
          status: 500,
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
        interviewPrepPacks: activeInterviewPrepPacks,
      },
      sourceSurface,
      userId: auth.user.id,
      includeReusableAnswers: Boolean(payload.reusableAnswers),
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
          status: 500,
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
          status: 500,
        })
      }
    }

    return jsonResponse({
      data: { deletedApplicationIds, synced: true },
      error: null,
      status: 200,
    })
  } catch (error: unknown) {
    if (isConfigurationUnavailableError(error))
      return diagnosticJson({
        area: "sync",
        code: "sync.dashboard.unavailable",
        data: null,
        error: configurationUnavailableMessage,
        request,
        status: 503,
      })
    if (error instanceof z.ZodError) {
      return diagnosticJson({
        area: "sync",
        code: "sync.dashboard.request.invalid",
        data: null,
        error: "Invalid dashboard sync body",
        request,
        status: 400,
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
      status: 500,
    })
  }
}

export async function DELETE(
  request: NextRequest,
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
        status: auth.status,
      })
    }

    const body = dashboardDeleteSchema.parse(await request.json())

    if (isTestAuthUserId(auth.user.id)) {
      return jsonResponse({
        data: { deleted: true },
        error: null,
        status: 200,
      })
    }

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
        status: 500,
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
          reason: "user_deleted",
        },
        { onConflict: "user_id,url_key" },
      )

    if (tombstoneResult.error) {
      return diagnosticJson({
        area: "sync",
        code: "sync.dashboard.delete.tombstone.failed",
        data: null,
        error: tombstoneResult.error.message,
        log: true,
        request,
        status: 500,
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
          .in("application_id", targetIds),
      ])
      const childError = [
        prepResult.error,
        outcomeResult.error,
        evidenceResult.error,
      ].find(Boolean)

      if (childError) {
        return diagnosticJson({
          area: "sync",
          code: "sync.dashboard.delete.children.failed",
          data: null,
          error: childError.message,
          log: true,
          request,
          status: 500,
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
          status: 500,
        })
      }
    }

    await supabase.from("sync_events").insert({
      action: "deleted",
      entity_id: targetIds[0] ?? body.applicationId ?? urlKey,
      entity_type: "application",
      message: "Application deleted from dashboard.",
      source_surface: sourceSurface,
      user_id: auth.user.id,
    })

    return jsonResponse({
      data: { deleted: true },
      error: null,
      status: 200,
    })
  } catch (error: unknown) {
    if (isConfigurationUnavailableError(error))
      return diagnosticJson({
        area: "sync",
        code: "sync.dashboard.unavailable",
        data: null,
        error: configurationUnavailableMessage,
        request,
        status: 503,
      })
    if (error instanceof z.ZodError) {
      return diagnosticJson({
        area: "sync",
        code: "sync.dashboard.delete.request.invalid",
        data: null,
        error: "Invalid dashboard delete body",
        request,
        status: 400,
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
      status: 500,
    })
  }
}
