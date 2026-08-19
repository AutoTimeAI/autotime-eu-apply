import { timingSafeEqual } from "node:crypto"
import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "../../../../lib/supabase/admin"
import { createServerClient } from "../../../../lib/supabase/server"

function notFound(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}

function safeEqual(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)

  if (providedBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(providedBuffer, expectedBuffer)
}

async function logBootstrapUse(userId: string, request: NextRequest): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from("operational_logs").insert({
      level: "info",
      area: "qa",
      code: "qa.session.bootstrap.used",
      message: "QA test-account session bootstrap endpoint was used",
      user_id: userId,
      request_method: request.method,
      request_path: "/api/qa/session"
    })
  } catch {
    // Best-effort audit trail only; never block the sign-in on a logging failure.
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const expectedSecret = process.env.QA_SESSION_BOOTSTRAP_SECRET
  const qaUserId = process.env.QA_TEST_ACCOUNT_USER_ID

  if (!expectedSecret || !qaUserId) {
    return notFound()
  }

  const requestUrl = new URL(request.url)
  const providedSecret =
    requestUrl.searchParams.get("secret") ??
    request.headers.get("x-qa-bootstrap-secret")

  if (!providedSecret || !safeEqual(providedSecret, expectedSecret)) {
    return notFound()
  }

  const admin = createAdminClient()
  const { data: userRecord, error: userError } = await admin.auth.admin.getUserById(qaUserId)

  if (userError || !userRecord?.user?.email) {
    return NextResponse.json(
      { error: "QA test account is not configured" },
      { status: 500 }
    )
  }

  if (userRecord.user.app_metadata?.is_test_account !== true) {
    return NextResponse.json(
      { error: "Configured account is not marked as a test account" },
      { status: 500 }
    )
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: userRecord.user.email
  })

  const hashedToken = linkData?.properties?.hashed_token

  if (linkError || !hashedToken) {
    return NextResponse.json(
      { error: "Could not start QA session" },
      { status: 500 }
    )
  }

  const supabase = await createServerClient()
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: hashedToken
  })

  if (verifyError) {
    return NextResponse.json(
      { error: "Could not verify QA session" },
      { status: 500 }
    )
  }

  await logBootstrapUse(qaUserId, request)

  const redirectPath = requestUrl.searchParams.get("redirectTo") ?? "/dashboard"
  const safeRedirectPath = redirectPath.startsWith("/") && !redirectPath.startsWith("//")
    ? redirectPath
    : "/dashboard"

  return NextResponse.redirect(new URL(safeRedirectPath, requestUrl.origin))
}
