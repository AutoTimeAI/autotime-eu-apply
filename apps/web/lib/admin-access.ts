import type { User } from "@supabase/supabase-js"
import { getServerEnv } from "./env"

function normaliseEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? ""
}

function getAdminEmailSet(): Set<string> {
  return new Set(
    getServerEnv()
      .AUTOTIME_ADMIN_EMAILS.split(",")
      .map((email) => normaliseEmail(email))
      .filter(Boolean)
  )
}

export function isAdminUser(user: User | null): boolean {
  const email = normaliseEmail(user?.email)

  if (!email) {
    return false
  }

  return getAdminEmailSet().has(email)
}
