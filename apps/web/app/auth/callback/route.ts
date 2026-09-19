import { type NextRequest, NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"
import { isAdminUser } from "../../../lib/admin-access"
import { sendWelcomeEmail } from "../../../lib/email"
import { isTestAccountUser } from "../../../lib/qa-test-account"
import { resolveSafeRedirectPath } from "../../../lib/safe-redirect-path"
import { createAdminClient } from "../../../lib/supabase/admin"
import {
  applyPendingCookies,
  createServerClient,
  type PendingCookie,
} from "../../../lib/supabase/server"

// Every redirect this route returns after createServerClient() is called
// must carry `pendingCookies` via applyPendingCookies - Next.js does not
// reliably merge cookies written through the ambient `cookies()` API onto a
// separately-constructed NextResponse.redirect() in a Route Handler
// (https://github.com/vercel/next.js/discussions/48434). Passing an empty
// array (the common case on an error path, where no session was ever
// established) is a harmless no-op, so every helper below takes it
// unconditionally rather than only on the success path.
function getErrorRedirect(
  request: NextRequest,
  pendingCookies: PendingCookie[],
  stage = "unknown",
  message = "Sign-in could not be completed"
): NextResponse {
  const errorUrl = new URL("/auth/error", request.url)
  errorUrl.searchParams.set("stage", stage)
  errorUrl.searchParams.set("message", message.slice(0, 180))

  return applyPendingCookies(NextResponse.redirect(errorUrl), pendingCookies)
}

function isAdminRedirect(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/")
}

function getAdminDeniedRedirect(
  request: NextRequest,
  pendingCookies: PendingCookie[],
): NextResponse {
  const deniedUrl = new URL("/admin/login", request.url)
  deniedUrl.searchParams.set("adminDenied", "1")

  return applyPendingCookies(NextResponse.redirect(deniedUrl), pendingCookies)
}

function getPostAuthRedirectPath(pathname: string): string {
  return isAdminRedirect(pathname) ? "/admin" : pathname
}

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const pendingCookies: PendingCookie[] = []

  try {
    const requestUrl = new URL(request.url)
    const oauthError =
      requestUrl.searchParams.get("error_description") ??
      requestUrl.searchParams.get("error")
    const code = requestUrl.searchParams.get("code")

    if (oauthError) {
      return getErrorRedirect(request, pendingCookies, "provider-error", oauthError)
    }

    if (!code) {
      return getErrorRedirect(request, pendingCookies, "missing-code", "OAuth code was missing")
    }

    const supabase = await createServerClient((cookies) => pendingCookies.push(...cookies))
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      logAuthCallbackError("exchange-code", error)
      return getErrorRedirect(request, pendingCookies, "exchange-code", error.message)
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      const message = userError?.message ?? "User session was not available"
      logAuthCallbackError("read-user", userError ?? new Error(message))
      return getErrorRedirect(request, pendingCookies, "read-user", message)
    }

    const redirectPath = resolveSafeRedirectPath(requestUrl)

    if (isAdminRedirect(redirectPath) && !(await isAdminUser(user))) {
      await supabase.auth.signOut()

      return getAdminDeniedRedirect(request, pendingCookies)
    }

    await runFirstLoginSetup({
      email: user.email,
      name: getMetadataName(user.user_metadata) ?? getFallbackName(user.email),
      userId: user.id,
      user
    })

    return applyPendingCookies(
      NextResponse.redirect(new URL(getPostAuthRedirectPath(redirectPath), request.url)),
      pendingCookies,
    )
  } catch (error: unknown) {
    if (error instanceof Error) {
      logAuthCallbackError("session-exchange", error)
      return getErrorRedirect(request, pendingCookies, "session-exchange", error.message)
    }

    logAuthCallbackError("unknown", error)
    return getErrorRedirect(request, pendingCookies)
  }
}
