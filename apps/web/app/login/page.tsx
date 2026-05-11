import { redirect } from "next/navigation"
import { LoginContent } from "../../components/LoginContent"
import { createServerClient } from "../../lib/supabase/server"
import { getTestAuthUser } from "../../lib/test-auth"

export const dynamic = "force-dynamic"

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getSafeRedirectPath(redirectTo: string | string[] | undefined) {
  const value = Array.isArray(redirectTo) ? redirectTo[0] : redirectTo

  if (!value?.startsWith("/") || value.startsWith("//")) {
    return "/dashboard"
  }

  return value
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const redirectTo = getSafeRedirectPath(params?.redirectTo)

  if (getTestAuthUser()) {
    redirect(redirectTo)
  }

  const supabase = await createServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (user) {
    redirect(redirectTo)
  }

  return <LoginContent />
}
