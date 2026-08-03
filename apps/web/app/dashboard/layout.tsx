import "./phase-1-foundations.css";
import "./phase-1-brand.css";
import "./phase-1-home-states.css";
import "./phase-1-system-states.css";
import "./phase-1-touch-targets.css";
import "./phase-1-shell-correction.css";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { isAdminUser } from "../../lib/admin-access";
import { getUserPlan } from "../../lib/feature-gate";
import { createServerClient } from "../../lib/supabase/server";
import { getTestAuthUser } from "../../lib/test-auth";
import {
  DashboardPlanProvider,
  DashboardWorkflowSidebar,
  UserNav,
} from "../../components/UserNav";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
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

    const plan = await getUserPlan(user.id);
    const email = user.email ?? "account";

    return (
      <DashboardPlanProvider plan={plan} userId={user.id}>
        <div className="dashboard-app-shell">
          <a className="skip-link" href="#dashboard-content">
            Skip to main content
          </a>
          <header className="dashboard-topbar">
            <a className="dashboard-brand" href="/dashboard">
              <span
                aria-hidden="true"
                className="brand-mark phase-one-brand-mark"
              >
                AT
              </span>
              <span className="brand-text">
                <span className="brand-title-line">
                  <span className="brand-name">AutoTime AI</span>
                </span>
                <span className="brand-tagline">
                  Better applications, not more noise.
                </span>
              </span>
            </a>
            <UserNav
              email={email}
              isAdmin={await isAdminUser(user)}
              plan={plan}
            />
          </header>
          <div className="dashboard-body">
            <DashboardWorkflowSidebar />
            <div className="dashboard-main-region" id="dashboard-content">
              {children}
            </div>
          </div>
        </div>
      </DashboardPlanProvider>
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      redirect("/login");
    }

    redirect("/login");
  }
}
