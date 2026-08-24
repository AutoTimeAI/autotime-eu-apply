/**
 * /dashboard/settings — account controls hub: plan/billing, sync status,
 * extension connection state, and data controls.
 *
 * Server component (`force-dynamic`). Authenticates via the test-auth user
 * or a Supabase session, redirecting to /login if neither is present. Under
 * test-auth it skips the real database calls entirely and uses fixed
 * zero/empty stand-in values; otherwise it loads the user's plan, remaining
 * AI call allowance, profile save timestamp, tracked-application count, and
 * active extension connection (via the admin Supabase client) in parallel.
 * Renders an overview card grid plus `AccountIdentityLinker` and
 * `SettingsControls` for the actual account/plan controls.
 */
import { redirect } from "next/navigation";
import { AccountIdentityLinker } from "../../../components/AccountIdentityLinker";
import { SettingsControls } from "../../../components/SettingsControls";
import { getRemainingAiCalls, getUserPlan } from "../../../lib/feature-gate";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createServerClient } from "../../../lib/supabase/server";
import { getTestAuthUser } from "../../../lib/test-auth";

export const dynamic = "force-dynamic";

/** Formats an ISO timestamp as "24 Aug 2026, 14:30" (en-GB); returns "Not recorded" when absent. */
function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * Authenticates the user (test-auth user first, then Supabase session;
 * redirects to /login if neither exists), loads plan/usage/sync data
 * (stubbed to empty values in test-auth mode), and renders the settings
 * overview cards alongside `AccountIdentityLinker` and `SettingsControls`.
 */
export default async function DashboardSettingsPage() {
  const testUser = getTestAuthUser();
  let user = testUser;
  if (!user) {
    const supabase = await createServerClient();
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();
    user = sessionUser;
  }

  if (!user) {
    redirect("/login?redirectTo=/dashboard/settings");
  }

  const plan = await getUserPlan(user.id);
  const [remainingCalls, profileResult, applicationsResult, extensionResult] =
    testUser
      ? [
          0,
          { data: null as { updated_at: string } | null },
          { count: 0 },
          {
            data: [] as Array<{
              last_connected_at: string;
              last_synced_at: string | null;
            }>,
          },
        ]
      : await (async () => {
          const admin = createAdminClient();
          return Promise.all([
            getRemainingAiCalls(user.id),
            admin
              .from("profiles")
              .select("updated_at")
              .eq("user_id", user.id)
              .maybeSingle(),
            admin
              .from("applications")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id),
            admin
              .from("extension_connections")
              .select("last_connected_at, last_synced_at, revoked_at")
              .eq("user_id", user.id)
              .is("revoked_at", null)
              .order("last_connected_at", { ascending: false })
              .limit(1),
          ]);
        })();
  const activeExtension = extensionResult.data?.[0];

  return (
    <main className="dashboard-shell">
      <section className="settings-hub-panel">
        <div className="section-intro">
          <p className="eyebrow">Settings</p>
          <h1>Account controls</h1>
          <p>
            Manage account, plan, sync, extension and preferences without
            duplicating the application workflow.
          </p>
        </div>
        <div className="settings-hub-grid settings-overview-grid">
          <article>
            <span>Account</span>
            <strong>{user.email ?? "Signed-in account"}</strong>
            <p>Linked sign-in methods and session controls.</p>
            <a href="#account-controls">Manage account</a>
          </article>
          <article>
            <span>Plan & billing</span>
            <strong>
              {plan === "pro" ? "Pro" : "Free"}
            </strong>
            <p>
              {remainingCalls} AI actions available. Billing is managed through
              Stripe.
            </p>
            <a href="#billing-controls">Manage plan</a>
          </article>
          <article>
            <span>Sync</span>
            <strong>
              {profileResult.data ? "Account profile saved" : "Browser first"}
            </strong>
            <p>
              Last account profile save:{" "}
              {formatDate(profileResult.data?.updated_at)}
            </p>
            <a href="/dashboard/autofill-profile">Profile Evidence</a>
          </article>
          <article>
            <span>Extension</span>
            <strong>{activeExtension ? "Connected" : "Not connected"}</strong>
            <p>
              {activeExtension
                ? `Last sync: ${formatDate(activeExtension.last_synced_at)}`
                : "Install or reconnect from the Extension page."}
            </p>
            <a href="/dashboard/extension">Open extension</a>
          </article>
          <article>
            <span>Data</span>
            <strong>{applicationsResult.count ?? 0} tracked jobs</strong>
            <p>Export browser backup or remove account profile data.</p>
            <a href="#data-controls">Data controls</a>
          </article>
        </div>
      </section>

      <section id="account-controls">
        <AccountIdentityLinker />
      </section>

      <SettingsControls
        email={user.email ?? "account"}
        plan={plan}
        userId={user.id}
      />
    </main>
  );
}
