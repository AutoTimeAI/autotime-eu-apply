import type { ApplicationValidationMetrics } from "../lib/applications"
import { applicationStatuses } from "./constants"

type ValidationMetricsSectionProps = {
  metrics: ApplicationValidationMetrics
}

export function ValidationMetricsSection({
  metrics
}: ValidationMetricsSectionProps) {
  return (
    <section className="panel-section">
      <h2>Validation Metrics</h2>

      <dl className="profile-summary">
        <div>
          <dt>Total applications tracked</dt>
          <dd>{metrics.totalApplications}</dd>
        </div>
        <div>
          <dt>Applications with content snapshots</dt>
          <dd>{metrics.applicationsWithContentSnapshots}</dd>
        </div>
        <div>
          <dt>Applications with next actions</dt>
          <dd>{metrics.applicationsWithNextActions}</dd>
        </div>
      </dl>

      <section className="panel-section">
        <h2>Status Outcomes</h2>
        <dl className="profile-summary">
          {applicationStatuses.map((status) => (
            <div key={status}>
              <dt>{status}</dt>
              <dd>{metrics.statusCounts[status]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="panel-section">
        <h2>Sources</h2>
        {metrics.sourceCounts.length > 0 ? (
          <dl className="profile-summary">
            {metrics.sourceCounts.map((sourceCount) => (
              <div key={sourceCount.source}>
                <dt>{sourceCount.source}</dt>
                <dd>{sourceCount.count}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="empty-state">No sources recorded yet.</p>
        )}
      </section>
    </section>
  )
}
