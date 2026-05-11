import { redirect } from "next/navigation"
import { AdminLoginContent } from "./AdminLoginContent"
import { isAdminUser } from "../../../lib/admin-access"
import { createServerClient } from "../../../lib/supabase/server"
import { getTestAuthUser } from "../../../lib/test-auth"

export const dynamic = "force-dynamic"

type AdminLoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getSafeRedirectPath(redirectTo: string | string[] | undefined) {
  const value = Array.isArray(redirectTo) ? redirectTo[0] : redirectTo

  if (!value?.startsWith("/") || value.startsWith("//")) {
    return "/admin"
  }

  return value.startsWith("/admin") ? value : "/admin"
}

export default async function AdminLoginPage({
  searchParams
}: AdminLoginPageProps) {
  const params = await searchParams
  const redirectTo = getSafeRedirectPath(params?.redirectTo)
  const testUser = getTestAuthUser()

  if (testUser) {
    redirect(isAdminUser(testUser) ? redirectTo : "/dashboard")
  }

  const supabase = await createServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (user && isAdminUser(user)) {
    redirect(redirectTo)
  }

  return (
    <AdminLoginContent
      initialStatus={
        user
          ? "This signed-in account is not listed in AUTOTIME_ADMIN_EMAILS."
          : null
      }
    />
  )
}
