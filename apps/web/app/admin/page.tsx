import { redirect } from "next/navigation"
import { isAdminUser } from "../../lib/admin-access"
import { getAdminOverview } from "../../lib/admin-monitoring"
import { createServerClient } from "../../lib/supabase/server"
import { getTestAuthUser } from "../../lib/test-auth"

export const dynamic = "force-dynamic"

function formatDate(value: string | null): string {
  if (!value) {
    return "Never"
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value))
}

async function getAdminUser() {
  const testUser = getTestAuthUser()

  if (testUser) {
    return testUser
  }

  const supabase = await createServerClient()
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/login?redirectTo=/admin")
  }

  return user
}

export default async function AdminPage() {
  const user = await getAdminUser()

  if (!isAdminUser(user)) {
    redirect("/dashboard")
  }

  const overview = await getAdminOverview()
  const config = overview.config.extensionConnection

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Internal admin</p>
          <h1>AutoTime operations panel</h1>
          <p>
            Health, sync activity, extension connection state, AI usage, and
            monitoring config for the production workflow.
          </p>
        </div>
        <a className="secondary-button" href="/api/admin/overview">
          Open JSON
        </a>
      </header>

      <section className="admin-section">
        <div className="section-heading">
          <p className="eyebrow">System health</p>
          <h2>Live service status</h2>
        </div>
        <div className="admin-health-grid">
          {overview.health.map((item) => (
            <article className={`admin-health-card ${item.status}`} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {overview.warnings.length > 0 ? (
        <section className="admin-section">
          <div className="section-heading">
            <p className="eyebrow">Warnings</p>
            <h2>Admin query issues</h2>
          </div>
          <ul className="admin-list">
            {overview.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="admin-section">
        <div className="section-heading">
          <p className="eyebrow">Product counters</p>
          <h2>Database totals</h2>
        </div>
        <div className="admin-metric-grid">
          {overview.counts.map((item) => (
            <article className="admin-metric-card" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value ?? "n/a"}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <div className="section-heading">
          <p className="eyebrow">Extension</p>
          <h2>Recent connections</h2>
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
      </section>

      <section className="admin-section admin-two-column">
        <article>
          <div className="section-heading">
            <p className="eyebrow">Sync log</p>
            <h2>Recent sync events</h2>
          </div>
          <ol className="admin-event-list">
            {overview.recentSyncEvents.map((event) => (
              <li key={`${event.entityId}-${event.createdAt}`}>
                <strong>{event.entityType} {event.action}</strong>
                <span>{event.sourceSurface} · {formatDate(event.createdAt)}</span>
                <p>{event.message}</p>
              </li>
            ))}
            {overview.recentSyncEvents.length === 0 ? (
              <li>No sync events recorded yet.</li>
            ) : null}
          </ol>
        </article>

        <article>
          <div className="section-heading">
            <p className="eyebrow">AI monitor</p>
            <h2>Recent usage</h2>
          </div>
          <ol className="admin-event-list">
            {overview.recentAiUsage.map((event) => (
              <li key={`${event.feature}-${event.createdAt}`}>
                <strong>{event.feature}</strong>
                <span>{event.model} · {event.tokens} tokens</span>
                <p>${event.costUsd.toFixed(4)} · {formatDate(event.createdAt)}</p>
              </li>
            ))}
            {overview.recentAiUsage.length === 0 ? (
              <li>No AI usage recorded yet.</li>
            ) : null}
          </ol>
        </article>
      </section>

      <section className="admin-section">
        <div className="section-heading">
          <p className="eyebrow">Monitoring config</p>
          <h2>{config.flowId}</h2>
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
      </section>

      <p className="admin-footnote">
        Last checked {formatDate(overview.checkedAt)}. Admin access is controlled
        by AUTOTIME_ADMIN_EMAILS.
      </p>
    </main>
  )
}
