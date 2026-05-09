const extensionVersion = "0.0.1"

export default function DashboardExtensionPage() {
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
        </div>
      </section>
    </main>
  )
}
