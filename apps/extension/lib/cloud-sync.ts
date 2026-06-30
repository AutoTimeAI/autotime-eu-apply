import { mergeDashboardApplications } from "./applications"
import { appUrl } from "./openai"
import type {
  AccountSession,
  ApplicationRecord,
  CandidateProfile
} from "./storage"

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
    body: JSON.stringify(profile)
  })

  await parseSyncResponse<ProfileSyncResponse>(response)
}

export async function loadProfileFromDashboard(session: AccountSession | null) {
  if (!session?.authToken.trim()) {
    throw new Error("Sign in before loading profile from dashboard.")
  }

  const response = await fetch(`${appUrl}/api/sync/profile`, {
    headers: {
      Authorization: `Bearer ${session.authToken}`,
      "x-autotime-source": "extension"
    }
  })
  const data = await parseSyncResponse<ProfileReadResponse>(response)

  return data.profile
}

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
    headers
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
    body: JSON.stringify(payload)
  })

  return parseSyncResponse<DashboardSyncResponse>(writeResponse)
}
