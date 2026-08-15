# Core E2E and deploy-smoke report — 15 August 2026

## Existing setup

Playwright 1.60 and a broad Chromium suite already existed under `tests/e2e`. The root project already exposed `test:e2e`; this work extended that setup rather than adding a second framework.

## Added core journeys

`tests/e2e/34-core-journeys.spec.ts` adds four deterministic tests:

1. Fresh onboarding through the CV-upload branch, including confirmation that `onboarding_completed_at` is populated and the completed profile renders as view-only text.
2. The alternative build-new-CV branch, including advance communication and blocking of incomplete export.
3. All six ESCO questionnaire rounds and the explainable “Matched X of Y essential skills / Missing” result format.
4. Add and track a real local-workflow job, automatically tailor the saved CV against its description, verify job-specific summary content, and verify required-field export blocking.

External Supabase and AI calls are intercepted at the browser boundary. This keeps the test deterministic while exercising the actual React UI, state transitions and local tracked-job storage.

## Simplified or deferred assertions

- A CI test-auth identity represents the fresh user; it does not create an OAuth identity at Google or GitHub. External OAuth belongs in provider-specific staging checks.
- Multi-source aggregated listing content remains seed-dependent. Existing jobs tests cover the workflow, while the deploy smoke only requires the browse route to avoid a server error. A staging run should assert two sources when seeded data is present and annotate/skip when it is absent.
- PDF export currently invokes the browser print dialog rather than generating a directly downloadable PDF. Automation asserts that incomplete data disables the action. Text selectability and the print-dialog file are manual items.
- The DOCX action is asserted enabled for a complete CV; download-file integrity should be added separately if export internals become a release gate.
- Outreach, alerts and extension automation remain deliberately out of scope.

## Deploy smoke

`tests/smoke/deploy-smoke.spec.ts` and `playwright.smoke.config.ts` provide `pnpm test:smoke`. One browser context checks:

- homepage;
- login controls;
- authenticated dashboard through deterministic test auth;
- jobs-browse route without a 5xx response;
- `/api/account/me` success;
- no uncaught client-side exceptions.

The smoke project uses isolated port 3100 and a 15-second test timeout. Observed browser-test execution was approximately 7 seconds. A complete isolated local run could not be repeated while another Next.js dev process owned this checkout’s `.next/dev` lock; CI runners start clean.

## CI wiring

- `.github/workflows/unit-tests.yml`: smoke runs on pushes to `main` and pull requests after build/browser installation.
- `.github/workflows/e2e.yml`: full Playwright suite runs on pull requests to `main`, nightly at 02:23 UTC, and manually.
- Both workflows retain Playwright reports for 14 days on failure.

## Verification

- Core journey suite: 4 passed in 11.5 seconds.
- Web TypeScript check: passed.
- Playwright test discovery: passed for core and smoke configurations.
- `git diff --check`: passed.
