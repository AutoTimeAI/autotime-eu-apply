/**
 * /dashboard/jobs/[jobId] — single job detail view (fit review, apply
 * actions, etc).
 *
 * Server component that awaits the dynamic `jobId` route param and renders
 * `JobApplicationWorkspace` with view kind "job" for that job.
 */
import JobApplicationWorkspace from "../../../../components/JobApplicationWorkspace";

/**
 * Resolves the `jobId` route param and renders the job-detail view of
 * `JobApplicationWorkspace` for it.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <JobApplicationWorkspace view={{ kind: "job", id: jobId }} />;
}
