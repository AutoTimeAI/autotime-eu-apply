# AutoTime 670 Test Plan Alignment

Last updated: 2026-05-24

## Source Artifact

Local planning file:

`C:\Users\rajan\Downloads\autotime_670_test_plan.html`

The file is a standalone QA planning artifact, not an executable test runner.
It currently contains 564 case definitions across Smoke, Auth, Job import, EU
fit check, Save & track, Dashboard, Application kit, Waitlist, E2E flows,
Privacy, Security, Performance, Accessibility, Cross-browser, API, Navigation,
and Error handling.

## Current Executable Evidence

- `pnpm test:e2e` passed 10/10 on 2026-05-24.
- The suite now includes
  `tests/e2e/08-extension-linkedin-sync.spec.ts`, which verifies a controlled
  extension-synced LinkedIn job appears in Tracked Jobs within seconds and
  survives refresh.
- `pnpm --filter extension test` passed and covers LinkedIn parsing,
  canonical LinkedIn URLs, duplicate handling, local sync state, and dashboard
  merge behaviour.
- `pnpm test:web:cloud-sync` passed for web cloud-sync readiness and safety
  checks.

## Important Alignment Notes

The 564-case artifact is useful as a future QA inventory, but several cases do
not match the current Private Beta v1 implementation and should not be counted
as failed product behaviour yet:

- It references `/api/health`; the current app uses
  `/api/diagnostics/health`.
- It references `/signup`; the current app routes through the existing login
  and auth callback flow.
- It assumes dashboard persistence is always server/Supabase-only; the current
  local E2E beta flow intentionally uses fake test auth and local dashboard
  state.
- It includes payment, rate limiting, GDPR automation, full production
  Supabase/RLS, and broad public-launch checks that are outside the Private
  Beta v1 gate.
- It includes Sentry live dashboard checks that remain manual pending evidence.

## Fix Applied After Review

Added a focused automated E2E test for the highest-risk user concern raised
during this session:

`tests/e2e/08-extension-linkedin-sync.spec.ts`

This verifies:

- LinkedIn extension-style tracked job data appears in `/dashboard/applications`.
- Role title, company, source, canonical LinkedIn URL, and parsed location notes
  are preserved.
- The empty tracked-job state disappears.
- The job remains visible after refresh.
- The dashboard reflection completes within 5 seconds.

## Next Conversion Candidates

Convert the 564-case planning artifact into repo-backed tests incrementally,
starting with the cases that match Private Beta v1:

1. Extension LinkedIn parse fixture with title, company, location, URL, and
   description.
2. Extension Track Job duplicate prevention.
3. Extension connected sync success and failed-sync retry state.
4. Dashboard tracked-job status update persistence.
5. Dashboard tracked-job delete persistence.
6. Application kit generated from extension-synced job.
7. Privacy assertions for Sentry payloads and breadcrumbs.
8. Production smoke for `/api/diagnostics/health`, not `/api/health`.

## Current Decision

Do not mark the full 564-case artifact as passed or failed. Treat it as a QA
backlog and planning checklist. The current executable gate is the repo test
suite, with browser E2E now passing 10/10.
