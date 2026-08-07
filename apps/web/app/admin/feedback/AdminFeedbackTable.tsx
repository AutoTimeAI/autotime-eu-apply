"use client"

import { useEffect, useState } from "react"
import type { AdminFeedbackRow } from "../../../lib/admin-feedback"

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("en-GB")
}

const POLL_INTERVAL_MS = 15_000

export function AdminFeedbackTable({
  initialFeedback,
}: {
  initialFeedback: AdminFeedbackRow[]
}) {
  const [feedback, setFeedback] = useState(initialFeedback)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [error, setError] = useState("")

  async function refresh() {
    setRefreshing(true)
    setError("")
    try {
      const response = await fetch("/api/admin/feedback", { cache: "no-store" })
      const payload = (await response.json()) as {
        data?: AdminFeedbackRow[]
        error?: string
      }
      if (!response.ok || !payload.data)
        throw new Error(payload.error || "Refresh failed")
      setFeedback(payload.data)
      setCheckedAt(new Date())
    } catch {
      setError("Feedback could not be refreshed.")
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
      {feedback.length === 0 ? (
        <p>No feedback submitted yet.</p>
      ) : (
        <div className="admin-table-shell">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Category</th>
                <th>Product area</th>
                <th>Rating</th>
                <th>Message</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {feedback.map((item) => (
                <tr key={item.id}>
                  <td>{item.status}</td>
                  <td>{item.category}</td>
                  <td>{item.productArea}</td>
                  <td>{item.rating ?? "—"}</td>
                  <td>{item.message}</td>
                  <td>{formatTimestamp(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
