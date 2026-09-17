import { type BrowserContext, type Page, test } from "@playwright/test"

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

// The production auth server's own QA-session route mints a fresh magic
// link (Supabase admin.generateLink + verifyOtp) on every call - a real,
// rate-limited auth-provider operation, not a free local action. Every spec
// file in this directory calls bootstrapQaSession in its own beforeEach, so
// a naive per-call bootstrap means one live OTP mint per test, multiplied
// again by Playwright's CI retries (2 by default) - dozens of calls in a
// single full-suite run. That's plausibly enough to exhaust a production
// auth rate limit outright, which looks indistinguishable from a real
// regression from the outside (every authenticated test fails the same way,
// starting from the very first one) - exactly the failure mode that showed
// up investigating this. Since playwright.config.ts runs this suite with
// workers: 1 (fully sequential, one process), a module-level cache safely
// makes the real bootstrap happen at most once per run: the first call
// performs it for real and captures the resulting cookies, every later call
// just injects those same cookies into its own fresh page context instead
// of minting a new session.
let cachedCookies: Awaited<ReturnType<BrowserContext["cookies"]>> | null = null
let bootstrapPromise: Promise<void> | null = null

/** Test-only escape hatch: drops the cached session so the next bootstrapQaSession call re-authenticates for real, for use right after a test deliberately signs out (which revokes the cached session server-side). */
export function invalidateQaSessionCache(): void {
  cachedCookies = null
  bootstrapPromise = null
}

/**
 * Bootstraps a real, authenticated production session for the dedicated QA
 * test account (see docs/qa-test-account.md). Skips the test with a clear
 * reason when QA_SESSION_URL isn't set, instead of failing - per the
 * requirement that authenticated production tests degrade gracefully in
 * environments (local dev, external contributor PRs) where the secret is
 * intentionally absent.
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

  if (cachedCookies) {
    await page.context().addCookies(cachedCookies)
    await page.goto(`${origin}/dashboard`, { waitUntil: "domcontentloaded" })
    return
  }

  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        await page.goto(qaSessionUrl as string, { waitUntil: "domcontentloaded" })
        await page.waitForURL(`${origin}/dashboard`, { timeout: 20_000 })
        cachedCookies = await page.context().cookies()
      } catch (error) {
        // A failed bootstrap must not be cached as if it succeeded - reset
        // so the next call (this test's own retry, or the next test) gets a
        // real fresh attempt instead of being stuck reusing a rejection.
        bootstrapPromise = null
        throw error
      }
    })()
  }

  await bootstrapPromise
}
