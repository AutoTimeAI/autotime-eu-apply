"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  DashboardPlanProvider,
  DashboardWorkflowSidebar,
  UserNav,
} from "./UserNav";
import { InactivityLogout } from "./InactivityLogout";
import type { SubscriptionPlan } from "../lib/supabase/types";
import { BrandBackdrop } from "./BrandBackdrop";

const chromeFreePaths = new Set(["/dashboard/onboarding"]);

export function DashboardShell({
  children,
  email,
  isAdmin,
  plan,
  userId,
}: {
  children: ReactNode;
  email: string;
  isAdmin: boolean;
  plan: SubscriptionPlan;
  userId: string;
}) {
  const pathname = usePathname();
  const showChrome = !chromeFreePaths.has(pathname ?? "");

  if (!showChrome) {
    return (
      <DashboardPlanProvider plan={plan} userId={userId}>
        <InactivityLogout />
        <div className="dashboard-brand-stage"><BrandBackdrop />{children}</div>
      </DashboardPlanProvider>
    );
  }

  return (
    <DashboardPlanProvider plan={plan} userId={userId}>
      <InactivityLogout />
      <div className="dashboard-app-shell">
        <BrandBackdrop />
        <a className="skip-link" href="#dashboard-content">
          Skip to main content
        </a>
        <header className="dashboard-topbar">
          <a className="dashboard-brand" href="/dashboard">
            <span aria-hidden="true" className="brand-mark phase-one-brand-mark">
              EU
            </span>
            <span className="brand-text">
              <span className="brand-title-line">
                <span className="brand-name">EU Apply</span>
              </span>
              <span className="brand-tagline">
                Better applications, not more noise.
              </span>
            </span>
          </a>
          <UserNav email={email} isAdmin={isAdmin} plan={plan} />
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
}
