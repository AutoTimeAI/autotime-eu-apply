import { appUrl } from "./openai"
import {
  clearAccountSession,
  getAccountSession,
  saveAccountSession,
  type AccountSession
} from "./storage"

// Supabase access tokens are short-lived (commonly ~1 hour). Refresh a
// little before the real expiry so an in-flight Track Job click never races
// the clock.
const REFRESH_BUFFER_MS = 5 * 60 * 1000

type RefreshResponse = {
  data: {
    authToken: string
    refreshToken: string
    expiresAt: number
  } | null
  error: string | null
}

export type ActiveSessionResult = {
  session: AccountSession | null
  refreshed: boolean
  /** Set when the session could not be kept fresh; sync should treat this as a soft warning unless `session` is also null. */
  warning?: string
}

function isExpiringSoon(session: AccountSession): boolean {
  if (!session.expiresAt) {
    // Legacy sessions saved before refresh tokens were tracked. Leave them
    // alone; they will surface a normal 401 on first failed sync, which the
    // caller already handles.
    return false
  }

  return Date.now() >= session.expiresAt - REFRESH_BUFFER_MS
}

async function refreshSession(
  session: AccountSession
): Promise<ActiveSessionResult> {
  if (!session.refreshToken.trim()) {
    return {
      session,
      refreshed: false,
      warning:
        "This connection predates automatic session refresh. Reconnect from the AutoTime dashboard if sync starts failing."
    }
  }

  try {
    const response = await fetch(`${appUrl}/api/sync/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken })
    })
    const body = (await response.json()) as RefreshResponse

    if (!response.ok || body.error || !body.data) {
      // The refresh token itself is invalid or revoked. There is no way to
      // recover without the user signing in again from the dashboard.
      await clearAccountSession()
      return {
        session: null,
        refreshed: false,
        warning:
          body.error ??
          "Your AutoTime sign-in expired. Reconnect from the dashboard to resume cloud sync."
      }
    }

    const refreshedSession: AccountSession = {
      ...session,
      authToken: body.data.authToken,
      refreshToken: body.data.refreshToken,
      expiresAt: body.data.expiresAt
    }

    await saveAccountSession(refreshedSession)
    return { session: refreshedSession, refreshed: true }
  } catch (error: unknown) {
    // Network hiccup refreshing the token. Keep the existing (possibly
    // still-valid) token rather than signing the user out over a flaky
    // connection.
    return {
      session,
      refreshed: false,
      warning:
        error instanceof Error
          ? `Could not refresh session: ${error.message}`
          : "Could not refresh session."
    }
  }
}

/**
 * Returns the current account session, transparently refreshing the access
 * token first if it is missing, expired, or close to expiring. Every sync
 * call site should use this instead of reading the stored session directly,
 * so a Track Job click an hour into a browsing session still reaches the
 * cloud instead of silently falling back to local-only capture.
 */
export async function getActiveSession(): Promise<ActiveSessionResult> {
  const session = await getAccountSession()

  if (!session?.authToken.trim()) {
    return { session: null, refreshed: false }
  }

  if (!isExpiringSoon(session)) {
    return { session, refreshed: false }
  }

  return refreshSession(session)
}

/**
 * Runs a sync call with the current (proactively-refreshed) session. If the
 * call still comes back unauthorised - clock skew, a token revoked
 * mid-session, etc - this forces one token refresh and retries exactly
 * once, rather than immediately falling back to local-only capture.
 */
export async function withFreshSession<T>(
  run: (session: AccountSession) => Promise<T>
): Promise<{ result: T | null; session: AccountSession | null; error?: string }> {
  const initial = await getActiveSession()

  if (!initial.session) {
    return { result: null, session: null, error: initial.warning }
  }

  try {
    const result = await run(initial.session)
    return { result, session: initial.session }
  } catch (error: unknown) {
    const isAuthError =
      error instanceof Error &&
      "status" in error &&
      (error as { status?: number }).status === 401

    if (!isAuthError) {
      throw error
    }

    const retried = await refreshSession(initial.session)

    if (!retried.session) {
      return { result: null, session: null, error: retried.warning }
    }

    const result = await run(retried.session)
    return { result, session: retried.session }
  }
}
