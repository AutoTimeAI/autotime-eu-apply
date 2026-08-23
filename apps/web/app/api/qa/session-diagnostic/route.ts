import { NextResponse } from "next/server"

// TEMPORARY diagnostic route added to debug why /api/qa/session was
// returning 404 despite QA_SESSION_BOOTSTRAP_SECRET and
// QA_TEST_ACCOUNT_USER_ID apparently being set in Vercel. Reports only
// presence and length of each env var - never the actual value. Delete
// this route once the /api/qa/session bootstrap flow is confirmed working.
export async function GET(): Promise<NextResponse> {
  const secret = process.env.QA_SESSION_BOOTSTRAP_SECRET
  const userId = process.env.QA_TEST_ACCOUNT_USER_ID

  return NextResponse.json({
    secretPresent: Boolean(secret),
    secretLength: secret?.length ?? 0,
    userIdPresent: Boolean(userId),
    userIdLength: userId?.length ?? 0,
    nodeEnv: process.env.NODE_ENV ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
  })
}
