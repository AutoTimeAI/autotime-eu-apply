// Public sign-in page at /login. Thin wrapper that renders the shared
// LoginContent component (which handles the actual Supabase auth UI/flow);
// force-dynamic so the page is never statically cached across sessions.
// Server component; no auth required to view it (it's how signed-out users
// get authenticated).
import { LoginContent } from "../../components/LoginContent"

export const dynamic = "force-dynamic"

/** Renders the sign-in page by delegating to the LoginContent component. */
export default function LoginPage() {
  return <LoginContent />
}
