import { redirect } from "next/navigation"
import { AdminLoginContent } from "../../../admin/login/AdminLoginContent"
import { getAdminMembership } from "../../../../lib/admin-authorization"
import { createServerClient } from "../../../../lib/supabase/server"
import { getTestAuthUser } from "../../../../lib/test-auth"

export const dynamic = "force-dynamic"

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> }

function safeRedirect(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) === "/admin" ? "/admin" : "/admin"
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
