"use client"

import { useSearchParams } from "next/navigation"
import { useState } from "react"
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

type ExtensionResponse = {
  error?: string
  ok?: boolean
}

type ExtensionRuntime = {
  lastError?: {
    message?: string
  }
  sendMessage: (
    extensionId: string,
    message: ExtensionConnectMessage,
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
): Promise<void> {
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
    throw new Error(body.error ?? "Could not record extension connection.")
  }
}

function sendToExtension(
  extensionId: string,
  message: ExtensionConnectMessage
): Promise<void> {
  return new Promise((resolve, reject) => {
    const runtime = getChromeRuntime()

    if (!runtime) {
      reject(new Error("Chrome extension messaging is unavailable."))
      return
    }

    runtime.sendMessage(extensionId, message, (response) => {
      const runtimeError = runtime.lastError?.message

      if (runtimeError) {
        reject(new Error(runtimeError))
        return
      }

      if (!response?.ok) {
        reject(new Error(response?.error ?? "Extension did not accept sign-in."))
        return
      }

      resolve()
    })
  })
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

  async function handleConnect() {
    try {
      setIsPending(true)
      setStatus(null)

      if (!extensionId.trim()) {
        setStatus("Open this page from the AutoTime extension Account tab.")
        return
      }

      const supabase = createBrowserClient()
      const {
        data: { session },
        error
      } = await supabase.auth.getSession()

      if (error || !session?.access_token) {
        setStatus("Sign in first, then reconnect the extension.")
        return
      }

      const account = await getAccount(session.access_token)

      if (!account.data) {
        setStatus(account.error ?? "Could not read your AutoTime account.")
        return
      }

      await recordExtensionConnection(session.access_token, extensionId)

      await sendToExtension(extensionId, {
        authToken: session.access_token,
        email: account.data.email,
        plan: account.data.plan,
        type: "AUTOTIME_CONNECT_ACCOUNT"
      })

      setStatus("Extension connected. You can return to the side panel.")
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Extension connection failed."
      setStatus(message)
    } finally {
      setIsPending(false)
    }
  }

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
