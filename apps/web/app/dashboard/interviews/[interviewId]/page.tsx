/**
 * /dashboard/interviews/[interviewId] — single interview detail/prep view.
 *
 * Server component that awaits the dynamic `interviewId` route param and
 * renders `InterviewsWorkspace` with view kind "detail" for that interview.
 */
import InterviewsWorkspace from "../../../../components/InterviewsWorkspace";

/**
 * Resolves the `interviewId` route param and renders the detail view of
 * `InterviewsWorkspace` for it.
 */
export default async function InterviewPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;
  return <InterviewsWorkspace view={{ kind: "detail", id: interviewId }} />;
}
