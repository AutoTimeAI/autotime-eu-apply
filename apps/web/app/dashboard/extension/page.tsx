const extensionVersion = "0.0.1"

export default function DashboardExtensionPage() {
  return (
    <main className="dashboard-shell">
      <section className="extension-download-panel">
        <div className="section-intro">
          <p className="eyebrow">Chrome extension</p>
          <h1>Download AutoTime EU Apply</h1>
          <p>
            Choose the right install path for your situation. Private beta users
            can install manually in Chrome Developer mode. Company admins can
            prepare a managed rollout while Chrome Web Store approval is in
            progress.
          </p>
        </div>

        <div className="extension-distribution-grid">
          <section className="extension-install-steps">
            <p className="eyebrow">Private beta users</p>
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
            <p className="eyebrow">Company admins</p>
            <h2>Managed Chrome rollout</h2>
            <p>
              Use this only when you control your team's Chrome policies through
              Google Workspace, Chrome Enterprise, MDM or domain-managed
              devices.
            </p>
            <div className="extension-download-actions">
              <a
                className="secondary-link"
                download
                href="/dashboard/extension/admin-template"
              >
                Download admin policy template
              </a>
            </div>
            <ol>
              <li>Confirm users are on company-managed Chrome profiles or devices.</li>
              <li>Package a CRX and update manifest for enterprise deployment.</li>
              <li>Host the CRX and update XML on a trusted company-controlled URL.</li>
              <li>Use Chrome ExtensionSettings or ExtensionInstallForcelist policy.</li>
              <li>Test with one managed account before rolling out wider.</li>
            </ol>
            <p>
              The beta zip is not a full enterprise CRX update package. Treat
              this as rollout preparation until the managed CRX or Chrome Web
              Store listing is ready.
            </p>
          </section>
        </div>
      </section>
    </main>
  )
}
