/**
 * Bridges the locally-stored CandidateProfile (from the shared package)
 * into an optional, explicitly-consented Supabase "profiles" sync. Every
 * step - readiness checks, payload construction, and the actual sync
 * action - is deliberately gated and observable (readiness flags,
 * blockers, issues) rather than silently syncing, since profile data is
 * sensitive and sync must only happen after an authenticated session,
 * explicit user action, and consent all line up.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import {
  getCandidateProfileBridgeIssues,
  type CandidateProfile
} from "shared"
import type { Database } from "./supabase/types"

export type CloudSyncEnv = {
  enabled: string | undefined
  supabaseUrl: string | undefined
  supabaseAnonKey: string | undefined
}

export type CloudSyncReadiness = {
  enabled: boolean
  configured: boolean
  modeLabel: "Local only" | "Flagged" | "Ready for auth wiring"
  accountLabel: "Sign-in locked" | "Auth wiring ready"
  syncActionLabel: "Keep local evidence" | "Sync profile"
  sessionLabel: "Session check blocked" | "Session check ready"
  firstSliceLabel: "Profile first"
  safetyLabel: "No secrets"
  issues: string[]
}

export type CloudSyncClientResult =
  | {
      ready: true
      client: SupabaseClient
      readiness: CloudSyncReadiness
    }
  | {
      ready: false
      client: null
      readiness: CloudSyncReadiness
    }

export type CloudSyncSessionState = {
  checked: boolean
  authenticated: boolean
  userEmail: string | null
  provider: string | null
  message: string
}

export type ProfileSyncPayload = {
  user_id: string
  full_name: string
  email: string | null
  phone: string | null
  linkedin_url: string | null
  github_url: string | null
  portfolio_url: string | null
  current_country: string
  current_city: string | null
  target_countries: string
  target_roles: string
  work_right_details: string
  sponsorship_needed: boolean
  relocation_willingness: "yes" | "no" | "depends"
  salary_expectation: string | null
  notice_period: string | null
  base_cv_text: string
  project_summaries: string | null
  experience_highlights: string | null
  source_surface: "web" | "extension"
  schema_version: 1
}

export type ProfileSyncPayloadResult =
  | {
      ready: true
      payload: ProfileSyncPayload
      issues: []
    }
  | {
      ready: false
      payload: null
      issues: string[]
    }

export type ProfileSyncActionState =
  | {
      ready: true
      payload: ProfileSyncPayload
      message: string
    }
  | {
      ready: false
      payload: null
      message: string
      blockers: string[]
    }

export type ProfileSyncResult = {
  success: boolean
  error: string | null
}

export type ProfileReadResult =
  | {
      success: true
      error: null
      profile: CandidateProfile | null
    }
  | {
      success: false
      error: string
      profile: null
    }

type SessionClient = Pick<SupabaseClient, "auth">

function hasValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0
}

function trimToNullable(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Determines whether cloud sync is enabled and fully configured (feature
 * flag on, Supabase URL and anon key both present), and derives the set of
 * human-readable UI labels and blocking `issues` from that state. Purely a
 * function of the given `env`, so it's testable without touching real
 * process.env or a network call.
 */
export function getCloudSyncReadiness(
  env: CloudSyncEnv
): CloudSyncReadiness {
  const enabled = env.enabled === "true"
  const issues = [
    !enabled && "cloud sync feature flag is off",
    !hasValue(env.supabaseUrl) && "Supabase URL is missing",
    !hasValue(env.supabaseAnonKey) && "Supabase anon key is missing"
  ].filter(Boolean) as string[]
  const configured = issues.length === 0

  return {
    enabled,
    configured,
    modeLabel: configured
      ? "Ready for auth wiring"
      : enabled
        ? "Flagged"
        : "Local only",
    accountLabel: configured ? "Auth wiring ready" : "Sign-in locked",
    syncActionLabel: configured ? "Sync profile" : "Keep local evidence",
    sessionLabel: configured ? "Session check ready" : "Session check blocked",
    firstSliceLabel: "Profile first",
    safetyLabel: "No secrets",
    issues
  }
}

/**
 * Builds a Supabase client for cloud sync only if getCloudSyncReadiness
 * reports `configured`; otherwise returns `{ ready: false, client: null }`
 * alongside the same readiness details, so callers can render a
 * not-ready state without ever holding a half-configured client.
 */
export function createCloudSyncClient(env: CloudSyncEnv): CloudSyncClientResult {
  const readiness = getCloudSyncReadiness(env)

  if (!readiness.configured) {
    return {
      ready: false,
      client: null,
      readiness
    }
  }

  return {
    ready: true,
    client: createClient(env.supabaseUrl ?? "", env.supabaseAnonKey ?? "", {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }),
    readiness
  }
}

/**
 * Reads the current Supabase auth session from an already-built client
 * result. Returns a "blocked" state (not an error) if the client itself
 * isn't ready, an error-message state if `auth.getSession()` fails, or an
 * authenticated/unauthenticated state describing the session - note that
 * detecting a session here is explicitly not the same as consenting to
 * sync; the returned `message` says so.
 */
