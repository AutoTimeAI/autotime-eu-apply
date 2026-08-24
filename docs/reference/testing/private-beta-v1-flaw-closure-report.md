# Private Beta v1 Flaw Closure Report

Last updated: 2026-05-24

## Executive Summary

AutoTime EU Apply Private Beta v1 has completed internal technical readiness
testing, including browser E2E verification. The product is ready for
founder-led early users, but full beta validation is not complete until
Sentry live verification, early-user UAT, and outcome usefulness/trust
validation are completed.

The verified local browser suite passes 9 of 9 Playwright tests, the root build
passes after rerunning outside the Windows sandbox file lock, and the Next.js
web build passes after the same file-lock workaround.

Formal UAT with real early users is pending. Production smoke against the live
URL now passes after the smoke script was updated for the current Private Beta
v1 homepage and Node was run with system CA trust.

## Readiness Percentages

| Scope | Current Percentage | Meaning |
| --- | --- | --- |
| Internal technical readiness | 80-85% complete | Build, web build, browser E2E and Sentry privacy/config checks are verified for private beta. |
| Overall beta validation | 65-70% complete | Production smoke now passes, but real early-user UAT, Sentry dashboard live verification and outcome validation are still pending. |
| Public launch readiness | Not ready yet | Public launch requires production smoke, UAT evidence, live monitoring spot-checks and stronger outcome-quality validation. |

## Readiness Table

| Area | Status | Notes |
| --- | --- | --- |
| Build/web build | Complete | Passed after rerun outside Windows EPERM sandbox file-lock. |
| Browser E2E | Complete, 10/10 passed | Full Playwright browser suite passed with 0 failures, including extension-synced LinkedIn tracked-job reflection. |
| Core beta flow | Complete | Job import -> EU fit -> application kit -> waitlist / feedback is browser verified. |
| Sentry config/privacy tests | Complete for beta | Error-only replay and privacy redaction are configured and tested. |
| Product-level Sentry observability | Partial/basic to moderate | Config, breadcrumbs and test routes exist; live dashboard spot-check remains pending. |
| Production smoke | Complete | `pnpm smoke:web` passed against `https://autotime-eu-apply.vercel.app` on 2026-05-24. |
| Sentry dashboard live spot-check | Pending Manual Evidence | Sentry dashboard/insights are accessible, but live production event verification remains pending until an actual AutoTime EU Apply issue is opened and checked for environment, breadcrumbs, replay, stack trace, and sensitive data. |
| Founder-led UAT | Pending | 3 to 5 selected early users still need guided sessions. |
| Outcome usefulness/trust | Pending real-user validation | Application kit usefulness and EU fit trust need UAT feedback. |
| Public launch readiness | Not ready yet | Private beta readiness does not equal public launch readiness. |

## Known Flaws Found

| Flaw | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Playwright seed helper wiped tracked jobs after navigation | Fixed | `tests/e2e/helpers.ts`, `pnpm test:e2e` 10/10 | Helper now seeds local dashboard state only when the storage key is missing. |
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

Latest result: `pnpm test:e2e` passed with 10 passed, 0 failed, 0 skipped.

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

Private Beta v1 — Founder-led early-user ready with browser E2E and production smoke verified. Full beta validation pending until Sentry live dashboard verification and founder-led UAT are completed.

Conditions before wider public launch:

- Complete founder-led UAT.
- Resolve or replace the production smoke check.
- Continue Sentry dashboard spot-checks during beta sessions.
- Add more golden outcome-quality tests for EU fit and application kit content.
