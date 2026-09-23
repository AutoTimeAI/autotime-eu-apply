/**
 * /dashboard/pipeline — the Kanban board view of the same applications
 * shown as a list at /dashboard/applications.
 *
 * Renders `JobApplicationWorkspace` with view kind "pipeline". Uses the
 * exact same local-first state and `transitionApplication` validation as
 * the list view - dragging a card is just another way to call the same
 * guarded status transition, not a separate write path.
 */
import JobApplicationWorkspace from "../../../components/JobApplicationWorkspace";

export default function DashboardPipelinePage() {
  return <JobApplicationWorkspace view={{ kind: "pipeline" }} />;
}
