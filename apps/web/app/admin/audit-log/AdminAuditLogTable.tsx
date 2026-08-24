"use client"

// Client-side table for the /admin/audit-log page. Polls
// GET /api/admin/audit-log on a 15s interval (toggleable) to keep the
// admin-actions audit trail current, with a manual "Refresh now" fallback.
import { useEffect, useState } from "react"
import type { AdminAuditEvent } from "../../../lib/admin-audit"

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("en-GB")
}

function formatMetadata(metadata: AdminAuditEvent["metadata"]): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return "—"
  const entries = Object.entries(metadata as Record<string, unknown>)
  if (!entries.length) return "—"
  return entries.map(([key, value]) => `${key}: ${value}`).join(", ")
}

const POLL_INTERVAL_MS = 15_000

/**
 * Renders the audit-log table (action, target, actor, metadata, timestamp
 * per row), auto-refreshing every `POLL_INTERVAL_MS` while `autoRefresh` is
 * checked (default on) and supporting an immediate manual refresh.
 */
export function AdminAuditLogTable({
  initialEvents,
}: {
  initialEvents: AdminAuditEvent[]
}) {
  const [events, setEvents] = useState(initialEvents)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [error, setError] = useState("")

  async function refresh() {
    setRefreshing(true)
    setError("")
    try {
      const response = await fetch("/api/admin/audit-log", { cache: "no-store" })
      const payload = (await response.json()) as {
        data?: AdminAuditEvent[]
        error?: string
      }
      if (!response.ok || !payload.data)
        throw new Error(payload.error || "Refresh failed")
      setEvents(payload.data)
      setCheckedAt(new Date())
    } catch {
      setError("Audit log could not be refreshed.")
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
    <>
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
      {events.length === 0 ? (
        <p>No admin actions recorded yet.</p>
      ) : (
        <div className="admin-table-shell">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Target</th>
                <th>Actor</th>
                <th>Metadata</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.action}</td>
                  <td>
                    {event.targetType}
                    {event.targetId ? ` · ${event.targetId}` : ""}
                  </td>
                  <td>{event.actorUserId}</td>
                  <td>{formatMetadata(event.metadata)}</td>
                  <td>{formatTimestamp(event.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
