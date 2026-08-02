import JobApplicationWorkspace from "../../../../components/JobApplicationWorkspace";

export default async function DashboardApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <JobApplicationWorkspace view={{ kind: "application", id }} />;
}
