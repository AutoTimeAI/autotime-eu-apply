"use client"

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
    return "We could not reach that AutoTime extension. Check the ID, or open the extension and use CONNECT from its Account tab."
  }

  if (/not allowed|access|permission/i.test(message)) {
    return "AutoTime could not complete the browser check. Reload the extension, then use CONNECT from its Account tab."
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

export function InstalledExtensionConnectButton({
  candidateExtensionId
}: InstalledExtensionConnectButtonProps) {
  const [status, setStatus] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [manualExtensionId, setManualExtensionId] = useState("")
  const knownExtensionId = candidateExtensionId?.trim()
  const extensionId = knownExtensionId || manualExtensionId.trim()

  async function handleClick() {
    if (!extensionId) {
      setStatus(
        "Enter the AutoTime extension ID shown on Chrome's extensions page, or open the extension and use CONNECT from its Account tab."
      )
      return
    }

    try {
      setIsChecking(true)
      setStatus("Checking installed extension...")
      await pingKnownExtension(extensionId)
      window.location.assign(
        `/extension/connect?extensionId=${encodeURIComponent(extensionId)}`
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
      {!knownExtensionId ? (
        <label className="extension-id-field">
          <span>AutoTime extension ID</span>
          <input
            autoComplete="off"
            inputMode="text"
            placeholder="Paste the ID shown in Chrome"
            value={manualExtensionId}
            onChange={(event) => setManualExtensionId(event.target.value)}
          />
        </label>
      ) : null}
      <button
        className="secondary-link"
        disabled={isChecking}
        type="button"
        onClick={handleClick}
      >
        {isChecking ? "Checking extension" : "Connect installed extension"}
      </button>
      <small className="extension-action-hint">
        {extensionId
          ? "We will confirm the extension is available before linking it to your account."
          : "Find the ID on Chrome's extensions page, under AutoTime EU Apply."}
      </small>
      {status ? (
        <p className={`status-banner compact ${getStatusTone(status)}`}>
          {status}
        </p>
      ) : null}
    </>
  )
}
