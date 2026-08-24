/**
 * Provides the governed feature-flag console, separating read access from the
 * stronger permission required to mutate durable overrides.
 */
import {
  hasAdminPermission,
  requireAdminPageAccess,
} from "../../../lib/admin-authorization"
import { getAdminFeatureFlagsOverview } from "../../../lib/admin-feature-flags"
import { AdminFeatureFlagsGrid } from "./AdminFeatureFlagsGrid"

/** Loads flag state and derives whether the current operator may edit it. */
export default async function Page() {
  const principal = await requireAdminPageAccess("feature_flags:read")
  const canWrite = hasAdminPermission(principal.membership, "feature_flags:write")
  const { defaults, overrides } = await getAdminFeatureFlagsOverview()

  return (
    <main className="operations-admin-page">
      <header className="operations-admin-page-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Feature Flags</h1>
          <p>
            Typed, environment-aware flags. No secrets or arbitrary JSON
            values.
          </p>
        </div>
      </header>
      <section aria-label="Mutation policy" className="operations-admin-grid">
        <article>
          <span>Durable values</span>
          <strong>Live in admin_feature_flags</strong>
        </article>
        <article>
          <span>Production mutation</span>
          <strong>
            {canWrite ? "You hold this permission" : "Explicit permission required"}
          </strong>
        </article>
      </section>
      <AdminFeatureFlagsGrid
        canWrite={canWrite}
        defaults={defaults}
        initialOverrides={overrides}
      />
    </main>
  )
}
