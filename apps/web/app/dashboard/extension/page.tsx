const extensionVersion = "0.0.1"

export default function DashboardExtensionPage() {
  return (
    <main className="dashboard-shell">
      <section className="extension-download-panel">
        <div className="section-intro">
          <p className="eyebrow">Chrome extension</p>
          <h1>Download AutoTime EU Apply</h1>
          <p>
            Download the current Chrome MV3 extension package after signing in.
            Install it manually in Chrome developer mode, then connect it to
            this account.
          </p>
        </div>

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

        <section className="extension-install-steps">
          <h2>Install steps</h2>
          <ol>
            <li>Download the extension zip from this page.</li>
            <li>Unzip it on your computer.</li>
            <li>Open Chrome and go to chrome://extensions.</li>
            <li>Turn on Developer mode.</li>
            <li>Click Load unpacked and select the unzipped folder.</li>
            <li>Open the extension Account tab and connect it to AutoTime.</li>
          </ol>
          <p>
            This package is for signed-in AutoTime users while the extension is
            distributed outside the Chrome Web Store.
          </p>
        </section>
      </section>
    </main>
  )
}
