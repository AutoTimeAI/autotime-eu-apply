import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { getRemainingAiCalls, getUserPlan } from "../../lib/feature-gate"
import { createServerClient } from "../../lib/supabase/server"
import {
  DashboardPlanProvider,
  UserNav
} from "../../components/UserNav"
import { UpgradeBanner } from "../../components/UpgradeBanner"

export default async function DashboardLayout({
  children
}: {
  children: ReactNode
}) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error || !user) {
      redirect("/login")
    }

    const plan = await getUserPlan(user.id)
    const remainingCalls =
      plan === "free" ? await getRemainingAiCalls(user.id) : 0
    const email = user.email ?? "account"

    return (
      <DashboardPlanProvider plan={plan}>
        <div className="dashboard-app-shell">
          <header className="dashboard-topbar">
            <a className="dashboard-brand" href="/dashboard">
              <span>AutoTime</span>
              <strong>EU Apply</strong>
            </a>
            <nav className="dashboard-topnav" aria-label="Dashboard">
              <a href="/dashboard">Workspace</a>
              <a href="/dashboard/profile">Profile</a>
              <a href="/dashboard/jobs">Job Check</a>
              <a href="/dashboard/applications">Applications</a>
              <a href="/dashboard/interview">Interview</a>
              <a href="/dashboard/extension">Extension</a>
              <a href="/pricing">Pricing</a>
            </nav>
            <UserNav email={email} plan={plan} />
          </header>
          {plan === "free" ? (
            <UpgradeBanner remainingCalls={remainingCalls} />
          ) : null}
          {children}
        </div>
      </DashboardPlanProvider>
    )
  } catch (error: unknown) {
    if (error instanceof Error) {
      redirect("/login")
    }

    redirect("/login")
  }
}
