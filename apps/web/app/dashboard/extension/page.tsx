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
  const healthLabel = activeConnection
    ? activeConnection.last_synced_at
      ? "Connected and syncing"
      : "Connected, waiting for first sync"
    : "Not connected"

  return (
    <main className="dashboard-shell">
      <section className="extension-download-panel">
        <div className="section-intro">
          <p className="eyebrow">Chrome extension</p>
          <h1>Download AutoTime EU Apply</h1>
          <p>
            Private beta users can install manually in Chrome Developer mode
            while Chrome Web Store approval is in progress.
          </p>
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
            <strong>{latestExtensionSync?.entity_type ?? "None yet"}</strong>
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
          <section className="extension-install-steps">
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
            <ol>
              <li>Download the extension zip from this page.</li>
              <li>Unzip it on your computer.</li>
              <li>Open Chrome and go to chrome://extensions.</li>
              <li>Turn on Developer mode.</li>
              <li>Click Load unpacked and select the unzipped folder.</li>
              <li>Open the extension Account tab and connect it to AutoTime.</li>
            </ol>
            <p>
              This is a developer preview install path. Public customers should
              use the Chrome Web Store listing once approved.
            </p>
          </section>

          <section className="extension-install-steps">
            <p className="eyebrow">Recent activity</p>
            <h2>Extension sync events</h2>
            {syncEvents.length ? (
              <ol>
                {syncEvents.map((event) => (
                  <li
                    key={`${event.created_at}-${event.entity_type}-${event.action}`}
                  >
                    {formatDate(event.created_at)} - {event.source_surface}{" "}
                    {event.entity_type} {event.action}
                    {event.message ? `: ${event.message}` : ""}
                  </li>
                ))}
              </ol>
            ) : (
              <p>No sync events recorded yet.</p>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}
