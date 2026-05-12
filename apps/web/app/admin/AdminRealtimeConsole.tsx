"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { AdminOverview } from "../../lib/admin-monitoring"

type AdminApiResponse = {
  data: AdminOverview | null
  error: string | null
  status: number
}

const refreshIntervalMs = 300000
const severityFilters = ["all", "severe", "warn", "info"] as const

type SeverityFilter = (typeof severityFilters)[number]

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

function getSeverityLabel(severity: AdminOverview["logs"][number]["severity"]) {
  return severity
}

function formatLogMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return ""
  }

  return Object.entries(metadata as Record<string, unknown>)
    .filter(([, value]) =>
      ["boolean", "number", "string"].includes(typeof value) || value === null
    )
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" / ")
}

function getFixHint(entry: AdminOverview["logs"][number]) {
  if (entry.severity === "severe") {
    return "Check the failing API, environment variables, and production logs first."
  }

  if (entry.area === "sync") {
    return "Check extension session, dashboard auth token, and the sync API response."
  }

  if (entry.area === "connect") {
    return "Check extension ID, dashboard origin, and account connection flow."
  }

  if (entry.severity === "warn") {
    return "Review recent config, DB availability, and retry state before escalating."
  }

  return "Informational signal. No action needed unless it repeats unexpectedly."
}

export function AdminRealtimeConsole({
  initialOverview
}: {
  initialOverview: AdminOverview
}) {
  const [overview, setOverview] = useState(initialOverview)
  const [hasRefreshAlert, setHasRefreshAlert] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(initialOverview.checkedAt)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [severityFilter, setSeverityFilter] =
    useState<SeverityFilter>("all")
  const [areaFilter, setAreaFilter] = useState("all")

  const healthScore = useMemo(() => getHealthScore(overview), [overview])
  const activeExtensions = overview.recentExtensionConnections.filter(
    (item) => !item.revokedAt
  ).length
  const latestSync = overview.recentSyncEvents[0]?.createdAt ?? null
  const latestExtension =
    overview.recentExtensionConnections[0]?.lastConnectedAt ?? null
  const latestAi = overview.recentAiUsage[0]?.createdAt ?? null
  const config = overview.config.extensionConnection
  const logging = overview.config.logging
  const logAreas = useMemo(
    () => Array.from(new Set(overview.logs.map((entry) => entry.area))).sort(),
    [overview.logs]
  )
  const filteredLogs = useMemo(
    () =>
      overview.logs.filter((entry) => {
        const matchesSeverity =
          severityFilter === "all" || entry.severity === severityFilter
        const matchesArea = areaFilter === "all" || entry.area === areaFilter

        return matchesSeverity && matchesArea
      }),
    [areaFilter, overview.logs, severityFilter]
  )

  const refresh = useCallback(async () => {
    try {
      setIsRefreshing(true)
      setHasRefreshAlert(false)

      const response = await fetch("/api/admin/overview", {
        cache: "no-store",
        headers: {
          Accept: "application/json"
        }
      })
      const payload = (await response.json()) as AdminApiResponse

      if (!response.ok || !payload.data) {
        setHasRefreshAlert(true)
        return
      }

      setOverview(payload.data)
      setLastUpdatedAt(payload.data.checkedAt)
    } catch {
      setHasRefreshAlert(true)
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
          <span className={hasRefreshAlert ? "admin-live-pill issue" : "admin-live-pill"}>
            {hasRefreshAlert ? "Admin access" : "Live"}
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
          Admin access active. Last refresh <strong>{formatTime(lastUpdatedAt)}</strong>.
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

      {hasRefreshAlert ? (
        <section className="admin-alert-panel">
          <strong>Admin access only.</strong>
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

        <article className="admin-console-panel wide">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">Logs</p>
              <h2>Live event stream</h2>
            </div>
            <span>
              {filteredLogs.length} of {overview.logs.length} entries
              {overview.storedLogs.length > 0 ? " / persisted" : " / computed"}
            </span>
          </div>
          <div className="admin-log-filters" aria-label="Log filters">
            <label>
              Severity
              <select
                value={severityFilter}
                onChange={(event) =>
                  setSeverityFilter(event.target.value as SeverityFilter)
                }
              >
                {severityFilters.map((severity) => (
                  <option key={severity} value={severity}>
                    {severity === "all" ? "All severities" : severity}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Area
              <select
                value={areaFilter}
                onChange={(event) => setAreaFilter(event.target.value)}
              >
                <option value="all">All areas</option>
                {logAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setAreaFilter("all")
                setSeverityFilter("all")
              }}
            >
              Clear filters
            </button>
          </div>
          <ol className="admin-log-stream">
            {filteredLogs.map((entry) => (
              <li key={`${entry.area}-${entry.event}-${entry.timestamp}`}>
                <time>{formatDate(entry.timestamp)}</time>
                <strong>{entry.event}</strong>
                <span className={`admin-log-severity ${entry.severity}`}>
                  {getSeverityLabel(entry.severity)}
                </span>
                <p>{entry.message}</p>
                <small>
                  {[
                    entry.area,
                    entry.httpStatus ? `HTTP ${entry.httpStatus}` : null,
                    entry.path,
                    entry.diagnosticId ? `diag ${entry.diagnosticId}` : null
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                </small>
                {formatLogMetadata(entry.metadata) ? (
                  <small>{formatLogMetadata(entry.metadata)}</small>
                ) : null}
                <em>{getFixHint(entry)}</em>
              </li>
            ))}
            {filteredLogs.length === 0 ? (
              <li>
                <strong>
                  {overview.logs.length === 0
                    ? "No logs yet"
                    : "No logs match these filters"}
                </strong>
                <p>
                  {overview.logs.length === 0
                    ? "Admin access active."
                    : "Clear filters or choose a different severity or area."}
                </p>
              </li>
            ) : null}
          </ol>
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
              <strong>Log levels</strong>
              <ul>
                {Object.entries(logging.levels).map(([level, value]) => (
                  <li key={level}>
                    {level}: {value.description}
                  </li>
                ))}
              </ul>
            </article>
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
