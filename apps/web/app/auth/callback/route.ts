// Supabase OAuth/magic-link callback endpoint. This is the redirect target
// Supabase sends the browser to after a user completes sign-in with an
// external provider (or clicks a magic link); it exchanges the returned
// auth code for a session, provisions a free subscription on first login,
// gates redirects into /admin behind an admin-permission check, and then
// forwards the browser to the originally requested page (or /auth/error on
// failure). Server-only route handler; not a page a user navigates to
// directly.
import { type NextRequest, NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"
import { isAdminUser } from "../../../lib/admin-access"
import { sendWelcomeEmail } from "../../../lib/email"
import { isTestAccountUser } from "../../../lib/qa-test-account"
import { createAdminClient } from "../../../lib/supabase/admin"
import { createServerClient } from "../../../lib/supabase/server"

function getErrorRedirect(
  request: NextRequest,
  stage = "unknown",
  message = "Sign-in could not be completed"
): NextResponse {
  const errorUrl = new URL("/auth/error", request.url)
  errorUrl.searchParams.set("stage", stage)
  errorUrl.searchParams.set("message", message.slice(0, 180))

  return NextResponse.redirect(errorUrl)
}

function getSafeRedirectPath(request: NextRequest): string {
  const requestUrl = new URL(request.url)
  const redirectTo = requestUrl.searchParams.get("redirectTo")

  if (!redirectTo?.startsWith("/") || redirectTo.startsWith("//")) {
    return "/dashboard"
  }

  return redirectTo
}

function isAdminRedirect(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/")
}

function getAdminDeniedRedirect(request: NextRequest): NextResponse {
  const deniedUrl = new URL("/admin/login", request.url)
  deniedUrl.searchParams.set("adminDenied", "1")

  return NextResponse.redirect(deniedUrl)
}

function getPostAuthRedirectPath(pathname: string): string {
  return isAdminRedirect(pathname) ? "/admin" : pathname
}

/**
 * Ensures the user has a `subscriptions` row, creating a "free"/"active"
 * one via the admin (service-role) client if none exists yet. Returns true
 * when a new row was inserted (i.e. this is the user's first login), false
 * if a subscription already existed.
 */
async function ensureFreeSubscription(userId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (data) {
      return false
    }

    const { error: insertError } = await supabase.from("subscriptions").insert({
      user_id: userId,
      plan: "free",
      status: "active"
    })

    if (insertError) {
      throw new Error(insertError.message)
    }

    return true
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create free subscription"

    throw new Error(message)
  }
}

function getMetadataName(metadata: unknown): string | null {
  if (typeof metadata !== "object" || metadata === null) {
    return null
  }

  const record = metadata as Record<string, unknown>
  const name = record.name ?? record.full_name ?? record.user_name

  return typeof name === "string" && name.trim() ? name.trim() : null
}

function getFallbackName(email: string | undefined): string {
  if (!email) {
    return "there"
  }

  return email.split("@")[0] || "there"
}

function logAuthCallbackError(stage: string, error: unknown): void {
  console.error("auth_callback_failed", {
    reason: error instanceof Error ? error.message : "Unknown auth callback error",
    stage
  })
}

/**
 * Runs post-sign-in provisioning: creates the user's free subscription if
 * needed and, only on that first login and only for non-QA test accounts,
 * sends the welcome email. Failures are logged but never thrown, so they
 * cannot block the redirect back into the app.
 */
async function runFirstLoginSetup({
  email,
  name,
  userId,
  user
}: {
  email: string | undefined
  name: string
  userId: string
  user: User
}): Promise<void> {
  try {
    const isFirstLogin = await ensureFreeSubscription(userId)

    if (isFirstLogin && email && !isTestAccountUser(user)) {
      await sendWelcomeEmail(email, name)
    }
  } catch (error: unknown) {
    logAuthCallbackError("first-login-setup", error)
  }
}

/**
 * Handles the Supabase OAuth callback redirect. Reads the `code` (or an
 * `error`/`error_description` param) off the URL, exchanges it for a
 * session, resolves the safe post-login redirect path, and — if that path
 * targets /admin — signs the user back out and redirects to /admin/login
 * unless `isAdminUser` grants them the "overview:read" admin permission.
 * Otherwise runs first-login setup and redirects into the app. Any
 * unexpected error redirects to /auth/error with a stage/message pair.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const requestUrl = new URL(request.url)
    const oauthError =
      requestUrl.searchParams.get("error_description") ??
      requestUrl.searchParams.get("error")
    const code = requestUrl.searchParams.get("code")

    if (oauthError) {
      return getErrorRedirect(request, "provider-error", oauthError)
    }

    if (!code) {
      return getErrorRedirect(request, "missing-code", "OAuth code was missing")
    }

    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      logAuthCallbackError("exchange-code", error)
      return getErrorRedirect(request, "exchange-code", error.message)
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      const message = userError?.message ?? "User session was not available"
      logAuthCallbackError("read-user", userError ?? new Error(message))
      return getErrorRedirect(request, "read-user", message)
    }

    const redirectPath = getSafeRedirectPath(request)

    if (isAdminRedirect(redirectPath) && !(await isAdminUser(user))) {
      await supabase.auth.signOut()

      return getAdminDeniedRedirect(request)
    }

    await runFirstLoginSetup({
      email: user.email,
      name: getMetadataName(user.user_metadata) ?? getFallbackName(user.email),
      userId: user.id,
      user
    })

    return NextResponse.redirect(
      new URL(getPostAuthRedirectPath(redirectPath), request.url)
    )
  } catch (error: unknown) {
    if (error instanceof Error) {
      logAuthCallbackError("session-exchange", error)
      return getErrorRedirect(request, "session-exchange", error.message)
    }

    logAuthCallbackError("unknown", error)
    return getErrorRedirect(request)
  }
}
