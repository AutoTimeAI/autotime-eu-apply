// Public sign-in page at /login. Thin wrapper that renders the shared
// LoginContent component (which handles the actual Supabase auth UI/flow);
// force-dynamic so the page is never statically cached across sessions.
// Server component; no auth required to view it (it's how signed-out users
// get authenticated).
import { LoginContent } from "../../components/LoginContent"
import { createServerClient } from "../../lib/supabase/server"

export const dynamic = "force-dynamic"

/** Renders the sign-in page by delegating to the LoginContent component. */
export default async function LoginPage() {
  let hasExistingSession = false
  let identityProviderLabel: string | null = null

  try {
    const supabase = await createServerClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()
    hasExistingSession = Boolean(user)
    const providers = user?.identities?.map((identity) => identity.provider) ?? []
    identityProviderLabel = providers.includes("github")
      ? "GitHub"
      : providers.includes("google")
        ? "Google"
        : null
  } catch {
    // A missing public Supabase configuration must not crash the sign-in UI.
  }

  return (
    <LoginContent
      initialHasExistingSession={hasExistingSession}
      initialIdentityProviderLabel={identityProviderLabel}
    />
  )
}
