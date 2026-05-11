import { redirect } from "next/navigation"
import { createAdminClient } from "../../../lib/supabase/admin"
import { createServerClient } from "../../../lib/supabase/server"

const extensionVersion = "0.0.1"

export const dynamic = "force-dynamic"

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not recorded"
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value))
}

function formatEventLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export default async function DashboardExtensionPage() {
  const supabase = await createServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?redirectTo=/dashboard/extension")
  }

  const admin = createAdminClient()
  const [connectionsResult, syncEventsResult] = await Promise.all([
    admin
      .from("extension_connections")
      .select(
        "extension_id, browser_label, last_connected_at, last_synced_at, revoked_at"
      )
      .eq("user_id", user.id)
      .order("last_connected_at", { ascending: false })
      .limit(3),
    admin
      .from("sync_events")
      .select("entity_type, action, message, source_surface, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8)
  ])

  const connections = connectionsResult.data ?? []
  const syncEvents = syncEventsResult.data ?? []
  const activeConnection = connections.find((item) => !item.revoked_at)
  const latestExtensionSync = syncEvents.find(
    (item) => item.source_surface === "extension"
  )
  const extensionEvents = syncEvents.filter(
    (item) => item.source_surface === "extension"
  )
  const healthLabel = activeConnection
    ? activeConnection.last_synced_at
      ? "Connected and syncing"
      : "Connected, waiting for first sync"
    : "Not connected"
  const healthTone = activeConnection
    ? activeConnection.last_synced_at
      ? "healthy"
      : "warning"
    : "critical"

  return (
    <main className="dashboard-shell">
      <section className="extension-download-panel">
        <div className="extension-health-hero">
          <div>
            <p className="eyebrow">Chrome extension</p>
            <h1>Extension connection</h1>
            <p>
              Install the extension, connect this dashboard account, and keep
              tracked jobs synced into the tracker.
            </p>
          </div>
          <span className={`extension-health-pill ${healthTone}`}>
            {healthLabel}
          </span>
        </div>

        <div className="sync-status-grid" aria-label="Extension sync health">
          <div>
            <strong>{healthLabel}</strong>
            <span>Connection health</span>
          </div>
          <div>
            <strong>{formatDate(activeConnection?.last_connected_at)}</strong>
            <span>Last connected</span>
          </div>
          <div>
            <strong>{formatDate(activeConnection?.last_synced_at)}</strong>
            <span>Last extension sync</span>
          </div>
          <div>
            <strong>
              {latestExtensionSync
                ? formatEventLabel(latestExtensionSync.entity_type)
                : "None yet"}
            </strong>
            <span>Latest synced entity</span>
          </div>
        </div>

        {(connectionsResult.error || syncEventsResult.error) && (
          <p className="status error">
            Sync health is partially unavailable. Check admin logs for the
            database query reason.
          </p>
        )}

        <div className="extension-distribution-grid">
          <section className="extension-install-steps extension-action-card">
            <p className="eyebrow">Private beta</p>
            <h2>Manual developer-mode install</h2>
            <p>
              Use this for founder validation, trusted testers and early
              customer pilots before the Chrome Web Store listing is approved.
            </p>
            <div className="extension-download-actions">
              <a
                className="primary-link"
                download
                href="/dashboard/extension/download"
              >
                Download extension v{extensionVersion}
              </a>
              <a className="secondary-link" href="/extension/connect">
                Connect installed extension
              </a>
            </div>
          </section>

          <section className="extension-install-steps extension-action-card">
            <p className="eyebrow">Setup checklist</p>
            <h2>Install path</h2>
            <ol>
              <li>Download and unzip the extension package.</li>
              <li>Open Chrome extensions and enable Developer mode.</li>
              <li>Load the unzipped folder as an unpacked extension.</li>
              <li>Open the extension Account tab and connect AutoTime.</li>
            </ol>
          </section>
        </div>

        <div className="extension-distribution-grid two-column">
          <section className="extension-install-steps">
            <p className="eyebrow">Connections</p>
            <h2>Recent browser connections</h2>
            {connections.length ? (
              <div className="extension-connection-list">
                {connections.map((connection) => (
                  <article
                    key={`${connection.extension_id}-${connection.last_connected_at}`}
                  >
                    <strong>
                      {connection.browser_label ?? "Chrome extension"}
                    </strong>
                    <span>
                      {connection.revoked_at ? "Revoked" : "Active"} /{" "}
                      {connection.extension_id ?? "Extension ID unavailable"}
                    </span>
                    <small>
                      Connected {formatDate(connection.last_connected_at)}
                    </small>
                    <small>
                      Last sync {formatDate(connection.last_synced_at)}
                    </small>
                  </article>
                ))}
              </div>
            ) : (
              <p>No browser connection has been recorded yet.</p>
            )}
          </section>

          <section className="extension-install-steps">
            <p className="eyebrow">Recent activity</p>
            <h2>Extension sync events</h2>
            {extensionEvents.length ? (
              <div className="extension-event-list">
                {extensionEvents.map((event) => (
                  <article
                    key={`${event.created_at}-${event.entity_type}-${event.action}`}
                  >
                    <strong>
                      {formatEventLabel(event.entity_type)} {event.action}
                    </strong>
                    <span>{formatDate(event.created_at)}</span>
                    <p>{event.message || "Synced from extension."}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p>No sync events recorded yet.</p>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}
