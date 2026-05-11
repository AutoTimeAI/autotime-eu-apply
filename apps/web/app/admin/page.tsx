import { redirect } from "next/navigation"
import { AdminRealtimeConsole } from "./AdminRealtimeConsole"
import { isAdminUser } from "../../lib/admin-access"
import { getAdminOverview } from "../../lib/admin-monitoring"
import { createServerClient } from "../../lib/supabase/server"
import { getTestAuthUser } from "../../lib/test-auth"

export const dynamic = "force-dynamic"

async function getAdminUser() {
  const testUser = getTestAuthUser()

  if (testUser) {
    return testUser
  }

  const supabase = await createServerClient()
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/login?redirectTo=/admin")
  }

  return user
}

export default async function AdminPage() {
  const user = await getAdminUser()

  if (!isAdminUser(user)) {
    redirect("/dashboard")
  }

  return (
    <AdminRealtimeConsole
      adminEmail={user.email ?? "admin"}
      initialOverview={await getAdminOverview()}
    />
  )
}
