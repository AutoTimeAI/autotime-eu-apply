import DashboardExperience from "../../../../components/DashboardExperience"

export default async function DashboardApplicationDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <DashboardExperience
      applicationId={id}
      focus="application-tracker"
      view="applications"
    />
  )
}
