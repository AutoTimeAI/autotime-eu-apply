"use client"

// A lighter-weight companion to ExtensionConnect: a single button (shown
// e.g. in Settings/Extension pages) that pings a previously-seen extension
// ID via chrome.runtime messaging to confirm it's still reachable, then
// navigates to /extension/connect to run the full account-linking flow.
// Kept separate from ExtensionConnect because it only needs to decide
// whether to show "Reconnect" vs "Open extension to connect" — it does not
// perform the account-linking handshake itself.

import { useState } from "react"
import { getStatusTone } from "../lib/status-tone"

type ExtensionPingMessage = {
  type: "AUTOTIME_PING"
}

type ExtensionResponse = {
  ok?: boolean
}

type ExtensionRuntime = {
  lastError?: {
    message?: string
  }
  sendMessage: (
    extensionId: string,
    message: ExtensionPingMessage,
    callback: (response?: ExtensionResponse) => void
  ) => void
}

type ChromeWindow = Window & {
  chrome?: {
    runtime?: ExtensionRuntime
  }
}

type InstalledExtensionConnectButtonProps = {
  candidateExtensionId?: string | null
}

function getChromeRuntime(): ExtensionRuntime | null {
  const chromeWindow = window as ChromeWindow
  return chromeWindow.chrome?.runtime ?? null
}

function formatRuntimeError(message: string) {
  if (/receiving end does not exist|does not exist/i.test(message)) {
    return "We could not reach the AutoTime extension. Open AutoTime from your browser toolbar and click Connect."
  }

  if (/not allowed|access|permission/i.test(message)) {
    return "AutoTime could not complete the browser check. Reload the extension, then click Connect."
  }

  return message
}

function pingKnownExtension(extensionId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const runtime = getChromeRuntime()

    if (!runtime) {
      reject(new Error("Open this dashboard in Chrome to check the installed extension."))
      return
    }

    runtime.sendMessage(extensionId, { type: "AUTOTIME_PING" }, (response) => {
      const runtimeError = runtime.lastError?.message

      if (runtimeError) {
        reject(new Error(formatRuntimeError(runtimeError)))
        return
      }

      if (!response?.ok) {
        reject(new Error("AutoTime extension did not respond to the install check."))
        return
      }

      resolve()
    })
  })
}

/**
 * Renders a button that, given a previously-known extension ID, pings the
 * installed Chrome extension via `chrome.runtime.sendMessage` to verify it
 * responds before navigating to `/extension/connect?extensionId=...` to run
 * the full connect flow. If no `candidateExtensionId` is supplied, clicking
 * just shows guidance to open the extension from the browser toolbar.
 */
export function InstalledExtensionConnectButton({
  candidateExtensionId
}: InstalledExtensionConnectButtonProps) {
  const [status, setStatus] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const knownExtensionId = candidateExtensionId?.trim()

  async function handleClick() {
    if (!knownExtensionId) {
      setStatus(
        "Open AutoTime from your browser toolbar and click Connect."
      )
      return
    }

    try {
      setIsChecking(true)
      setStatus("Checking installed extension...")
      await pingKnownExtension(knownExtensionId)
      window.location.assign(
        `/extension/connect?extensionId=${encodeURIComponent(knownExtensionId)}`
      )
    } catch (error: unknown) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Installed extension check failed."
      )
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <>
      <button
        className="secondary-link"
        disabled={isChecking}
        type="button"
        onClick={handleClick}
      >
        {isChecking
          ? "Checking extension"
          : knownExtensionId
            ? "Reconnect extension"
            : "Open extension to connect"}
      </button>
      <small className="extension-action-hint">
        {knownExtensionId
          ? "We will confirm the extension is available before linking it to your account."
          : "Open AutoTime from your browser toolbar to link this dashboard."}
      </small>
      {status ? (
        <p className={`status-banner compact ${getStatusTone(status)}`}>
          {status}
        </p>
      ) : null}
    </>
  )
}
