import { redirect } from "next/navigation"
import { AdminLoginContent } from "../../../admin/login/AdminLoginContent"
import { getAdminMembership } from "../../../../lib/admin-authorization"
import { createServerClient } from "../../../../lib/supabase/server"
import { getTestAuthUser } from "../../../../lib/test-auth"

export const dynamic = "force-dynamic"

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> }

// getUnauthenticatedRedirect (proxy-policy.ts) sends an unauthenticated
// admin visiting a deep link (e.g. /admin/users) here as
// /admin/login?redirectTo=/admin/users, so a successful sign-in can return
// them to where they were going instead of always dropping them on the
// generic overview. The previous version of this check had both ternary
// branches return the same literal "/admin", silently discarding that
// value on every login regardless of where the admin actually came from.
// Validate rather than trust it: require a same-origin /admin path with a
// real segment boundary (not just a string prefix - "/admin-evil" would
// otherwise pass a bare startsWith("/admin") check, the same substring-
// bypass class already fixed in ats-detector.ts), and reject a
// backslash anywhere, since browsers normalise a leading "/\" the same as
// "//" when resolving a redirect Location header.
function safeRedirect(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value
  const isSafeAdminPath =
    typeof candidate === "string" &&
    !candidate.includes("\\") &&
    (candidate === "/admin" || candidate.startsWith("/admin/"))
  return isSafeAdminPath ? candidate : "/admin"
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const params = await searchParams
  const redirectTo = safeRedirect(params?.redirectTo)
  const testUser = getTestAuthUser()
  if (testUser && await getAdminMembership(testUser.id)) redirect(redirectTo)

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user && await getAdminMembership(user.id)) redirect(redirectTo)

  return <AdminLoginContent initialStatus={params?.adminDenied || user ? "Admin access only." : null} />
}
