// "Usage Log" panel: lists AI feature calls (job analysis, content
// generation) with their estimated cost, and a running total. Part of the
// legacy multi-section side panel layout, currently unreached since
// `main.tsx` sets `renderLegacyTools = false`.
import type { Ref } from "react"
import type { AIUsageLogEntry } from "../lib/storage"
import { getStatusClassName } from "./utils"

type UsageLogSectionProps = {
  entries: AIUsageLogEntry[]
  onClear: () => void
  status: string
  statusRef: Ref<HTMLParagraphElement>
}

function formatCost(value: number) {
  return `$${value.toFixed(4)}`
}

/** Renders the AI usage log entries with a total estimated cost, or an empty state, plus a clear-log action. */
export function UsageLogSection({
  entries,
  onClear,
  status,
  statusRef
}: UsageLogSectionProps) {
  const totalCost = entries.reduce(
    (sum, entry) => sum + entry.approximateCostUsd,
    0
  )

  return (
    <section className="panel-section">
      <h2>Usage Log</h2>

      {entries.length > 0 ? (
        <>
          <dl className="profile-summary">
            <div>
              <dt>Total estimated cost</dt>
              <dd>{formatCost(totalCost)}</dd>
            </div>
          </dl>

          <div className="application-list">
            {entries.map((entry) => (
              <article className="application-record" key={entry.id}>
                <h3>{entry.featureName}</h3>
                <dl className="profile-summary">
                  <div>
                    <dt>Timestamp</dt>
                    <dd>{new Date(entry.createdAt).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Model</dt>
                    <dd>{entry.model}</dd>
                  </div>
                  <div>
                    <dt>Estimated cost</dt>
                    <dd>{formatCost(entry.approximateCostUsd)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>

          <button className="danger-button" type="button" onClick={onClear}>
            Clear Usage Log
          </button>
        </>
      ) : (
        <p className="empty-state">No usage logged yet.</p>
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
    </section>
  )
}
