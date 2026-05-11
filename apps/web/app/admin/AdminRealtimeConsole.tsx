"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { AdminOverview } from "../../lib/admin-monitoring"

type AdminApiResponse = {
  data: AdminOverview | null
  error: string | null
  status: number
}

const refreshIntervalMs = 15000

function formatDate(value: string | null): string {
  if (!value) {
    return "Never"
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value))
}

function formatTime(value: string | null): string {
  if (!value) {
    return "Never"
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value))
}

function getHealthScore(overview: AdminOverview) {
  const total = overview.health.length || 1
  const healthy = overview.health.filter((item) => item.status === "healthy").length

  return Math.round((healthy / total) * 100)
}

function getCount(overview: AdminOverview, label: string) {
  return overview.counts.find((item) => item.label === label)?.value ?? 0
}

export function AdminRealtimeConsole({
  adminEmail,
  initialOverview
}: {
  adminEmail: string
  initialOverview: AdminOverview
}) {
  const [overview, setOverview] = useState(initialOverview)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(initialOverview.checkedAt)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const healthScore = useMemo(() => getHealthScore(overview), [overview])
  const activeExtensions = overview.recentExtensionConnections.filter(
    (item) => !item.revokedAt
  ).length
  const latestSync = overview.recentSyncEvents[0]?.createdAt ?? null
  const latestExtension =
    overview.recentExtensionConnections[0]?.lastConnectedAt ?? null
  const latestAi = overview.recentAiUsage[0]?.createdAt ?? null
  const config = overview.config.extensionConnection

  const refresh = useCallback(async () => {
    try {
      setIsRefreshing(true)
      setError(null)

      const response = await fetch("/api/admin/overview", {
        cache: "no-store",
        headers: {
          Accept: "application/json"
        }
      })
      const payload = (await response.json()) as AdminApiResponse

      if (!response.ok || !payload.data) {
        setError(payload.error ?? "Admin overview failed to refresh.")
        return
      }

      setOverview(payload.data)
      setLastUpdatedAt(payload.data.checkedAt)
    } catch (refreshError: unknown) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Admin overview failed to refresh."
      )
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!autoRefresh) {
      return
    }

    const interval = window.setInterval(() => {
      void refresh()
    }, refreshIntervalMs)

    return () => window.clearInterval(interval)
  }, [autoRefresh, refresh])

  return (
    <main className="admin-console-shell">
      <header className="admin-console-hero">
        <div>
          <p className="eyebrow">Internal control room</p>
          <h1>AutoTime live operations</h1>
          <p>
            Real-time view of web health, database reachability, extension
            connections, sync traffic, AI usage, and monitoring config.
          </p>
        </div>
        <div className="admin-console-actions">
          <span className={error ? "admin-live-pill issue" : "admin-live-pill"}>
            {error ? "Attention" : "Live"}
          </span>
          <button
            className="secondary-button"
            disabled={isRefreshing}
            type="button"
            onClick={() => void refresh()}
          >
            {isRefreshing ? "Refreshing" : "Refresh"}
          </button>
          <a className="secondary-button" href="/api/admin/overview">
            JSON
          </a>
        </div>
      </header>

      <section className="admin-command-strip" aria-label="Admin status summary">
        <article>
          <span>Health</span>
          <strong>{healthScore}%</strong>
          <p>{overview.health.length} checks</p>
        </article>
        <article>
          <span>Accounts</span>
          <strong>{getCount(overview, "Accounts")}</strong>
          <p>{getCount(overview, "Subscriptions")} subscriptions</p>
        </article>
        <article>
          <span>Tracked jobs</span>
          <strong>{getCount(overview, "Tracked jobs")}</strong>
          <p>{getCount(overview, "Sync events")} sync events</p>
        </article>
        <article>
          <span>Extension</span>
          <strong>{activeExtensions}</strong>
          <p>active connections</p>
        </article>
        <article>
          <span>AI</span>
          <strong>{getCount(overview, "AI usage rows")}</strong>
          <p>usage rows</p>
        </article>
      </section>

      <section className="admin-live-meta">
        <p>
          Signed in as <strong>{adminEmail}</strong>. Last refresh{" "}
          <strong>{formatTime(lastUpdatedAt)}</strong>.
        </p>
        <label>
          <input
            checked={autoRefresh}
            type="checkbox"
            onChange={(event) => setAutoRefresh(event.target.checked)}
          />
          Auto refresh every 15 seconds
        </label>
      </section>

      {error ? (
        <section className="admin-alert-panel">
          <strong>Refresh failed</strong>
          <p>{error}</p>
        </section>
      ) : null}

      {overview.warnings.length > 0 ? (
        <section className="admin-alert-panel warning">
          <strong>Warnings</strong>
          <ul>
            {overview.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="admin-console-grid">
        <article className="admin-console-panel wide">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">System health</p>
              <h2>Runtime checks</h2>
            </div>
            <span>{formatDate(overview.checkedAt)}</span>
          </div>
          <div className="admin-health-grid">
            {overview.health.map((item) => (
              <article
                className={`admin-health-card ${item.status}`}
                key={item.label}
              >
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="admin-console-panel">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">Timeline</p>
              <h2>Latest signals</h2>
            </div>
          </div>
          <dl className="admin-signal-list">
            <div>
              <dt>Extension</dt>
              <dd>{formatDate(latestExtension)}</dd>
            </div>
            <div>
              <dt>Sync</dt>
              <dd>{formatDate(latestSync)}</dd>
            </div>
            <div>
              <dt>AI</dt>
              <dd>{formatDate(latestAi)}</dd>
            </div>
            <div>
              <dt>Config</dt>
              <dd>{config.flowId}</dd>
            </div>
          </dl>
        </article>

        <article className="admin-console-panel wide">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">Extension</p>
              <h2>Recent connections</h2>
            </div>
          </div>
          <div className="admin-table-shell">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Extension</th>
                  <th>Browser</th>
                  <th>Connected</th>
                  <th>Synced</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {overview.recentExtensionConnections.map((item) => (
                  <tr key={`${item.userId}-${item.lastConnectedAt}`}>
                    <td>{item.userId}</td>
                    <td>{item.extensionId ?? "unknown"}</td>
                    <td>{item.browserLabel ?? "Chrome"}</td>
                    <td>{formatDate(item.lastConnectedAt)}</td>
                    <td>{formatDate(item.lastSyncedAt)}</td>
                    <td>{item.revokedAt ? "Revoked" : "Active"}</td>
                  </tr>
                ))}
                {overview.recentExtensionConnections.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No extension connections recorded yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-console-panel">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">Sync log</p>
              <h2>Recent events</h2>
            </div>
          </div>
          <ol className="admin-event-list">
            {overview.recentSyncEvents.map((event) => (
              <li key={`${event.entityId}-${event.createdAt}`}>
                <strong>
                  {event.entityType} {event.action}
                </strong>
                <span>
                  {event.sourceSurface} / {formatDate(event.createdAt)}
                </span>
                <p>{event.message}</p>
              </li>
            ))}
            {overview.recentSyncEvents.length === 0 ? (
              <li>No sync events recorded yet.</li>
            ) : null}
          </ol>
        </article>

        <article className="admin-console-panel">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">AI monitor</p>
              <h2>Recent usage</h2>
            </div>
          </div>
          <ol className="admin-event-list">
            {overview.recentAiUsage.map((event) => (
              <li key={`${event.feature}-${event.createdAt}`}>
                <strong>{event.feature}</strong>
                <span>
                  {event.model} / {event.tokens} tokens
                </span>
                <p>
                  ${event.costUsd.toFixed(4)} / {formatDate(event.createdAt)}
                </p>
              </li>
            ))}
            {overview.recentAiUsage.length === 0 ? (
              <li>No AI usage recorded yet.</li>
            ) : null}
          </ol>
        </article>

        <article className="admin-console-panel wide">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">Monitoring config</p>
              <h2>{config.flowId}</h2>
            </div>
            <span>{config.logStore.maxEntries} local log entries</span>
          </div>
          <div className="admin-config-grid">
            <article className="admin-config-card">
              <strong>Expected flows</strong>
              <ul>
                {config.expectedFlows.map((flow) => (
                  <li key={flow.name}>
                    {flow.name}: {flow.events.join(" -> ")}
                  </li>
                ))}
              </ul>
            </article>
            <article className="admin-config-card">
              <strong>Failure events</strong>
              <ul>
                {Object.entries(config.failureEvents).map(([key, value]) => (
                  <li key={key}>
                    {key}: {value.meaning}
                  </li>
                ))}
              </ul>
            </article>
            <article className="admin-config-card">
              <strong>Operating rules</strong>
              <ul>
                {config.operatingRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </article>
          </div>
        </article>
      </section>
    </main>
  )
}
