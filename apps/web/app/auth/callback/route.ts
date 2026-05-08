import { type NextRequest, NextResponse } from "next/server"
import { sendWelcomeEmail } from "../../../lib/email"
import { createAdminClient } from "../../../lib/supabase/admin"
import { createServerClient } from "../../../lib/supabase/server"

function getErrorRedirect(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/auth/error", request.url))
}

function getSafeRedirectPath(request: NextRequest): string {
  const requestUrl = new URL(request.url)
  const redirectTo = requestUrl.searchParams.get("redirectTo")

  if (!redirectTo?.startsWith("/") || redirectTo.startsWith("//")) {
    return "/dashboard"
  }

  return redirectTo
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
  userId
}: {
  email: string | undefined
  name: string
  userId: string
}): Promise<void> {
  try {
    const isFirstLogin = await ensureFreeSubscription(userId)

    if (isFirstLogin && email) {
      await sendWelcomeEmail(email, name)
    }
  } catch (error: unknown) {
    logAuthCallbackError("first-login-setup", error)
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get("code")

    if (!code) {
      return getErrorRedirect(request)
    }

    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return getErrorRedirect(request)
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return getErrorRedirect(request)
    }

    await runFirstLoginSetup({
      email: user.email,
      name: getMetadataName(user.user_metadata) ?? getFallbackName(user.email),
      userId: user.id
    })

    return NextResponse.redirect(
      new URL(getSafeRedirectPath(request), request.url)
    )
  } catch (error: unknown) {
    if (error instanceof Error) {
      logAuthCallbackError("session-exchange", error)
      return getErrorRedirect(request)
    }

    logAuthCallbackError("unknown", error)
    return getErrorRedirect(request)
  }
}
