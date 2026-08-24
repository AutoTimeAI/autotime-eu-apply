/**
 * /dashboard/interviews — interview prep/tracking list. Renders
 * `InterviewsWorkspace` with view kind "list".
 */
import InterviewsWorkspace from "../../../components/InterviewsWorkspace";
export default function InterviewsPage() {
  return <InterviewsWorkspace view={{ kind: "list" }} />;
}
