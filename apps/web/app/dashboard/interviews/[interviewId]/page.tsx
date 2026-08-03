import InterviewsWorkspace from "../../../../components/InterviewsWorkspace";
export default async function InterviewPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;
  return <InterviewsWorkspace view={{ kind: "detail", id: interviewId }} />;
}
