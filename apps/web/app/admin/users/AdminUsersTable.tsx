"use client"

/**
 * Keeps the privacy-minimised beta-user table fresh in the browser while
 * respecting the server's decision about whether email addresses may appear.
 */
import { useEffect, useState } from "react"
import type { AdminUsersPage } from "../../../lib/admin-users"
import { getVisibleRowRange } from "../../../lib/admin-users-pagination"

function formatTimestamp(value: string | null): string {
  return value ? new Date(value).toLocaleString("en-GB") : "Never signed in"
}

const POLL_INTERVAL_MS = 15_000

/** Renders manual and optional polling refresh controls for beta-user rows. */
export function AdminUsersTable({
  initialData,
  includeEmail,
}: {
  initialData: AdminUsersPage
  includeEmail: boolean
}) {
  const [data, setData] = useState(initialData)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [error, setError] = useState("")

  async function loadPage(page: number) {
    setRefreshing(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/users?page=${page}`, {
        cache: "no-store",
      })
      const payload = (await response.json()) as {
        data?: AdminUsersPage
        error?: string
      }
      if (!response.ok || !payload.data)
        throw new Error(payload.error || "Refresh failed")
      setData(payload.data)
      setCheckedAt(new Date())
    } catch {
      setError("User data could not be refreshed.")
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!autoRefresh) return
    const timer = window.setInterval(() => {
      // Re-fetch the page currently being viewed, not always page 1.
      void loadPage(data.page)
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, data.page])

  const { firstRow, lastRow } = getVisibleRowRange(
    data.page,
    data.perPage,
    data.total,
  )

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
          onClick={() => void loadPage(data.page)}
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
      <div className="admin-table-shell">
        <table>
          <thead>
            <tr>
              <th>{includeEmail ? "Email" : "User ID"}</th>
              <th>Beta status</th>
              <th>Created</th>
              <th>Last active</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((user) => (
              <tr key={user.id}>
                <td>{includeEmail ? (user.email ?? "—") : user.id}</td>
                <td>{user.betaStatus}</td>
                <td>{formatTimestamp(user.createdAt)}</td>
                <td>{formatTimestamp(user.lastActiveAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="admin-pagination">
        <p>
          {data.total > 0
            ? `Showing ${firstRow}–${lastRow} of ${data.total} users`
            : "No users found"}
        </p>
        <button
          className="secondary-button"
          disabled={refreshing || data.page <= 1}
          onClick={() => void loadPage(data.page - 1)}
          type="button"
        >
          Previous
        </button>
        <button
          className="secondary-button"
          disabled={refreshing || !data.hasMore}
          onClick={() => void loadPage(data.page + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </>
  )
}
