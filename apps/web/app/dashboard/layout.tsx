/**
 * Root layout for every route under /dashboard.
 *
 * Server component: authenticates the request (test-auth override first,
 * then a real Supabase session) and redirects unauthenticated visitors to
 * /login. A signed-in user who isn't an admin and isn't beta-active is
 * redirected to /waitlist instead of the dashboard. On success it loads
 * the user's plan and admin status and wraps all dashboard page content in
 * `DashboardShell` (the shared nav/chrome).
 * Also pulls in the CSS bundles used across the various dashboard phases
 * (foundations, brand, jobs, applications, interviews, profile, etc).
 */
import "./phase-1-foundations.css";
import "./phase-1-brand.css";
import "./phase-1-home-states.css";
import "./phase-1-system-states.css";
import "./phase-1-touch-targets.css";
import "./phase-1-shell-correction.css";
import "./phase-2-jobs.css";
import "./phase-3-applications.css";
import "./phase-4-interviews.css";
import "./phase-7-profile.css";
import "./pipeline2026-theme.css";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { isAdminUser } from "../../lib/admin-access";
import { isBetaActive } from "../../lib/beta-access";
import { getUserPlan } from "../../lib/feature-gate";
import { createServerClient } from "../../lib/supabase/server";
import { getTestAuthUser } from "../../lib/test-auth";
import { DashboardShell } from "../../components/DashboardShell";

/**
 * Authenticates the current user (test-auth user takes priority over a
 * Supabase session), redirects to /login when neither is present, then
 * loads the user's plan and admin flag and renders `DashboardShell` around
 * `children`. Re-throws any error from the plan/admin lookups after logging
 * it, so the surrounding Next.js error boundary handles the failure.
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const testUser = getTestAuthUser();
  let user = testUser;

  if (!user) {
    const supabase = await createServerClient();
    const {
      data: { user: sessionUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !sessionUser) {
      redirect("/login");
    }

    user = sessionUser;
  }

  let isAdmin: boolean;
  let plan: Awaited<ReturnType<typeof getUserPlan>>;

  try {
    isAdmin = await isAdminUser(user);

    // Admins and the test-auth user must never be blocked by their own
    // beta_access row - an admin's own account getting gated by the same
    // waitlist they're meant to be approving people out of would be a
    // self-inflicted lockout, and the test-auth user has no real
    // beta_access row to check in the first place.
    if (!testUser && !isAdmin && !(await isBetaActive(user.id))) {
      redirect("/waitlist");
    }

    plan = await getUserPlan(user.id);
  } catch (error: unknown) {
    console.error("dashboard_layout_render_failed", {
      userId: user.id,
      reason: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const email = user.email ?? "account";

  return (
    <DashboardShell email={email} isAdmin={isAdmin} plan={plan} userId={user.id}>
      {children}
    </DashboardShell>
  );
}
