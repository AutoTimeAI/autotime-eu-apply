import { Suspense } from "react"
import ExtensionConnect from "../../../components/ExtensionConnect"

export default function ExtensionConnectPage() {
  return (
    <main className="dashboard-shell">
      <Suspense fallback={null}>
        <ExtensionConnect />
      </Suspense>
    </main>
  )
}
