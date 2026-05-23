# E2E Run Verification Report

Last updated: 2026-05-24

## E2E Setup Status

Implemented and verified.

AutoTime EU Apply Private Beta v1 has completed internal technical readiness
testing, including browser E2E verification. The product is ready for
founder-led early users, but full beta validation is not complete until
Sentry live verification, early-user UAT, and outcome usefulness/trust
validation are completed.

## Readiness Percentages

| Scope | Current Percentage | Meaning |
| --- | --- | --- |
| Internal technical readiness | 80-85% complete | Build, web build, browser E2E and Sentry privacy/config checks are verified for private beta. |
| Overall beta validation | 65-70% complete | Production smoke now passes, but real early-user UAT, Sentry dashboard live verification and outcome validation are still pending. |
| Public launch readiness | Not ready yet | Public launch requires production smoke, UAT evidence, live monitoring spot-checks and stronger outcome-quality validation. |

- `@playwright/test` is installed at the workspace root.
- `playwright.config.ts` exists.
- E2E specs exist in `tests/e2e/`.
- Fake fixtures exist in `tests/fixtures/`.
- Browser artifacts are generated in `test-results/` on failure.
- HTML report is generated in `playwright-report/`.
- `smoke:web` remains separate from the browser E2E suite.

## E2E Run Status

Passed.

The full browser suite ran locally against a Playwright-owned Next.js dev server with fake test auth enabled. The suite verifies the core Private Beta v1 flow:

Job import -> EU fit check -> Save EU fit result -> application kit -> waitlist / feedback.

## Commands Executed

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm build` | Passed with escalation | Root build runs the extension build. The sandbox attempt failed with Windows `EPERM` on generated output, then passed outside the sandbox. |
| `pnpm build:web` | Passed with escalation | Next.js production build, TypeScript, and static page generation completed. The sandbox attempt failed with Windows `EPERM` on `.next`, then passed outside the sandbox. |
| `pnpm test:e2e` | Passed | 9 passed, 0 failed, 0 skipped on the latest rerun. |
| `pnpm smoke:web` | Failed | Live URL fetch returned `fetch failed`, including after network-enabled rerun. This is separate from local browser E2E. |

## Result Summary

- Total browser E2E tests: 9
- Passed: 9
- Failed: 0
- Skipped: 0
- Playwright report: `playwright-report/index.html`
- Failed artifacts: none from the passing run

## Passing Coverage

- Homepage loads.
- Main CTA is visible.
- Job import accepts valid fake job data.
- Empty job import blocks save progress.
- EU fit cannot run before job import.
- EU fit result is visible after job import.
- `Save EU fit result` persists a tracked job into local dashboard state.
- Application kit generates after EU fit is saved.
- Waitlist and feedback actions are present and safe.
- Full private beta flow completes without visible crash.
- `/sentry-test` route behavior is checked for local/prod target mode.

## Persistence Fix Verified

Root cause: the Playwright dashboard seed helper used `page.addInitScript` to write an empty dashboard state into localStorage. Because init scripts run on every navigation, the helper wiped the newly saved tracked job after the EU fit save action navigated to dashboard/application routes.

Fix: `seedReadyDashboardProfile()` now seeds the dashboard only when the dashboard storage key does not already exist. This preserves the tracked job created by `Save EU fit result` during route transitions.

## Additional Runtime Signals

Resolved in the latest passing E2E run:

- Local E2E/dev no longer calls `/api/sync/profile` when cloud sync is local-only or not configured, so the repeated `sync.profile.read.failed` / `TypeError: fetch failed` diagnostics did not reappear.
- `saveState()` now dispatches the profile readiness event in a microtask, so the React warning about updating `DashboardTopNav` while rendering `HomePage` did not reappear.

Production cloud-sync failures are still surfaced by the `/api/sync/profile` route when the endpoint is actually called.

## Final E2E Verdict

Passed.

Private Beta v1 — Founder-led early-user ready with browser E2E and production smoke verified. Full beta validation pending until Sentry live dashboard verification and founder-led UAT are completed.

Production smoke is not marked as passed. The live URL fetch still needs deployment/network verification before a public launch gate.
