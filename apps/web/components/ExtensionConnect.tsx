"use client"

import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { reportClientIssue } from "../lib/client-diagnostics"
import { getStatusTone } from "../lib/status-tone"
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

type ConnectStep = {
  id: string
  message: string
  status: "info" | "success" | "warning" | "error"
  timestamp: string
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
    return "AutoTime extension is not reachable. Reload the extension in Chrome, then click Connect from AutoTime again."
  }

  if (/does not exist/i.test(message)) {
    return "Chrome could not find this extension ID. Click Connect from the installed AutoTime extension so the current extension is used."
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
  const hasExtensionId = Boolean(extensionId.trim())
  const signInRedirect = hasExtensionId
    ? `/extension/connect?extensionId=${encodeURIComponent(extensionId)}`
    : "/dashboard/extension"
  const signInHref = `/login?redirectTo=${encodeURIComponent(signInRedirect)}`
  const [status, setStatus] = useState<string | null>(null)
  const [steps, setSteps] = useState<ConnectStep[]>([])
  const [isPending, setIsPending] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)

  const connectAttemptedRef = useRef(false)

  const addStep = useCallback(
    (message: string, status: ConnectStep["status"] = "info") => {
      setSteps((current) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          message,
          status,
          timestamp: new Date().toISOString()
        },
        ...current
      ].slice(0, 12))
    },
    []
  )

  const handleConnect = useCallback(async () => {
    try {
      setIsPending(true)
      setStatus(null)
      setNeedsSignIn(false)

      if (!hasExtensionId) {
        const message =
          "Open AutoTime from your browser toolbar and click Connect."
        addStep(message, "warning")
        setStatus(message)
        return
      }

      const supabase = createBrowserClient()
      const {
        data: { session },
        error
      } = await supabase.auth.getSession()

      if (error || !session?.access_token) {
        const message = "Please sign in, then connect the extension again."
        addStep(message, "warning")
        setStatus(message)
        setNeedsSignIn(true)
        reportClientIssue({
          area: "extension",
          code: "extension.connect.session.missing",
          message
        })
        return
      }

      setStatus("Checking installed extension...")
      addStep("Checking installed extension reachability.")
      await pingExtension(extensionId)
      addStep("Extension preflight reached the installed extension.", "success")

      setStatus("Connecting dashboard account to extension...")
      addStep("Dashboard session detected. Reading account plan.")
      const account = await getAccount(session.access_token)

      if (!account.data) {
        const message = account.error ?? "Could not read your AutoTime account."
        addStep(message, "error")
        setStatus(message)
        reportClientIssue({
          area: "extension",
          code: "extension.connect.account.read.failed",
          message
        })
        return
      }

      addStep("Sending account session to extension.")
      const extensionResponse = await sendToExtension(extensionId, {
        authToken: session.access_token,
        email: account.data.email,
        plan: account.data.plan,
        type: "AUTOTIME_CONNECT_ACCOUNT"
      })
      addStep("Extension accepted and stored the account session.", "success")

      addStep("Recording dashboard connection.")
      const recordError = await recordExtensionConnection(
        session.access_token,
        extensionId
      )
      if (recordError) {
        const message = `Dashboard connection could not be recorded: ${recordError}`
        addStep(message, "error")
        setStatus(message)
        reportClientIssue({
          area: "extension",
          code: "extension.connect.record.failed",
          message
        })
        return
      }

      addStep("Dashboard connection recorded.", "success")
      const accountLabel = account.data.email.trim()
      const successMessage =
        extensionResponse.syncError
          ? `Extension connected for ${accountLabel}. Tracked jobs will retry sync from Track Job. ${extensionResponse.syncError}`
          : `Extension connected for ${accountLabel}. You can return to the side panel.`
      setStatus(successMessage)
      addStep(successMessage, extensionResponse.syncError ? "warning" : "success")
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Extension connection failed."
      addStep(message, "error")
      setStatus(message)
      reportClientIssue({
        area: "extension",
        code: "extension.connect.unhandled",
        message
      })
    } finally {
      setIsPending(false)
    }
  }, [addStep, extensionId, hasExtensionId])

  useEffect(() => {
    if (connectAttemptedRef.current || !hasExtensionId) {
      return
    }

    connectAttemptedRef.current = true
    void handleConnect()
  }, [hasExtensionId, handleConnect])

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
        {needsSignIn ? (
          <a className="secondary-link" href={signInHref}>
            Sign in first
          </a>
        ) : null}
      </div>
      {status ? (
        <p className={`status-banner ${getStatusTone(status)}`}>{status}</p>
      ) : null}
      {steps.length ? (
        <ol className="summary-list" aria-label="Connection diagnostic log">
          {steps.map((step) => (
            <li key={step.id}>
              <strong>{step.status}</strong> {step.message}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  )
}
