"use client"

import { useEffect, useState } from "react"
import type { AdminProviderFailure } from "../../../lib/admin-ai-operations"

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("en-GB")
}

const POLL_INTERVAL_MS = 15_000

export function AdminAiOperationsLog({
  initialFailures,
}: {
  initialFailures: AdminProviderFailure[]
}) {
  const [failures, setFailures] = useState(initialFailures)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [error, setError] = useState("")

  async function refresh() {
    setRefreshing(true)
    setError("")
    try {
      const response = await fetch("/api/admin/ai-operations", {
        cache: "no-store",
      })
      const payload = (await response.json()) as {
        data?: { recentFailures: AdminProviderFailure[] }
        error?: string
      }
      if (!response.ok || !payload.data)
        throw new Error(payload.error || "Refresh failed")
      setFailures(payload.data.recentFailures)
      setCheckedAt(new Date())
    } catch {
      setError("Provider failures could not be refreshed.")
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!autoRefresh) return
    const timer = window.setInterval(() => {
      void refresh()
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [autoRefresh])

  return (
    <section className="admin-console-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>Provider failure categories</h2>
          <p>Warn/severe operational_logs entries tagged area=&quot;ai&quot;, last 24 hours.</p>
        </div>
      </div>
      <div className="admin-live-meta">
        <p>
          {checkedAt
            ? `Last checked ${checkedAt.toLocaleTimeString("en-GB")}`
            : "Loaded on page open"}
        </p>
        <label>
          <input
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.target.checked)}
            type="checkbox"
          />
          Auto-refresh every {POLL_INTERVAL_MS / 1000}s
        </label>
        <button
          className="secondary-button"
          disabled={refreshing}
          onClick={() => void refresh()}
          type="button"
        >
          {refreshing ? "Refreshing…" : "Refresh now"}
        </button>
      </div>
      {error ? (
        <p className="notice-error" role="alert">
          {error}
        </p>
      ) : null}
      {failures.length === 0 ? (
        <p>No provider failures in the last 24 hours.</p>
      ) : (
        <ol className="admin-log-stream">
          {failures.map((failure) => (
            <li key={failure.id}>
              <time>{formatTimestamp(failure.createdAt)}</time>
              <small>{failure.area}</small>
              <strong>{failure.code}</strong>
              <span className={`admin-log-severity ${failure.level}`}>
                {failure.level}
              </span>
              <p>
                {failure.message}
                {failure.httpStatus ? ` (HTTP ${failure.httpStatus})` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
