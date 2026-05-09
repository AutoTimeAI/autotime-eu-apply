import { appUrl } from "./openai"
import type { AccountSession, CandidateProfile } from "./storage"

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
