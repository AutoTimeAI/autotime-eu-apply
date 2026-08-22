import type { AccountSession } from "./storage"

// A deliberately token-free view of the account session. Content scripts
// (contents/autofill.ts, lib/match-overlay.ts) use this instead of reading
// the account session directly, so the raw authToken/refreshToken never
// enters a content script's JS heap - only the background service worker
// (a trusted extension context) ever holds them.
export type ConnectionState = {
  connected: boolean
  email: string
  plan: "free" | "pro"
  provider: string
}

export const DISCONNECTED_STATE: ConnectionState = {
  connected: false,
  email: "",
  plan: "free",
  provider: "email"
}

export function toConnectionState(
  session: AccountSession | null
): ConnectionState {
  if (!session?.authToken.trim()) {
    return DISCONNECTED_STATE
  }

  return {
    connected: true,
    email: session.email,
    plan: session.plan,
    provider: session.provider
  }
}

/** Content-script-safe: asks the background worker for the current
 * connection state instead of reading the account session's storage area
 * directly (which content scripts cannot access). */
export async function getConnectionState(): Promise<ConnectionState> {
  try {
    const response = (await chrome.runtime.sendMessage({
      type: "AUTOTIME_GET_CONNECTION_STATE"
    })) as { ok?: boolean; state?: ConnectionState } | undefined

    return response?.ok && response.state ? response.state : DISCONNECTED_STATE
  } catch {
    return DISCONNECTED_STATE
  }
}
