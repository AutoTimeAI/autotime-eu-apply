import type { User } from "@supabase/supabase-js"
import type { SubscriptionPlan } from "./supabase/types"

const defaultTestUserId = "00000000-0000-4000-8000-000000000001"
const defaultTestUserEmail = "agent-browser@autotime.test"
const stableTestTimestamp = "2026-01-01T00:00:00.000Z"

export function isTestAuthEnabled(): boolean {
  return (
    process.env.AUTOTIME_TEST_AUTH_ENABLED === "true" &&
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_AUTOTIME_ENV !== "production" &&
    // VERCEL_ENV is injected automatically by Vercel per-deployment and
    // cannot be misconfigured the way NEXT_PUBLIC_AUTOTIME_ENV can (e.g.
    // set correctly for Production but left unset/wrong for Preview). A
    // misconfigured AUTOTIME_TEST_AUTH_ENABLED flag previously caused
    // /api/sync/dashboard to silently report success without ever
    // writing to the database - this guard makes that impossible on any
    // real Vercel deployment, regardless of other env var mistakes.
    process.env.VERCEL_ENV !== "production"
  )
}

export function getTestAuthUserId(): string {
  return process.env.AUTOTIME_TEST_USER_ID?.trim() || defaultTestUserId
}

export function isTestAuthUserId(userId: string): boolean {
  return isTestAuthEnabled() && userId === getTestAuthUserId()
}

export function getTestAuthPlan(): SubscriptionPlan {
  const plan = process.env.AUTOTIME_TEST_USER_PLAN
  return plan === "pro" ? "pro" : "free"
}

export function getTestAuthUser(): User | null {
  if (!isTestAuthEnabled()) {
    return null
  }

  const email =
    process.env.AUTOTIME_TEST_USER_EMAIL?.trim() || defaultTestUserEmail

  return {
    id: getTestAuthUserId(),
    aud: "authenticated",
    role: "authenticated",
    email,
    email_confirmed_at: stableTestTimestamp,
    phone: "",
    confirmed_at: stableTestTimestamp,
    last_sign_in_at: stableTestTimestamp,
    app_metadata: {
      provider: "test",
      providers: ["test"]
    },
    user_metadata: {
      name: "Agent Browser Test User"
    },
    identities: [],
    created_at: stableTestTimestamp,
    updated_at: stableTestTimestamp,
    is_anonymous: false
  } as User
}
