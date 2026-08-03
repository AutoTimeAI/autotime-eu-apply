import DashboardExperience from "../../../components/DashboardExperience";

export default async function DashboardAutofillProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const safeReturnTo =
    returnTo?.startsWith("/dashboard") && !returnTo.startsWith("//")
      ? returnTo
      : null;

  return (
    <>
      {safeReturnTo ? (
        <aside className="contextual-return-panel" aria-label="Return to task">
          <div>
            <strong>Your original task is waiting</strong>
            <p>
              Add the requested information, then return when you are ready.
            </p>
          </div>
          <a className="secondary-button" href={safeReturnTo}>
            Return to task
          </a>
        </aside>
      ) : null}
      <DashboardExperience focus="autofill-profile" view="profile" />
    </>
  );
}
