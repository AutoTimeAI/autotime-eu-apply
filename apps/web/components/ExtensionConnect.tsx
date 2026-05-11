"use client"

import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { createBrowserClient } from "../lib/supabase/client"

type AccountMeResponse = {
  data: {
    email: string
    plan: "free" | "pro"
  } | null
  error: string | null
  status: number
}

type ExtensionConnectMessage = {
  authToken: string
  email: string
  plan: "free" | "pro"
  type: "AUTOTIME_CONNECT_ACCOUNT"
}

type ExtensionPingMessage = {
  type: "AUTOTIME_PING"
}

type ExtensionResponse = {
  connected?: boolean
  error?: string
  ok?: boolean
  syncError?: string
  version?: string
}

type ExtensionRuntime = {
  lastError?: {
    message?: string
  }
  sendMessage: (
    extensionId: string,
    message: ExtensionConnectMessage | ExtensionPingMessage,
    callback: (response?: ExtensionResponse) => void
  ) => void
}

type ChromeWindow = Window & {
  chrome?: {
    runtime?: ExtensionRuntime
  }
}

function getChromeRuntime(): ExtensionRuntime | null {
  const chromeWindow = window as ChromeWindow
  return chromeWindow.chrome?.runtime ?? null
}

function formatRuntimeError(message: string) {
  if (/receiving end does not exist/i.test(message)) {
    return "AutoTime extension is not reachable. Reload the extension in Chrome, then open CONNECT from the job-page widget again."
  }

  if (/does not exist/i.test(message)) {
    return "Chrome could not find this extension ID. Open CONNECT from the installed AutoTime widget so the current extension ID is used."
  }

  if (/not allowed|access|permission/i.test(message)) {
    return "Chrome blocked dashboard-to-extension messaging. Reload the extension and confirm the dashboard URL is allowed."
  }

  return message
}

async function getAccount(accessToken: string): Promise<AccountMeResponse> {
  const response = await fetch("/api/account/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  return (await response.json()) as AccountMeResponse
}

async function recordExtensionConnection(
  accessToken: string,
  extensionId: string
): Promise<string | null> {
  const response = await fetch("/api/sync/extension", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ extensionId })
  })
  const body = (await response.json()) as {
    error: string | null
  }

  if (!response.ok || body.error) {
    return body.error ?? "Could not record extension connection."
  }

  return null
}

function sendToExtension(
  extensionId: string,
  message: ExtensionConnectMessage | ExtensionPingMessage
): Promise<ExtensionResponse> {
  return new Promise((resolve, reject) => {
    const runtime = getChromeRuntime()

    if (!runtime) {
      reject(new Error("Chrome extension messaging is unavailable."))
      return
    }

    runtime.sendMessage(extensionId, message, (response) => {
      const runtimeError = runtime.lastError?.message

      if (runtimeError) {
        reject(new Error(formatRuntimeError(runtimeError)))
        return
      }

      if (!response?.ok) {
        reject(new Error(response?.error ?? "Extension did not accept sign-in."))
        return
      }

      resolve(response)
    })
  })
}

async function pingExtension(extensionId: string) {
  return sendToExtension(extensionId, { type: "AUTOTIME_PING" })
}

export default function ExtensionConnect() {
  const searchParams = useSearchParams()
  const extensionId = searchParams.get("extensionId") ?? ""
  const signInRedirect = extensionId
    ? `/extension/connect?extensionId=${encodeURIComponent(extensionId)}`
    : "/extension/connect"
  const signInHref = `/login?redirectTo=${encodeURIComponent(signInRedirect)}`
  const [status, setStatus] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const connectAttemptedRef = useRef(false)

  const handleConnect = useCallback(async () => {
    try {
      setIsPending(true)
      setStatus(null)

      if (!extensionId.trim()) {
        setStatus("Open CONNECT from the AutoTime job-page widget or extension Account tab.")
        return
      }

      setStatus("Checking installed extension...")
      await pingExtension(extensionId)

      const supabase = createBrowserClient()
      const {
        data: { session },
        error
      } = await supabase.auth.getSession()

      if (error || !session?.access_token) {
        setStatus("Sign in first, then reconnect the extension.")
        return
      }

      setStatus("Connecting dashboard account to extension...")
      const account = await getAccount(session.access_token)

      if (!account.data) {
        setStatus(account.error ?? "Could not read your AutoTime account.")
        return
      }

      const extensionResponse = await sendToExtension(extensionId, {
        authToken: session.access_token,
        email: account.data.email,
        plan: account.data.plan,
        type: "AUTOTIME_CONNECT_ACCOUNT"
      })
      const recordWarning = await recordExtensionConnection(
        session.access_token,
        extensionId
      )

      setStatus(
        extensionResponse.syncError
          ? `Extension connected. Saved jobs will retry sync from Track Job. Reason: ${extensionResponse.syncError}`
          : recordWarning
            ? `Extension connected. Dashboard record warning: ${recordWarning}`
          : "Extension connected. You can return to the side panel."
      )
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Extension connection failed."
      setStatus(message)
    } finally {
      setIsPending(false)
    }
  }, [extensionId])

  useEffect(() => {
    if (connectAttemptedRef.current || !extensionId.trim()) {
      return
    }

    connectAttemptedRef.current = true
    void handleConnect()
  }, [extensionId, handleConnect])

  return (
    <section className="market-context-panel">
      <div className="section-heading">
        <p className="eyebrow">Chrome extension</p>
        <h1>Connect AutoTime to your account</h1>
        <p>
          This securely links your installed extension to your signed-in
          dashboard session so AI requests can use the web backend.
        </p>
      </div>
      <div className="header-actions">
        <button disabled={isPending} type="button" onClick={handleConnect}>
          {isPending ? "Connecting" : "Connect extension"}
        </button>
        <a className="secondary-link" href={signInHref}>
          Sign in first
        </a>
      </div>
      {status ? <p className="status-banner">{status}</p> : null}
    </section>
  )
}
