# Private Beta v1 Flaw Closure Report

Last updated: 2026-05-23 23:43:13 +01:00

## Executive Summary

AutoTime EU Apply Private Beta v1 is ready for founder-led early users with
browser E2E verified. The verified local browser suite passes 9 of 9 Playwright
tests, the root build passes after rerunning outside the Windows sandbox file
lock, and the Next.js web build passes after the same file-lock workaround.

Formal UAT with real early users is pending. Production smoke against the live
URL is not passed because `pnpm smoke:web` currently returns `fetch failed`,
including after a network-enabled rerun.

## Known Flaws Found

| Flaw | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Playwright seed helper wiped tracked jobs after navigation | Fixed | `tests/e2e/helpers.ts`, `pnpm test:e2e` 9/9 | Helper now seeds local dashboard state only when the storage key is missing. |
| Local/E2E `/api/sync/profile` fetch noise | Fixed | `apps/web/components/ProfileProtocolLock.tsx`, latest E2E output | Synced profile read is skipped when cloud sync is local-only or not configured. |
| React warning: updating `DashboardTopNav` while rendering `HomePage` | Fixed | `apps/web/components/DashboardExperience.tsx`, latest E2E output | Profile readiness event is dispatched in a microtask after local state is saved. |
| Windows EPERM generated-file lock during build in sandbox | Non-blocking | `pnpm build`, `pnpm build:web` | Sandbox runs fail when unlinking generated `.output`/`.next` files; reruns outside sandbox pass. |
| Production smoke live URL fetch | Non-blocking for founder-led beta; blocking for public launch gate | `pnpm smoke:web` | Live URL fetch still returns `fetch failed`, including after network-enabled rerun. |
| Root-level Sentry wizard files outside active app | Non-blocking if left uncommitted | `git status --short` | Files are not part of active `apps/web` setup and were not committed in the beta milestone. |
| Formal UAT with early users | Pending UAT | `docs/testing/founder-led-uat-plan.md` | Do not claim UAT complete until 3 to 5 early users test the guided flow. |

## How Each Flaw Was Fixed

- Browser persistence: preserved existing localStorage state across route
  transitions in the Playwright seed helper.
- Cloud sync local noise: skipped optional synced profile reads unless cloud
  sync is enabled and public Supabase config exists.
- React render warning: moved readiness event dispatch out of the synchronous
  save path using `queueMicrotask()`.
- Sentry privacy: configured `beforeSend` redaction and added a Sentry privacy
  test for sensitive event fields.
- Sentry test surfaces: `/sentry-test` and `/api/sentry-test` are protected in
  production unless explicitly enabled for the API route.

## What Remains Non-Blocking

- Windows EPERM build file-lock behaviour on generated output folders. Builds
  pass outside the sandbox and this does not indicate application failure.
- Production smoke fetch failure. This should be resolved before a wider public
  launch, but does not block founder-led private beta if the founder manually
  verifies the deployment URL before sessions.
- More deterministic golden tests for EU fit quality and application kit quality.
- Manual Sentry dashboard spot-check during real early-user sessions.

## Sentry Role Assessment

Sentry is ready for beta runtime monitoring:

- Client capture is configured in `apps/web/instrumentation-client.ts`.
- Server and edge capture are configured in `apps/web/sentry.server.config.ts`
  and `apps/web/sentry.edge.config.ts`.
- Environments resolve to `development` or `production`.
- Session Replay is error-only:
  - `replaysSessionSampleRate: 0`
  - `replaysOnErrorSampleRate: 1.0`
- Source maps are configured through `withSentryConfig` in
  `apps/web/next.config.ts`.
- `SENTRY_AUTH_TOKEN` is referenced only in server/build config and is not
  exposed to client code.
- Safe breadcrumbs exist for:
  - `job_import_started`
  - `eu_fit_checked`
  - `application_kit_generated`
  - `waitlist_submitted`
- `beforeSend` redaction covers request data, headers, query string, extra,
  contexts, tags and breadcrumbs.

Dashboard arrival and alert routing still require manual Sentry dashboard
spot-checks after deployment.

## Playwright Role Assessment

Playwright verifies the core Private Beta v1 browser journey:

- Homepage loads.
- Valid fake job import works.
- Empty job import blocks progress.
- EU fit is gated before job import.
- EU fit output appears after job import.
- Application kit generates after saved EU fit.
- Waitlist and feedback actions are available.
- Full happy path completes without visible crash.
- `/sentry-test` route protection is checked.

Latest result: `pnpm test:e2e` passed with 9 passed, 0 failed, 0 skipped.

## UAT Readiness Assessment

Ready for founder-led UAT, not UAT-complete.

Use `docs/testing/founder-led-uat-plan.md` to run 3 to 5 guided early-user
sessions and capture clarity, usefulness, trust, outcome quality and compliance
feedback.

## Production Smoke Status

Not passed.

`pnpm smoke:web` checks `https://autotime-eu-apply.vercel.app` and currently
returns `fetch failed`, including after a network-enabled rerun. Possible causes
include deployment availability, URL mismatch, remote network access, or smoke
marker drift. Do not mark production smoke as passed until the command succeeds
or the deployed URL is manually verified and the script is updated if needed.

## Privacy And Sensitive Data Status

Privacy posture is beta-safe:

- No product analytics or PostHog added.
- No payment/Stripe work added.
- Sentry has `sendDefaultPii: false`.
- Replay masks all inputs, text and media, and records only on error.
- Sentry redaction filters keys containing email, phone, cv, resume,
  jobDescription, description, visa, shareCode, token, cookie, password,
  secret, apiKey, payment, card, authorization and stripe.
- Tests and docs use fake data only.

## Final Beta Verdict

Private Beta v1 - Ready for founder-led early users with browser E2E verified.

Conditions before wider public launch:

- Complete founder-led UAT.
- Resolve or replace the production smoke check.
- Continue Sentry dashboard spot-checks during beta sessions.
- Add more golden outcome-quality tests for EU fit and application kit content.
