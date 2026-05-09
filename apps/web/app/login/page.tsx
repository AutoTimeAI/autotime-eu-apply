import { redirect } from "next/navigation"
import { LoginContent } from "../../components/LoginContent"
import { createServerClient } from "../../lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const supabase = await createServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return <LoginContent />
}
