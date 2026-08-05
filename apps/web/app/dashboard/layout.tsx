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
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { isAdminUser } from "../../lib/admin-access";
import { getUserPlan } from "../../lib/feature-gate";
import { createServerClient } from "../../lib/supabase/server";
import { getTestAuthUser } from "../../lib/test-auth";
import { DashboardShell } from "../../components/DashboardShell";

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

  try {
    const plan = await getUserPlan(user.id);
    const email = user.email ?? "account";
    const isAdmin = await isAdminUser(user);

    return (
      <DashboardShell email={email} isAdmin={isAdmin} plan={plan} userId={user.id}>
        {children}
      </DashboardShell>
    );
  } catch (error: unknown) {
    console.error("dashboard_layout_render_failed", {
      userId: user.id,
      reason: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
