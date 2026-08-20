import { type Page, test } from "@playwright/test"

// The known public production origin - used as a fallback so tests that
// don't require authentication (e.g. unauthenticated-redirect checks) can
// still run without QA_SESSION_URL being set.
const KNOWN_PRODUCTION_ORIGIN = "https://autotime-eu-apply.vercel.app"

export function getQaSessionUrl(): string | undefined {
  const value = process.env.QA_SESSION_URL?.trim()
  return value ? value : undefined
}

/**
 * The origin every production spec navigates against. Prefers the origin
 * embedded in QA_SESSION_URL (so authenticated and unauthenticated checks
 * always target the same deployment) and falls back to the known public
 * production URL when only unauthenticated checks are running.
 */
export function getProductionOrigin(): string {
  const qaSessionUrl = getQaSessionUrl()
  if (qaSessionUrl) return new URL(qaSessionUrl).origin
  return process.env.PLAYWRIGHT_PRODUCTION_URL?.trim() || KNOWN_PRODUCTION_ORIGIN
}

export async function gotoProduction(page: Page, path: string) {
  await page.goto(new URL(path, getProductionOrigin()).toString(), {
    waitUntil: "domcontentloaded"
  })
}

/**
 * Bootstraps a real, authenticated production session for the dedicated QA
 * test account (see docs/qa-test-account.md) by visiting the one-time
 * session-bootstrap URL. Skips the test with a clear reason when
 * QA_SESSION_URL isn't set, instead of failing - per the requirement that
 * authenticated production tests degrade gracefully in environments (local
 * dev, external contributor PRs) where the secret is intentionally absent.
 *
 * Never logs, prints, or otherwise surfaces QA_SESSION_URL's value.
 */
export async function bootstrapQaSession(page: Page): Promise<void> {
  const qaSessionUrl = getQaSessionUrl()
  test.skip(
    !qaSessionUrl,
    "QA_SESSION_URL is not set - skipping authenticated production test. " +
      "See docs/quality-assurance.md for how to obtain it."
  )

  const origin = new URL(qaSessionUrl as string).origin
  await page.goto(qaSessionUrl as string, { waitUntil: "domcontentloaded" })
  await page.waitForURL(`${origin}/dashboard`, { timeout: 20_000 })
}