export async function getCloudSyncSessionState(
  clientResult: CloudSyncClientResult | { ready: true; client: SessionClient }
): Promise<CloudSyncSessionState> {
  if (!clientResult.ready) {
    return {
      checked: false,
      authenticated: false,
      userEmail: null,
      provider: null,
      message: "Session check blocked until cloud-sync readiness is complete."
    }
  }

  const { data, error } = await clientResult.client.auth.getSession()

  if (error) {
    return {
      checked: true,
      authenticated: false,
      userEmail: null,
      provider: null,
      message: error.message
    }
  }

  return {
    checked: true,
    authenticated: Boolean(data.session?.user),
    userEmail: data.session?.user?.email ?? null,
    provider: data.session?.user?.app_metadata?.provider ?? null,
    message: data.session?.user
      ? "Authenticated session detected. Profile sync still requires explicit user action."
      : "No authenticated session detected."
  }
}

/**
 * Validates a CandidateProfile (via the shared bridge-issue checker) and
 * `userId`, and if both are valid, maps the profile's camelCase fields
 * into the snake_case Supabase `profiles` row shape (trimming strings,
 * converting blanks to null for optional fields). Returns `{ ready: false,
 * issues }` rather than throwing when validation fails, so callers can
 * surface the specific missing/invalid fields to the user.
 */
export function createProfileSyncPayload({
  profile,
  userId,
  sourceSurface = "web"
}: {
  profile: CandidateProfile
  userId: string
  sourceSurface?: "web" | "extension"
}): ProfileSyncPayloadResult {
  const issues = [
    ...getCandidateProfileBridgeIssues(profile),
    !hasValue(userId) && "authenticated user id"
  ].filter(Boolean) as string[]

  if (issues.length > 0) {
    return {
      ready: false,
      payload: null,
      issues
    }
  }

  return {
    ready: true,
    payload: {
      user_id: userId.trim(),
      full_name: profile.fullName.trim(),
      email: trimToNullable(profile.email),
      phone: trimToNullable(profile.phone),
      linkedin_url: trimToNullable(profile.linkedInUrl),
      github_url: trimToNullable(profile.githubUrl),
      portfolio_url: trimToNullable(profile.portfolioUrl),
      current_country: profile.currentCountry.trim(),
      current_city: trimToNullable(profile.currentCity),
      target_countries: profile.targetCountries.trim(),
      target_roles: profile.targetRoles.trim(),
      work_right_details: profile.workRightDetails.trim(),
      sponsorship_needed: profile.sponsorshipNeeded,
      relocation_willingness: profile.relocationWillingness,
      salary_expectation: trimToNullable(profile.salaryExpectation),
      notice_period: trimToNullable(profile.noticePeriod),
      base_cv_text: profile.baseCvText.trim(),
      project_summaries: trimToNullable(profile.projectSummaries),
      experience_highlights: trimToNullable(profile.experienceHighlights),
      source_surface: sourceSurface,
      schema_version: 1
    },
    issues: []
  }
}

/**
 * The full pre-sync gate: combines readiness, session, explicit user
 * action, and consent into a list of `blockers`, and additionally requires
 * a valid payload (built via createProfileSyncPayload, using
 * `session.userEmail` as the user id). Returns `ready: true` with the
 * payload only when every one of those conditions holds; otherwise returns
 * `ready: false` with a combined message listing all blockers plus any
 * payload validation issues.
 */
export function prepareProfileSyncAction({
  readiness,
  session,
  profile,
  explicitUserAction,
  consentGranted
}: {
  readiness: CloudSyncReadiness
  session: CloudSyncSessionState
  profile: CandidateProfile
  explicitUserAction: boolean
  consentGranted: boolean
}): ProfileSyncActionState {
  const blockers = [
    !readiness.configured && "cloud-sync readiness is incomplete",
    !session.authenticated && "authenticated session is missing",
    !explicitUserAction && "explicit user sync action is required",
    !consentGranted && "cloud sync consent is required"
  ].filter(Boolean) as string[]
  const payloadResult = createProfileSyncPayload({
    profile,
    userId: session.userEmail ?? ""
  })

  if (!payloadResult.ready || blockers.length > 0) {
    const allBlockers = payloadResult.ready
      ? blockers
      : [...blockers, ...payloadResult.issues]

    return {
      ready: false,
      payload: null,
      message: `Profile sync blocked: ${allBlockers.join(", ")}.`,
      blockers: allBlockers
    }
  }

  return {
    ready: true,
    payload: payloadResult.payload,
    message:
      "Profile sync payload is ready for authenticated upload."
  }
}

/**
 * Performs the actual authenticated write: builds the sync payload,
 * upserts it into `profiles` (keyed on user_id), records a `sync_events`
 * row describing whether this was a create or update, and - only for an
 * extension-sourced sync - stamps `last_synced_at` on the caller's active
 * (non-revoked) extension connection(s). Any failure at any step returns
 * `{ success: false, error }` rather than throwing; callers should not
 * assume partial steps were rolled back.
 */
