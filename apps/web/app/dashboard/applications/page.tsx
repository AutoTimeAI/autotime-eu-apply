/**
 * /dashboard/applications — the tracked-applications list.
 *
 * Renders `JobApplicationWorkspace` with view kind "applications", which
 * shows the user's tracked job applications and their statuses.
 */
import JobApplicationWorkspace from "../../../components/JobApplicationWorkspace";

export default function DashboardApplicationsPage() {
  return <JobApplicationWorkspace view={{ kind: "applications" }} />;
}
