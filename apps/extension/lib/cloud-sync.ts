// HTTP client for the AutoTime web dashboard's `/api/sync/*` endpoints.
// Every call here requires a bearer AccountSession authToken, so callers
// must already hold a session (see lib/session.ts's getActiveSession /
// withFreshSession). All requests are bounded by a fixed timeout so a stuck
// fetch can't leave a caller (e.g. Track Job) hanging forever.
import { mergeDashboardApplications } from "./applications"
import { appUrl } from "./openai"
import type {
  AccountSession,
  ApplicationRecord,
  CandidateProfile
} from "./storage"

// No fetch in this file should be able to hang forever. A stuck request
// keeps Track Job waiting with no way to recover short of reloading.
const REQUEST_TIMEOUT_MS = 12000

function withTimeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS)
}

type ApiEnvelope<T> = {
  data: T | null
  error: string | null
  status: number
}

type ProfileSyncResponse = {
  synced: true
}

type ProfileReadResponse = {
  profile: CandidateProfile | null
}

type DashboardWorkflow = {
  applications: ApplicationRecord[]
  evidenceRecords: unknown[]
  interviewPrepPacks: unknown[]
  outcomeRecords: unknown[]
}

type DashboardReadResponse = {
  dashboard: DashboardWorkflow | null
}

type DashboardSyncResponse = {
  deletedApplicationIds?: string[]
  synced: true
}

/** Thrown when a dashboard sync/scoring request fails; carries the HTTP `status` so callers (e.g. lib/session.ts) can detect a 401 and retry after a token refresh. */
export class SyncRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "SyncRequestError"
    this.status = status
  }
}

async function parseSyncResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiEnvelope<T>

  if (!response.ok || body.error) {
    throw new SyncRequestError(
      body.error ?? `Sync request failed with ${response.status}`,
      response.status
    )
  }

  if (!body.data) {
    throw new SyncRequestError("Sync response did not include data.", response.status)
  }

  return body.data
}

/** POSTs the candidate profile to `/api/sync/profile`. Throws if not signed in or if the request fails. */
export async function syncProfileToDashboard({
  profile,
  session
}: {
  profile: CandidateProfile
  session: AccountSession | null
}) {
  if (!session?.authToken.trim()) {
    throw new Error("Sign in before syncing profile to dashboard.")
  }

  const response = await fetch(`${appUrl}/api/sync/profile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.authToken}`,
      "Content-Type": "application/json",
      "x-autotime-source": "extension"
    },
    body: JSON.stringify(profile),
    signal: withTimeoutSignal()
  })

  await parseSyncResponse<ProfileSyncResponse>(response)
}

/** GETs the profile currently stored on the dashboard for the signed-in account, or `null` if none is set. Throws if not signed in or if the request fails. */
export async function loadProfileFromDashboard(session: AccountSession | null) {
  if (!session?.authToken.trim()) {
    throw new Error("Sign in before loading profile from dashboard.")
  }

  const response = await fetch(`${appUrl}/api/sync/profile`, {
    headers: {
      Authorization: `Bearer ${session.authToken}`,
      "x-autotime-source": "extension"
    },
    signal: withTimeoutSignal()
  })
  const data = await parseSyncResponse<ProfileReadResponse>(response)

  return data.profile
}

/**
 * Syncs local applications to the dashboard: reads the dashboard's current
 * workflow state, merges it with `applications` via
 * `mergeDashboardApplications` (dashboard wins on conflicts), then POSTs
 * the merged applications list back. `resurrectUrlKeys` lets a caller
 * un-delete a dashboard application that matches one of these normalized
 * URL keys (used when the user re-tracks a job they'd previously removed
 * from the dashboard). See the inline comment below for why evidence
 * records, outcome records, and interview prep packs are always sent as
 * empty arrays rather than echoed back.
 */
export async function syncApplicationsToDashboard({
  applications,
  resurrectUrlKeys,
  session
}: {
  applications: ApplicationRecord[]
  resurrectUrlKeys?: string[]
  session: AccountSession | null
}) {
  if (!session?.authToken.trim()) {
    throw new Error("Dashboard not connected.")
  }

  const headers = {
    Authorization: `Bearer ${session.authToken}`,
    "Content-Type": "application/json",
    "x-autotime-source": "extension"
  }

  const readResponse = await fetch(`${appUrl}/api/sync/dashboard`, {
    headers,
    signal: withTimeoutSignal()
  })
  const readData = await parseSyncResponse<DashboardReadResponse>(readResponse)
  const dashboard = readData.dashboard

  // Intentionally sent empty: Track Job only ever adds or updates
  // applications. Evidence records, outcome records, and interview prep
  // packs are dashboard-only concepts the extension never creates or
  // edits, so echoing back whatever was just read here would be a pure
  // echo - and if a genuine edit to one of those rows (from the web
  // dashboard) lands between this read and this write, the echo would
  // silently overwrite it with stale data. Sending empty arrays means
  // the server's per-row upsert for these tables never fires, so the
  // dashboard's own data is left untouched either way.
  const payload: DashboardWorkflow & { resurrectUrlKeys?: string[] } = {
    applications: mergeDashboardApplications(
      applications,
      dashboard?.applications ?? []
    ),
    evidenceRecords: [],
    interviewPrepPacks: [],
    outcomeRecords: [],
    ...(resurrectUrlKeys?.length ? { resurrectUrlKeys } : {})
  }

  const writeResponse = await fetch(`${appUrl}/api/sync/dashboard`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: withTimeoutSignal()
  })

  return parseSyncResponse<DashboardSyncResponse>(writeResponse)
}

export type JobMatchPayload = {
  url?: string
  title?: string
  description?: string
}

export type JobMatchScore = {
  matched: boolean
  title?: string
  matchedCount?: number
  totalEssentialSkills?: number
  matchedSkills?: string[]
  missingSkills?: string[]
}

// Only ever called from the background worker (see AUTOTIME_SCORE_JOB in
// entrypoints/background/index.ts) - the content script that wants an ESCO
// match score sends a message instead of fetching directly, so the raw
// authToken never has to leave this trusted context.
export async function scoreJobFromDashboard(
  session: AccountSession,
  payload: JobMatchPayload
) {
  const response = await fetch(`${appUrl}/api/esco/score-job`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.authToken}`,
      "Content-Type": "application/json",
      "x-autotime-source": "extension"
    },
    body: JSON.stringify(payload),
    signal: withTimeoutSignal()
  })

  return parseSyncResponse<JobMatchScore>(response)
}