export async function syncProfile(
  client: SupabaseClient<Database>,
  userId: string,
  profile: CandidateProfile,
  sourceSurface: "web" | "extension" = "web"
): Promise<ProfileSyncResult> {
  try {
    const payloadResult = createProfileSyncPayload({
      profile,
      userId,
      sourceSurface
    })

    if (!payloadResult.ready) {
      return {
        success: false,
        error: `Profile sync blocked: ${payloadResult.issues.join(", ")}.`
      }
    }

    const { data: existingProfile, error: existingProfileError } = await client
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()

    if (existingProfileError) {
      return {
        success: false,
        error: existingProfileError.message
      }
    }

    const { data: syncedProfile, error: profileError } = await client
      .from("profiles")
      .upsert(payloadResult.payload, { onConflict: "user_id" })
      .select("id")
      .single()

    if (profileError) {
      return {
        success: false,
        error: profileError.message
      }
    }

    const { error: syncEventError } = await client.from("sync_events").insert({
      user_id: userId,
      entity_type: "profile",
      entity_id: syncedProfile.id,
      source_surface: sourceSurface,
      action: existingProfile ? "updated" : "created",
      message:
        sourceSurface === "extension"
          ? "Profile synced from Chrome extension"
          : "Profile synced from web dashboard",
      schema_version: 1
    })

    if (syncEventError) {
      return {
        success: false,
        error: syncEventError.message
      }
    }

    if (sourceSurface === "extension") {
      const { error: extensionSyncError } = await client
        .from("extension_connections")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("revoked_at", null)

      if (extensionSyncError) {
        return {
          success: false,
          error: extensionSyncError.message
        }
      }
    }

    return {
      success: true,
      error: null
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Profile sync failed"
    }
  }
}

function rowToCandidateProfile(
  row: Database["public"]["Tables"]["profiles"]["Row"]
): CandidateProfile {
  return {
    fullName: row.full_name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    linkedInUrl: row.linkedin_url ?? "",
    githubUrl: row.github_url ?? "",
    portfolioUrl: row.portfolio_url ?? "",
    currentCountry: row.current_country,
    currentCity: row.current_city ?? "",
    targetCountries: row.target_countries,
    targetRoles: row.target_roles,
    workRightDetails: row.work_right_details,
    sponsorshipNeeded: row.sponsorship_needed,
    relocationWillingness: row.relocation_willingness,
    salaryExpectation: row.salary_expectation ?? "",
    noticePeriod: row.notice_period ?? "",
    baseCvText: row.base_cv_text,
    projectSummaries: row.project_summaries ?? "",
    experienceHighlights: row.experience_highlights ?? ""
  }
}

/**
 * Reads the synced `profiles` row for `userId` and maps it back into a
 * CandidateProfile (nullable string columns become empty strings, except
 * the row itself, which is null if no profile has been synced yet).
 */
export async function readSyncedProfile(
  client: SupabaseClient<Database>,
  userId: string
): Promise<ProfileReadResult> {
  try {
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      return {
        success: false,
        error: error.message,
        profile: null
      }
    }

    return {
      success: true,
      error: null,
      profile: data ? rowToCandidateProfile(data) : null
    }
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Synced profile read failed",
      profile: null
    }
  }
}

/**
 * Browser-environment convenience wrapper around getCloudSyncReadiness that
 * reads the relevant NEXT_PUBLIC_* env vars itself. When
 * NEXT_PUBLIC_AUTOTIME_E2E_LOCAL_ONLY is "true" it forces sync off
 * (for E2E test isolation); otherwise it defaults the enabled flag to
 * "true" in production (either via NEXT_PUBLIC_AUTOTIME_ENV or
 * NODE_ENV) when NEXT_PUBLIC_AUTOTIME_CLOUD_SYNC_ENABLED itself is unset.
 */
export function getBrowserCloudSyncReadiness() {
  const e2eLocalOnly =
    process.env.NEXT_PUBLIC_AUTOTIME_E2E_LOCAL_ONLY === "true"
  const productionDefault =
    process.env.NEXT_PUBLIC_AUTOTIME_ENV === "production" ||
    process.env.NODE_ENV === "production"
      ? "true"
      : undefined

  return getCloudSyncReadiness({
    enabled: e2eLocalOnly
      ? "false"
      : process.env.NEXT_PUBLIC_AUTOTIME_CLOUD_SYNC_ENABLED ??
        productionDefault,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })
}

/**
 * Browser-environment convenience wrapper around createCloudSyncClient,
 * using the same env-var resolution (including the E2E-local-only
 * override and the production default) as getBrowserCloudSyncReadiness.
 */
export function createBrowserCloudSyncClient() {
  const e2eLocalOnly =
    process.env.NEXT_PUBLIC_AUTOTIME_E2E_LOCAL_ONLY === "true"
  const productionDefault =
    process.env.NEXT_PUBLIC_AUTOTIME_ENV === "production" ||
    process.env.NODE_ENV === "production"
      ? "true"
      : undefined

  return createCloudSyncClient({
    enabled: e2eLocalOnly
      ? "false"
      : process.env.NEXT_PUBLIC_AUTOTIME_CLOUD_SYNC_ENABLED ??
        productionDefault,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })
}
