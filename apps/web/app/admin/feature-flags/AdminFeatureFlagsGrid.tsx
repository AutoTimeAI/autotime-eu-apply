"use client"

import { useState } from "react"
import type {
  AdminFeatureFlagKey,
  AdminFeatureFlagOverride,
} from "../../../lib/admin-feature-flags"

const environments = ["development", "preview", "production"] as const

function formatTimestamp(value: string | undefined): string {
  return value ? new Date(value).toLocaleString("en-GB") : "Default, no override"
}

export function AdminFeatureFlagsGrid({
  canWrite,
  defaults,
  initialOverrides,
}: {
  canWrite: boolean
  defaults: Record<AdminFeatureFlagKey, boolean>
  initialOverrides: AdminFeatureFlagOverride[]
}) {
  const [overrides, setOverrides] = useState(initialOverrides)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [error, setError] = useState("")

  function findOverride(key: AdminFeatureFlagKey, environment: string) {
    return overrides.find(
      (row) => row.key === key && row.environment === environment,
    )
  }

  async function toggle(key: AdminFeatureFlagKey, environment: (typeof environments)[number]) {
    const cellId = `${key}:${environment}`
    const existing = findOverride(key, environment)
    const currentEnabled = existing ? existing.enabled : defaults[key]
    setPendingKey(cellId)
    setError("")
    try {
      const response = await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          enabled: !currentEnabled,
          environment,
          expectedVersion: existing?.version ?? 0,
        }),
      })
      const payload = (await response.json()) as {
        data?: { outcome: string; enabled: boolean; version: number; updated_at: string }
        error?: string
      }
      if (!response.ok || !payload.data)
        throw new Error(payload.error || "Update failed")
      if (payload.data.outcome === "conflict") {
        setError("The value changed after it was loaded. Reload and try again.")
        return
      }
      setOverrides((current) => {
        const next = current.filter(
          (row) => !(row.key === key && row.environment === environment),
        )
        next.push({
          enabled: payload.data!.enabled,
          environment,
          key,
          updatedAt: payload.data!.updated_at,
          version: payload.data!.version,
        })
        return next
      })
    } catch {
      setError("Flag could not be updated.")
    } finally {
      setPendingKey(null)
    }
  }

  return (
    <>
      {error ? (
        <p className="notice-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="admin-table-shell">
        <table>
          <thead>
            <tr>
              <th>Flag</th>
              {environments.map((environment) => (
                <th key={environment}>{environment}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Object.keys(defaults) as AdminFeatureFlagKey[]).map((key) => (
              <tr key={key}>
                <td>{key}</td>
                {environments.map((environment) => {
                  const existing = findOverride(key, environment)
                  const enabled = existing ? existing.enabled : defaults[key]
                  const cellId = `${key}:${environment}`
                  return (
                    <td key={environment}>
                      <p>
                        <strong>{enabled ? "Enabled" : "Disabled"}</strong>
                      </p>
                      <p>
                        <small>{formatTimestamp(existing?.updatedAt)}</small>
                      </p>
                      {canWrite ? (
                        <button
                          className="secondary-button"
                          disabled={pendingKey === cellId}
                          onClick={() => void toggle(key, environment)}
                          type="button"
                        >
                          {pendingKey === cellId
                            ? "Saving…"
                            : `Turn ${enabled ? "off" : "on"}`}
                        </button>
                      ) : null}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
