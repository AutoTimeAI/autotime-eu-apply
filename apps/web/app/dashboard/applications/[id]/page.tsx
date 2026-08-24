/**
 * /dashboard/applications/[id] — single application detail view.
 *
 * Server component that awaits the dynamic `id` route param and renders
 * `JobApplicationWorkspace` with view kind "application", which shows the
 * full detail/workflow for that one tracked application.
 */
import JobApplicationWorkspace from "../../../../components/JobApplicationWorkspace";

/**
 * Resolves the `id` route param and renders the application-detail view of
 * `JobApplicationWorkspace` for it.
 */
export default async function DashboardApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <JobApplicationWorkspace view={{ kind: "application", id }} />;
}
