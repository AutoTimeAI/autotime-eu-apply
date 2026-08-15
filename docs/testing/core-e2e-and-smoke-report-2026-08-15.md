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

## Clean GitHub Actions confirmation

Confirmed on draft PR [#23](https://github.com/AutoTimeAI/autotime-eu-apply/pull/23), using clean Ubuntu runners rather than a local simulation.

### Deploy smoke

- Successful run: [CI run 31909445740](https://github.com/AutoTimeAI/autotime-eu-apply/actions/runs/31909445740).
- Result: 1 passed, 0 skipped.
- Playwright process time: 22.6 seconds; browser test time: 13.4 seconds. This meets the under-60-second target.
- The combined test executed homepage, login controls, authenticated dashboard/onboarding gate, jobs route response, authenticated `/api/account/me`, and the final uncaught-client-error assertion.
- No port-lock or web-server startup failure occurred.

The first clean attempt failed honestly: a fresh authenticated user is redirected into onboarding, whose dashboard wrapper is not a `<main>`. The test was corrected to assert the authenticated dashboard/onboarding shell and URL. HTML reporting was also enabled so future smoke failures upload useful evidence.

### Journey A–C workflow

- Successful run: [Full end-to-end run 31909726054](https://github.com/AutoTimeAI/autotime-eu-apply/actions/runs/31909726054).
- Trigger: pull request; the same workflow also declares nightly cron and manual dispatch triggers.
- Result: 4 passed, 0 skipped in 31.6 seconds of Playwright time.
- Individual clean-runner results: onboarding upload 6.2s; build-new-CV branch 4.9s; ESCO explainability 3.7s; tracked-job tailoring/export blocking 4.1s.
- Total job time including checkout, dependency install and Chromium provisioning: 1m14s.

The initial workflow command invoked every historical Playwright test rather than the requested A–C regression suite. It was corrected to use the explicit `test:e2e:core` script; superseded broad-suite runs were cancelled.

### Remaining warning

Both workflows log a non-failing Next.js LCP warning for `/brand/autotime-mark.png`. It does not invalidate the smoke or functional results, but should remain tracked as perceived-performance debt until the eager-loading source change is included in a product commit.
