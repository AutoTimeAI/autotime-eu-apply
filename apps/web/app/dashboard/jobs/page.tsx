/**
 * /dashboard/jobs — main jobs list/workspace. Renders
 * `JobApplicationWorkspace` with view kind "jobs".
 */
import JobApplicationWorkspace from "../../../components/JobApplicationWorkspace";

export default function DashboardJobsPage() {
  return <JobApplicationWorkspace view={{ kind: "jobs" }} />;
}
