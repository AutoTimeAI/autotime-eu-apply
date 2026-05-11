"use client"

import { createContext, type ReactNode, useContext, useState } from "react"
import { usePathname } from "next/navigation"
import { createBrowserClient } from "../lib/supabase/client"
import type { SubscriptionPlan } from "../lib/supabase/types"

type DashboardPlanContextValue = {
  plan: SubscriptionPlan
  userId: string
}

type UserNavProps = {
  email: string
  isAdmin?: boolean
  plan: SubscriptionPlan
}

const DashboardPlanContext =
  createContext<DashboardPlanContextValue | null>(null)

export function useDashboardPlan(): DashboardPlanContextValue {
  const context = useContext(DashboardPlanContext)

  if (!context) {
    throw new Error("useDashboardPlan must be used inside DashboardPlanProvider")
  }

  return context
}

export function DashboardPlanProvider({
  children,
  plan,
  userId
}: {
  children: ReactNode
  plan: SubscriptionPlan
  userId: string
}) {
  return (
    <DashboardPlanContext.Provider value={{ plan, userId }}>
      {children}
    </DashboardPlanContext.Provider>
  )
}

function getInitial(email: string): string {
  return email.trim().charAt(0).toUpperCase() || "A"
}

const dashboardTopNavItems = [
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/jobs", label: "Job Check" },
  { href: "/dashboard/applications", label: "Applications" },
  { href: "/dashboard/interview", label: "Interview" },
  { href: "/dashboard/extension", label: "Extension" },
  { href: "/pricing", label: "Pricing" }
]

function isActiveTopNavItem(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function DashboardTopNav() {
  const pathname = usePathname()

  return (
    <nav className="dashboard-topnav" aria-label="Dashboard">
      {dashboardTopNavItems.map((item) => {
        const isActive = isActiveTopNavItem(pathname, item.href)

        return (
          <a
            aria-current={isActive ? "page" : undefined}
            className={isActive ? "active" : undefined}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}

export function UserNav({ email, isAdmin = false, plan }: UserNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const planLabel = plan === "pro" ? "Pro" : "Free"

  const openBillingPortal = async () => {
    try {
      setStatus(null)

      if (plan !== "pro") {
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            returnUrl: `${window.location.origin}/dashboard`
          })
        })
        const payload = (await response.json()) as {
          data: { url: string } | null
          error: string | null
        }

        if (!response.ok || !payload.data) {
          setStatus(payload.error ?? "Checkout is not available yet.")
          return
        }

        window.location.href = payload.data.url
        return
      }

      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: window.location.href })
      })
      const payload = (await response.json()) as {
        data: { url: string } | null
        error: string | null
      }

      if (!response.ok || !payload.data) {
        setStatus(payload.error ?? "Billing portal is not available yet.")
        return
      }

      window.location.href = payload.data.url
    } catch (error: unknown) {
      setStatus(
        error instanceof Error ? error.message : "Billing portal failed."
      )
    }
  }

  const signOut = async () => {
    try {
      setStatus(null)
      const response = await fetch("/auth/signout", { method: "POST" })

      if (!response.ok) {
        const supabase = createBrowserClient()
        const { error } = await supabase.auth.signOut()

        if (error) {
          setStatus(error.message)
          return
        }
      } else {
        const supabase = createBrowserClient()
        await supabase.auth.signOut({ scope: "local" })
      }

      window.location.replace("/login?loggedOut=1")
    } catch (error: unknown) {
      try {
        const supabase = createBrowserClient()
        const { error: signOutError } = await supabase.auth.signOut()

        if (signOutError) {
          setStatus(signOutError.message)
          return
        }

        window.location.replace("/login?loggedOut=1")
        return
      } catch (fallbackError: unknown) {
        setStatus(
          fallbackError instanceof Error
            ? fallbackError.message
            : error instanceof Error
              ? error.message
              : "Sign out failed."
        )
      }
    }
  }

  return (
    <div className="user-nav-shell">
      <button
        aria-expanded={isOpen}
        className="secondary-button user-nav-trigger"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span aria-hidden="true" className="user-avatar">
          {getInitial(email)}
        </span>
        <span className="user-nav-copy">
          <span>{email}</span>
          <strong className={plan === "pro" ? "plan-badge pro" : "plan-badge"}>
            {planLabel}
          </strong>
        </span>
      </button>
      {isOpen ? (
        <div className="user-nav-menu">
          {isAdmin ? (
            <a className="secondary-button" href="/admin">
              Admin panel
            </a>
          ) : null}
          <button
            className="secondary-button"
            type="button"
            onClick={openBillingPortal}
          >
            {plan === "pro" ? "Billing & Plan" : "Upgrade plan"}
          </button>
          <button className="secondary-button" type="button" onClick={signOut}>
            Sign out
          </button>
          {status ? <p className="empty-state">{status}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
