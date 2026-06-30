import type { Ref } from "react"
import type { AccountSession, DiagnosticLogEntry } from "../lib/storage"
import { appUrl } from "../lib/openai"
import { formatProviderLabel, getStatusClassName } from "./utils"

type AccountSectionProps = {
  canSyncProfile: boolean
  session: AccountSession | null
  status: string
  statusRef: Ref<HTMLParagraphElement>
  onLoadProfileFromDashboard: () => void
  onClearDiagnosticLog: () => void
  onExportDiagnosticLog: () => void
  onSignOut: () => void
  onSyncProfileToDashboard: () => void
  diagnosticLog: DiagnosticLogEntry[]
}

function PlanBadge({ plan }: { plan: AccountSession["plan"] }) {
  return <span className={`plan-badge ${plan === "pro" ? "pro" : ""}`}>{plan}</span>
}

function openAppPath(path: string) {
  chrome.tabs.create({ url: `${appUrl}${path}` })
}

function openExtensionConnect() {
  const extensionId = encodeURIComponent(chrome.runtime.id)
  openAppPath(`/extension/connect?extensionId=${extensionId}`)
}

export function AccountSection({
  canSyncProfile,
  diagnosticLog,
  onClearDiagnosticLog,
  onExportDiagnosticLog,
  onLoadProfileFromDashboard,
  session,
  status,
  statusRef,
  onSignOut,
  onSyncProfileToDashboard
}: AccountSectionProps) {
  const isSignedIn = Boolean(session?.authToken.trim())

  return (
    <section className="panel-section">
      <h2>Account</h2>

      <div className="form-grid">
        {isSignedIn && session ? (
          <>
            <div className="summary-card">
              <h3>Signed in</h3>
              <dl className="summary-list">
                <div>
                  <dt>Email</dt>
                  <dd>{session.email}</dd>
                </div>
                <div>
                  <dt>Signed in with</dt>
                  <dd>{formatProviderLabel(session.provider)}</dd>
                </div>
                <div>
                  <dt>Plan</dt>
                  <dd>
                    <PlanBadge plan={session.plan} />
                  </dd>
                </div>
              </dl>
            </div>

            <button type="button" onClick={() => openAppPath("/pricing")}>
              Manage plan
            </button>
            <button
              disabled={!canSyncProfile}
              type="button"
              onClick={onSyncProfileToDashboard}
            >
              Sync profile to dashboard
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={onLoadProfileFromDashboard}
            >
              Load dashboard profile
            </button>
            <button className="secondary-button" type="button" onClick={onSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <div className="summary-card">
              <h3>Connect dashboard</h3>
              <p>Link this extension to your AutoTime account for sync and AI.</p>
            </div>
            <button type="button" onClick={openExtensionConnect}>
              Connect
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => openAppPath("/pricing")}
            >
              Manage plan
            </button>
          </>
        )}

        <div className="summary-card">
          <h3>Connection diagnostics</h3>
          <p>
            {diagnosticLog.length
              ? `${diagnosticLog.length} recent events captured.`
              : "No diagnostic events captured yet."}
          </p>
          {diagnosticLog[0] ? (
            <p>
              Latest: {diagnosticLog[0].event} ({diagnosticLog[0].status})
            </p>
          ) : null}
        </div>
        <button
          className="secondary-button"
          disabled={diagnosticLog.length === 0}
          type="button"
          onClick={onExportDiagnosticLog}
        >
          Export diagnostic log
        </button>
        <button
          className="secondary-button"
          disabled={diagnosticLog.length === 0}
          type="button"
          onClick={onClearDiagnosticLog}
        >
          Clear diagnostic log
        </button>

        {status && (
          <p
            className={getStatusClassName(status)}
            ref={statusRef}
            role="status"
            tabIndex={-1}
          >
            {status}
          </p>
        )}
      </div>
    </section>
  )
}
