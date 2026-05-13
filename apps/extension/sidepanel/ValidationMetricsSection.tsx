import type { ApplicationValidationMetrics } from "../lib/applications"
import { applicationStatuses } from "./constants"
import { MetricReveal } from "./MetricReveal"

type ValidationMetricsSectionProps = {
  metrics: ApplicationValidationMetrics
  onExport: () => void
}

export function ValidationMetricsSection({
  metrics,
  onExport
}: ValidationMetricsSectionProps) {
  return (
    <section className="panel-section">
      <h2>Validation Metrics</h2>

      <div className="application-actions">
        <button type="button" onClick={onExport}>
          Export Validation CSV
        </button>
      </div>

      <dl className="profile-summary">
        <div>
          <dt>Total applications tracked</dt>
          <dd>
            <MetricReveal label="Show total applications tracked">
              {metrics.totalApplications}
            </MetricReveal>
          </dd>
        </div>
        <div>
          <dt>Applications with content snapshots</dt>
          <dd>
            <MetricReveal label="Show content snapshot coverage">
              {metrics.applicationsWithContentSnapshots} (
              {metrics.contentSnapshotCoveragePercent}%)
            </MetricReveal>
          </dd>
        </div>
        <div>
          <dt>Applications with next actions</dt>
          <dd>
            <MetricReveal label="Show next action coverage">
              {metrics.applicationsWithNextActions} (
              {metrics.nextActionCoveragePercent}%)
            </MetricReveal>
          </dd>
        </div>
        <div>
          <dt>Applied/interview/closed applications with notes</dt>
          <dd>
            <MetricReveal label="Show outcome note coverage">
              {metrics.applicationsWithOutcomeNotes} (
              {metrics.outcomeNoteCoveragePercent}%)
            </MetricReveal>
          </dd>
        </div>
      </dl>

      <section className="panel-section">
        <h2>Status Outcomes</h2>
        <dl className="profile-summary">
          {applicationStatuses.map((status) => (
            <div key={status}>
              <dt>{status}</dt>
              <dd>
                <MetricReveal label={`Show ${status} count`}>
                  {metrics.statusCounts[status]}
                </MetricReveal>
              </dd>
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
                <dd>
                  <MetricReveal label={`Show ${sourceCount.source} count`}>
                    {sourceCount.count}
                  </MetricReveal>
                </dd>
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
