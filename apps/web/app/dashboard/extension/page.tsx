import { redirect } from "next/navigation"
import { InstalledExtensionConnectButton } from "../../../components/InstalledExtensionConnectButton"
import { ProfileProtocolLock } from "../../../components/ProfileProtocolLock"
import { createAdminClient } from "../../../lib/supabase/admin"
import { createServerClient } from "../../../lib/supabase/server"

const extensionVersion = "0.0.3"

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

function formatCount(value: number | null) {
  if (typeof value !== "number") {
    return "Unavailable"
  }

  return `${value}`
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
  const [
    connectionsResult,
    syncEventsResult,
    capturedJobsResult,
    latestCapturedJobResult
  ] = await Promise.all([
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
      .limit(8),
    admin
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("source_surface", "extension"),
    admin
      .from("applications")
      .select("title, company, role_title, source, updated_at")
      .eq("user_id", user.id)
      .eq("source_surface", "extension")
      .order("updated_at", { ascending: false })
      .limit(1)
  ])

  const connections = connectionsResult.data ?? []
  const syncEvents = syncEventsResult.data ?? []
  const capturedJobsCount = capturedJobsResult.count
  const latestCapturedJob = latestCapturedJobResult.data?.[0]
  const activeConnection = connections.find((item) => !item.revoked_at)
  const activeConnectionExtensionId = activeConnection?.extension_id?.trim()
  const candidateExtensionId =
    activeConnectionExtensionId ??
    connections.find((item) => item.extension_id?.trim())?.extension_id?.trim()
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
  const hasSyncQueryError = Boolean(
    connectionsResult.error ||
      syncEventsResult.error ||
      capturedJobsResult.error ||
      latestCapturedJobResult.error
  )
  const reconnectState = !activeConnection
    ? "Reconnect required"
    : hasSyncQueryError
      ? "Sync proof unavailable"
      : activeConnection.last_synced_at
        ? "Reconnect only if capture stops"
        : "Track one job to verify sync"
  const parsedConfidence = !activeConnection
    ? "Low"
    : activeConnection.last_synced_at && (capturedJobsCount ?? 0) > 0
      ? "High"
      : "Medium"
  const parsedConfidenceDetail =
    parsedConfidence === "High"
      ? "At least one extension-captured job has reached the dashboard."
      : parsedConfidence === "Medium"
        ? "Connection exists; capture a job to prove parser-to-tracker sync."
        : "No active connection is available for extension parsing."
  const heroDescription = activeConnection
    ? activeConnection.last_synced_at
      ? "Your extension is connected. Tracked jobs from the browser are syncing into your dashboard tracker."
      : "Your extension is connected. Track or update a job in the extension to start the first dashboard sync."
    : "Install the extension, connect this dashboard account, and keep tracked jobs synced into the tracker."

  return (
    <main className="dashboard-shell">
      <ProfileProtocolLock userId={user.id}>
        <section className="extension-download-panel">
        <div className="extension-health-hero">
          <div>
            <p className="eyebrow">Chrome extension</p>
            <h1>Extension connection</h1>
            <p>{heroDescription}</p>
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
            <span>Last synced time</span>
          </div>
          <div>
            <strong>{formatCount(capturedJobsCount)}</strong>
            <span>Jobs captured</span>
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

        <div className="extension-proof-grid" aria-label="Extension sync proof">
          <article className={`extension-proof-card ${healthTone}`}>
            <span>Current extension status</span>
            <strong>{healthLabel}</strong>
            <p>{activeConnection ? "Active browser connection found." : "No active browser connection has been recorded."}</p>
          </article>
          <article className={`extension-proof-card ${hasSyncQueryError ? "critical" : healthTone}`}>
            <span>Sync error / reconnect state</span>
            <strong>{reconnectState}</strong>
            <p>
              {hasSyncQueryError
                ? "Some sync proof could not be read. Reconnect if the extension UI also reports a failure."
                : activeConnection?.last_synced_at
                  ? "The dashboard has a recent extension sync marker."
                  : "Use Track Job from the extension to create the first sync marker."}
            </p>
          </article>
          <article className={`extension-proof-card ${parsedConfidence.toLowerCase()}`}>
            <span>Parsed from extension confidence</span>
            <strong>{parsedConfidence}</strong>
            <p>{parsedConfidenceDetail}</p>
          </article>
          <article className="extension-proof-card neutral">
            <span>Latest captured role</span>
            <strong>
              {latestCapturedJob
                ? latestCapturedJob.role_title || latestCapturedJob.title
                : "None yet"}
            </strong>
            <p>
              {latestCapturedJob
                ? `${latestCapturedJob.company ?? "Unknown company"} / ${
                    latestCapturedJob.source ?? "Extension"
                  } / ${formatDate(latestCapturedJob.updated_at)}`
                : "Track a role from a job page to prove capture end to end."}
            </p>
          </article>
        </div>

        {hasSyncQueryError && (
          <p className="status error">
            Sync health is partially unavailable. Reconnect the extension or try
            again after refreshing the dashboard.
          </p>
        )}

        <div className="extension-distribution-grid">
          <section className="extension-install-steps extension-action-card">
            <p className="eyebrow">
              {activeConnection ? "Connected browser" : "Private beta"}
            </p>
            <h2>
              {activeConnection
                ? "Extension is already connected"
                : "Manual developer-mode install"}
            </h2>
            <p>
              {activeConnection
                ? "Use the tracker to review synced jobs. Reconnect only if you changed browser profile, reinstalled the extension, or sync stops."
                : "Use this for founder validation, trusted testers and early customer pilots before the Chrome Web Store listing is approved."}
            </p>
            <div className="extension-download-actions">
              {activeConnection ? (
                <>
                  <a className="primary-link" href="/dashboard/applications">
                    Open tracker
                  </a>
                  <a
                    className="secondary-link"
                    href={
                      activeConnectionExtensionId
                        ? `/extension/connect?extensionId=${encodeURIComponent(
                            activeConnectionExtensionId
                          )}`
                        : "/extension/connect"
                    }
                  >
                    Reconnect extension
                  </a>
                </>
              ) : (
                <>
                  <a
                    className="primary-link"
                    download
                    href="/dashboard/extension/download"
                  >
                    Download extension v{extensionVersion}
                  </a>
                  <InstalledExtensionConnectButton
                    candidateExtensionId={candidateExtensionId}
                  />
                </>
              )}
            </div>
          </section>

          <section className="extension-install-steps extension-action-card">
            <p className="eyebrow">Setup checklist</p>
            <h2>Install path</h2>
            <ol>
              <li>Download and unzip the extension package.</li>
              <li>Open Chrome extensions and enable Developer mode.</li>
              <li>Load the unzipped folder as an unpacked extension.</li>
              <li>Click the AutoTime icon in Chrome, then click Connect.</li>
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
      </ProfileProtocolLock>
    </main>
  )
}
