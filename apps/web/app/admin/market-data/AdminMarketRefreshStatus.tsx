"use client"

// Client-side status panel for the /admin/market-data page. Polls
// GET /api/admin/market-data on a 15s interval (toggleable) to keep the
// most recent refresh-request status current, and — when `canRefresh` is
// true — offers a button that POSTs to /api/admin/market-data/refresh to
// request a new ESCO refresh (rate-limited server-side to roughly one per
// minute, and deduplicated via a per-click idempotency key).
import { useEffect, useState } from "react"
import type { AdminMarketRefreshRequest } from "../../../lib/admin-market-data"

function formatTimestamp(value: string | null): string {
  return value ? new Date(value).toLocaleString("en-GB") : "—"
}

const POLL_INTERVAL_MS = 15_000

/**
 * Renders the market-data refresh status panel: the most recent refresh
 * request's status/timestamps (or "Not scheduled" if none exists), with
 * auto-refresh polling and, when `canRefresh` is true, a "Request ESCO
 * refresh" button (`requestRefresh`) that surfaces a "duplicate" outcome
 * from the server as a distinct notice rather than an error.
 */
export function AdminMarketRefreshStatus({
  canRefresh,
  initialRequest,
}: {
  canRefresh: boolean
  initialRequest: AdminMarketRefreshRequest | null
}) {
  const [latest, setLatest] = useState(initialRequest)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  async function refresh() {
    setRefreshing(true)
    setError("")
    try {
      const response = await fetch("/api/admin/market-data", { cache: "no-store" })
      const payload = (await response.json()) as {
        data?: AdminMarketRefreshRequest | null
        error?: string
      }
      if (!response.ok) throw new Error(payload.error || "Refresh failed")
      setLatest(payload.data ?? null)
      setCheckedAt(new Date())
    } catch {
      setError("Market data status could not be refreshed.")
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

  async function requestRefresh() {
    setRequesting(true)
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/admin/market-data/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: true,
          provider: "esco",
          idempotencyKey: crypto.randomUUID(),
        }),
      })
      const payload = (await response.json()) as {
        data?: { outcome: string; status: string }
        error?: string
      }
      if (!response.ok || !payload.data)
        throw new Error(payload.error || "Refresh request failed")
      setNotice(
        payload.data.outcome === "duplicate"
          ? "An identical refresh request already exists."
          : "ESCO refresh requested.",
      )
      await refresh()
    } catch {
      setError("Refresh request could not be completed (it may be rate-limited to one per minute).")
    } finally {
      setRequesting(false)
    }
  }

  return (
    <section className="admin-console-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>Next refresh</h2>
          <p>Most recent request recorded in market_refresh_requests.</p>
        </div>
        {canRefresh ? (
          <button disabled={requesting} onClick={() => void requestRefresh()} type="button">
            {requesting ? "Requesting…" : "Request ESCO refresh"}
          </button>
        ) : null}
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
      {notice ? <p className="notice-success">{notice}</p> : null}
      {error ? (
        <p className="notice-error" role="alert">
          {error}
        </p>
      ) : null}
      {latest ? (
        <dl className="admin-signal-list">
          <div>
            <dt>Status</dt>
            <dd>{latest.status}</dd>
          </div>
          <div>
            <dt>Requested</dt>
            <dd>{formatTimestamp(latest.createdAt)}</dd>
          </div>
          <div>
            <dt>Completed</dt>
            <dd>{formatTimestamp(latest.completedAt)}</dd>
          </div>
          {latest.failureReason ? (
            <div>
              <dt>Failure reason</dt>
              <dd>{latest.failureReason}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p>Not scheduled — no refresh has been requested yet.</p>
      )}
    </section>
  )
}
