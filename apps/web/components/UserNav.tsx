"use client"

import { createContext, type ReactNode, useContext, useState } from "react"
import { createBrowserClient } from "../lib/supabase/client"
import type { SubscriptionPlan } from "../lib/supabase/types"

type DashboardPlanContextValue = {
  plan: SubscriptionPlan
}

type UserNavProps = {
  email: string
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
  plan
}: {
  children: ReactNode
  plan: SubscriptionPlan
}) {
  return (
    <DashboardPlanContext.Provider value={{ plan }}>
      {children}
    </DashboardPlanContext.Provider>
  )
}

function getInitial(email: string): string {
  return email.trim().charAt(0).toUpperCase() || "A"
}

export function UserNav({ email, plan }: UserNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const planLabel = plan === "pro" ? "Pro" : "Free"

  const openBillingPortal = async () => {
    try {
      setStatus(null)
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
      const supabase = createBrowserClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        setStatus(error.message)
        return
      }

      window.location.href = "/login"
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Sign out failed.")
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
          <button
            className="secondary-button"
            type="button"
            onClick={openBillingPortal}
          >
            Billing &amp; Plan
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
