import type { Ref } from "react"
import type { AccountSession } from "../lib/storage"
import { appUrl } from "../lib/openai"
import { getStatusClassName } from "./utils"

type AccountSectionProps = {
  session: AccountSession | null
  status: string
  statusRef: Ref<HTMLParagraphElement>
  onSignOut: () => void
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
  session,
  status,
  statusRef,
  onSignOut
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
            <button className="secondary-button" type="button" onClick={onSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <div className="summary-card">
              <h3>Not signed in</h3>
              <p>Sign in for cloud sync and unlimited AI.</p>
            </div>
            <button type="button" onClick={openExtensionConnect}>
              Sign in for cloud sync and unlimited AI
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
