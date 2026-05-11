import { mergeDashboardApplications } from "./applications"
import { appUrl } from "./openai"
import type {
  AccountSession,
  ApplicationRecord,
  CandidateProfile,
  ReusableAnswers
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
  reusableAnswers: ReusableAnswers
}

type DashboardReadResponse = {
  dashboard: DashboardWorkflow | null
}

type DashboardSyncResponse = {
  deletedApplicationIds?: string[]
  synced: true
}

const emptyReusableAnswers: ReusableAnswers = {
  sponsorshipAnswer: "",
  relocationAnswer: "",
  workAuthorisationAnswer: "",
  noticePeriodAnswer: "",
  salaryExpectationAnswer: "",
  motivationAnswer: "",
  strengthsAnswer: "",
  availabilityAnswer: ""
}

async function parseSyncResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiEnvelope<T>

  if (!response.ok || body.error) {
    throw new Error(body.error ?? `Sync request failed with ${response.status}`)
  }

  if (!body.data) {
    throw new Error("Sync response did not include data.")
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
  reusableAnswers,
  session
}: {
  applications: ApplicationRecord[]
  reusableAnswers: ReusableAnswers | null
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

  const payload: DashboardWorkflow = {
    applications: mergeDashboardApplications(
      applications,
      dashboard?.applications ?? []
    ),
    evidenceRecords: dashboard?.evidenceRecords ?? [],
    interviewPrepPacks: dashboard?.interviewPrepPacks ?? [],
    outcomeRecords: dashboard?.outcomeRecords ?? [],
    reusableAnswers:
      dashboard?.reusableAnswers ?? reusableAnswers ?? emptyReusableAnswers
  }

  const writeResponse = await fetch(`${appUrl}/api/sync/dashboard`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  })

  return parseSyncResponse<DashboardSyncResponse>(writeResponse)
}
