/**
 * /dashboard/autofill-profile — the candidate profile editor used to feed
 * the extension's autofill and AI features with evidence (work history,
 * skills, etc).
 *
 * Server component. Reads an optional `returnTo` search param and, when it
 * is a safe same-app path (starts with "/dashboard", not a protocol-relative
 * "//" URL), shows a banner prompting the user back to the task they came
 * from once they've added the missing profile information. Always renders
 * `DashboardExperience` focused on "autofill-profile" / view "profile".
 */
import DashboardExperience from "../../../components/DashboardExperience";

/**
 * Validates the `returnTo` query param against a same-app allowlist (must
 * start with "/dashboard" and must not be a protocol-relative "//" URL, to
 * avoid open-redirect style links) before showing the "return to task"
 * banner, then renders the autofill-profile focus of `DashboardExperience`.
 */
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
