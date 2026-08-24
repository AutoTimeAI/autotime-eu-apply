/**
 * /dashboard/insights — application performance insights. Renders
 * `DashboardExperience` focused on "insights" with the "applications" tab
 * active, so the user sees analytics/insights framed around their tracked
 * applications.
 */
import DashboardExperience from "../../../components/DashboardExperience"

export default function DashboardInsightsPage() {
  return <DashboardExperience focus="insights" view="applications" />
}
