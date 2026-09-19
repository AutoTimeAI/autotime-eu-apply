// TEMPORARY, self-contained diagnostic route added 2026-09-19 to test
// whether a session cookie set during a magic-link verify + redirect
// (the exact QA-bootstrap and real-login pattern) actually survives to the
// browser and back, independent of QA_SESSION_BOOTSTRAP_SECRET or the
// Playwright/CI environment. Gated by DIAGNOSTIC_TEMP_SECRET, an env var
// set directly in Vercel (never committed) - no secret value lives in this
// file. DELETE THIS FILE once the investigation concludes.
import { NextResponse, type NextRequest } from "next/server"
import {
  applyPendingCookies,
  createServerClient,
  type PendingCookie,
} from "../../../../lib/supabase/server"
import { createAdminClient } from "../../../../lib/supabase/admin"
import { toPublicApiError } from "../../../../lib/public-api-error"

const QA_USER_ID = "21e880f8-75c8-4a94-8952-5e77bf7e0b89"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const expectedSecret = process.env.DIAGNOSTIC_TEMP_SECRET
  const url = new URL(request.url)

  if (!expectedSecret || url.searchParams.get("secret") !== expectedSecret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const step = url.searchParams.get("step") ?? "bootstrap"

  if (step === "check") {
    const supabase = await createServerClient()
    // Local, no-network parse of whatever session the SDK extracted from
    // the incoming cookie, checked before the network call that fails -
    // to see whether the cookie was even successfully decoded into a
    // session with a real access token, or the SDK silently fell back to
    // having none at all.
    const sessionResult = await supabase.auth.getSession()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    return NextResponse.json({
      step: "check",
      hasUser: Boolean(user),
      userId: user?.id ?? null,
      sessionParsed: Boolean(sessionResult.data.session),
      sessionAccessTokenPreview: sessionResult.data.session?.access_token?.slice(0, 24) ?? null,
      sessionError: sessionResult.error?.message ?? null,
      // Deliberately NOT redacted here (unlike everywhere else in the
      // codebase): this diagnostic-only route is gated by a Vercel-only
      // secret with no client-facing use, and the real getUser() error
      // detail is exactly what this investigation needs to see.
      error: error?.message ?? null,
      errorStatus: error?.status ?? null,
      errorCode: error?.code ?? null,
      incomingCookieNames: request.cookies.getAll().map((c) => c.name),
      incomingCookieValuePreview: request.cookies.get("sb-dorqxmnslzzmrpjbhlcl-auth-token")?.value?.slice(0, 40) ?? null,
    })
  }

  const admin = createAdminClient()
  const { data: userRecord, error: userError } = await admin.auth.admin.getUserById(QA_USER_ID)

  if (userError || !userRecord?.user?.email) {
    return NextResponse.json(
      { error: toPublicApiError("QA account lookup failed", 500) },
      { status: 500 },
    )
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: userRecord.user.email,
  })

  const hashedToken = linkData?.properties?.hashed_token
  if (linkError || !hashedToken) {
    return NextResponse.json(
      { error: toPublicApiError("generateLink failed", 500) },
      { status: 500 },
    )
  }

  const pendingCookies: PendingCookie[] = []
  const supabase = await createServerClient((cookies) => pendingCookies.push(...cookies))
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: hashedToken,
  })

  if (verifyError) {
    return NextResponse.json(
      { error: toPublicApiError("verifyOtp failed", 500) },
      { status: 500 },
    )
  }

  const checkUrl = new URL(request.url)
  checkUrl.searchParams.set("step", "check")

  return applyPendingCookies(NextResponse.redirect(checkUrl), pendingCookies)
}
