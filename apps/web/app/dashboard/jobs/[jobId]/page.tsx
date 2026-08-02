import JobApplicationWorkspace from "../../../../components/JobApplicationWorkspace";

export default async function Page({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <JobApplicationWorkspace view={{ kind: "job", id: jobId }} />;
}
