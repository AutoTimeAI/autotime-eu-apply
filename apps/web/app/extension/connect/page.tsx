// /extension/connect page: the handshake screen the browser extension opens
// to link itself to a signed-in web account. Renders the ExtensionConnect
// component, which does the actual token/messaging exchange with the
// extension; this page just supplies the route and a Suspense boundary.
// Server component wrapper around a client component.
import { Suspense } from "react"
import ExtensionConnect from "../../../components/ExtensionConnect"

/** Renders the extension-connect flow inside a Suspense boundary. */
export default function ExtensionConnectPage() {
  return (
    <main className="dashboard-shell">
      <Suspense fallback={null}>
        <ExtensionConnect />
      </Suspense>
    </main>
  )
}
