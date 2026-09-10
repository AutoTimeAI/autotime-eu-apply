# EU Apply 360-degree QA and defect assessment

**Date:** 9 September 2026  
**Repository HEAD:** `1dbbc341`  
**Mode:** Verification and diagnosis only; no product defects were fixed  
**Scope:** Build, static checks, unit/security tests, browser journeys, public routes, API protection, extension build, Python analytics, configuration, release gates, observability signals and repository/test operations.

## Executive result

The primary TypeScript product is healthy enough for continued controlled beta testing. Compilation, type checking, extension packaging, the full unit/security suite, focused authenticated journeys and public smoke cases passed.

The repository is **not release-ready from this workstation**. A broken Python validation runner, missing release evidence, incomplete local integrations, disk exhaustion, and Playwright teardown hangs prevent a clean, reproducible 360-degree certification. The full 127-case browser run was stopped after the environment ran out of disk space; results after that boundary would not have been trustworthy.

### Defect summary

| Severity | Count | Meaning |
| --- | ---: | --- |
| Critical / S0 | 0 | Confirmed production outage, data loss or exploitable security failure |
| High / S1 | 4 | Release blocker, broken validation path or environment failure affecting core confidence |
| Medium / S2 | 5 | Significant reliability, security-hardening, developer-experience or coverage weakness |
| Low / S3 | 2 | Maintenance/noise issue without current functional impact |

The four S1 findings include two product-delivery defects and two explicit readiness blockers. They do not establish that the deployed product is down.

## Severity definitions

| Level | Definition |
| --- | --- |
| S0 Critical | Active security exposure, unrecoverable data loss, billing corruption, or broad production outage |
| S1 High | Blocks a release/certification path, prevents a major workflow, or substantially invalidates quality evidence |
| S2 Medium | Degrades reliability, maintainability or a secondary workflow; workaround exists |
| S3 Low | Warning, noise, minor inconsistency or future maintenance risk |

## Findings

### QA-001 — Python MVP validation runner cannot start

- **Severity:** S1 High
- **Area:** Test infrastructure / release validation
- **Status:** Confirmed, deterministic
- **Command:** `pnpm test:mvp:python`
- **Actual result:** Python raises `SyntaxError: from __future__ imports must occur at the beginning of the file` at line 18.
- **Cause:** `scripts/autotime_mvp_test_runner.py` has one string literal on line 2 and a second standalone triple-quoted string beginning on line 3. Only the first is the module docstring, so the second is an executable statement before `from __future__ import annotations`.
- **Impact:** The documented Python MVP validation command is completely unusable. Any release process relying on it cannot complete.
- **Recommendation:** Merge the two introductory strings into one module docstring or move the future import immediately after the single valid docstring. Add `python -m py_compile scripts/autotime_mvp_test_runner.py` to a fast CI gate.

### QA-002 — Test environment exhausted disk during the full browser suite

- **Severity:** S1 High for certification environment; potentially S0 if reproduced on production infrastructure
- **Area:** Environment / operational resilience
- **Status:** Confirmed during test 15 of the full run
- **Evidence:** Turbopack reported `There is not enough space on the disk. (os error 112)` while writing `.next/dev/cache/...sst`, disabled persistence, and the server subsequently logged two severe `/api/account/settings` failures with `TypeError: fetch failed` and HTTP 500.
- **Impact:** The 127-case suite could not be completed reliably. Disk pressure can cause misleading application errors and corrupt or incomplete build/test artifacts.
- **Contributing repository condition:** Multiple preview/remediation trees, a quarantined dependency tree, local package stores, `.next` caches, Playwright output, screenshots and test evidence occupy the same workspace volume.
- **Recommendation:** Recover space only after classifying user-owned directories. Move worktrees/caches outside the canonical repo, add free-space preflight to long test/build jobs, apply CI artifact expiry and alert on production storage saturation.

### QA-003 — Market-readiness gate has no current founder-validation report

- **Severity:** S1 High release blocker; not a product-code defect
- **Area:** Release governance
- **Status:** Confirmed
- **Command:** `pnpm market:ready:gate`
- **Actual result:** `Market-ready gate failed: No founder validation report found. Run pnpm validation:new first.`
- **Impact:** A market/public release cannot be certified from the current evidence set.
- **Recommendation:** Generate a new report only when a real validation cycle is starting, complete its manual evidence sections, and rerun the gate. Do not manufacture a passing artifact solely to clear CI.

### QA-004 — Local integration configuration is invalid/incomplete

- **Severity:** S1 High for end-to-end integration testing; expected limitation for offline-only work
- **Area:** Environment / external services
- **Status:** Confirmed
- **Command:** `pnpm env:doctor:local`
- **Failures:** Placeholder Stripe publishable/secret/webhook/monthly-price values, placeholder OpenAI and Resend keys, missing Stripe quarterly/credit-pack IDs, missing analytics internal secret, and absent PostHog configuration.
- **Impact:** Real AI generation, payment, email and analytics paths cannot be certified locally. Static mocks and boundary tests do not replace integration verification.
- **Recommendation:** Create a dedicated non-production integration environment with scoped test credentials. Keep offline placeholders for isolated tests, but label that mode explicitly and prevent it from being mistaken for integration-ready.

### QA-005 — Playwright completes cases but does not terminate cleanly

- **Severity:** S2 Medium
- **Area:** Test runner / CI reliability
- **Status:** Reproduced in both focused core and smoke suites
- **Evidence:** All 4 core cases and all 3 smoke cases reported `ok`, after which the process remained alive with no output until manually interrupted. The managed Next.js listener could remain on port 3000 and caused later runs to fail with `http://localhost:3000 is already used`.
- **Impact:** CI can time out after successful tests, report a false failure, consume resources and block subsequent jobs.
- **Recommendation:** Identify the open handle/process tree, ensure Playwright's web server is terminated on completion, and add a small CI regression test that asserts the suite exits with code 0 within a bounded period.

### QA-006 — Billing UI readiness disagrees with the environment doctor

- **Severity:** S2 Medium in local/preview environments
- **Area:** Configuration validation / pricing UX
- **Status:** Confirmed locally; production deployment protection reduces production likelihood
- **Evidence:** The environment doctor rejects placeholder/missing Stripe configuration, but `/pricing` rendered enabled `Start Pro`, `Choose quarterly`, and `Buy 25 credits` controls. `getStripePriceEnv` validates only non-empty monthly values and supplies lookup-key fallbacks for quarterly/credits; non-empty placeholder secrets also satisfy the page's readiness check.
- **Impact:** Developers/testers can see actionable billing controls in an environment that cannot complete checkout. This creates false confidence and confusing failures after authentication.
- **Recommendation:** Use one shared semantic validator for environment doctor, pricing availability and checkout. Treat recognized placeholder patterns as unavailable outside explicit mocked-test mode.

### QA-007 — Browser E2E does not prove the live database path

- **Severity:** S2 Medium coverage gap
- **Area:** Integration testing
- **Status:** Confirmed by server output
- **Evidence:** Authenticated browser tests repeatedly log that `AUTOTIME_TEST_AUTH_ENABLED` short-circuits `/api/sync/dashboard` and `/api/outreach`, returning empty data without database reads.
- **Impact:** The suite proves navigation, presentation and mocked workflow contracts, but not cookies/auth → API → RLS → Supabase → response for these flows.
- **Recommendation:** Retain fast bypass tests, and add a smaller integration suite against an isolated Supabase project that creates two users, exercises writes/reads/deletes, and proves cross-user isolation and cleanup.

### QA-008 — Test output overwrites tracked screenshot evidence

- **Severity:** S2 Medium repository hygiene
- **Area:** Test artifacts
- **Status:** Confirmed
- **Evidence:** Browser execution modified tracked files under `screenshots/international-*` and `screenshots/phase-3b-1/*`, plus regenerated `apps/web/next-env.d.ts`.
- **Impact:** Routine verification dirties the worktree and can overwrite historical evidence, complicating review and making accidental commits more likely.
- **Recommendation:** Write run artifacts to an ignored timestamped directory, upload them in CI with retention, and update canonical screenshots only through an explicit approval command.

### QA-009 — Next.js Edge Runtime deprecation warning

- **Severity:** S3 Low
- **Area:** Framework maintenance
- **Status:** Confirmed during production build
- **Evidence:** Next.js 16.3.1 reports that the Edge Runtime is deprecated and recommends Node.js runtime.
- **Impact:** No current build failure, but a future upgrade can turn this into migration work or a deployment break.
- **Recommendation:** Identify the route using Edge runtime, document why, and schedule migration/compatibility verification before the next major Next.js upgrade.

### QA-010 — Conflicting color environment flags produce noisy runner warnings

- **Severity:** S3 Low
- **Area:** Test logs
- **Status:** Confirmed repeatedly
- **Evidence:** Node warns that `NO_COLOR` is ignored because `FORCE_COLOR` is set.
- **Impact:** Adds noise and makes real warnings easier to miss.
- **Recommendation:** Set only one color policy in the test/web-server environment.

### QA-011 — API routes expose internal exception details to clients

- **Severity:** S2 Medium security-hardening issue
- **Area:** API error handling / information disclosure
- **Status:** Confirmed by static route review
- **Evidence:** Multiple handlers return raw `error.message` values in response bodies. Representative paths include profile-photo upload, account deletion/settings, outreach, ESCO questionnaire/matches/scoring, GitHub CV enrichment, and several AI routes. `diagnosticJson` records and returns the supplied error unchanged; it does not replace internal messages with a public-safe message.
- **Impact:** Authenticated users can receive storage, database, provider, or implementation-specific errors. These may expose schema names, dependency/provider behavior, identifiers or operational detail useful for reconnaissance. CV parser messages are currently intentionally user-readable, but unexpected library errors pass through the same path.
- **Recommendation:** Separate public errors from diagnostic detail. Return stable user-safe messages and machine-readable error codes, while logging sanitized internal exceptions against the diagnostic ID. Preserve explicit validation, feature-gate and rate-limit messages through an allowlist. Add route tests that inject provider/database failures and assert that secrets, SQL/schema details, URLs and stack fragments never appear in responses.

## Boundary verification

| Story/boundary | Result | Evidence and limitation |
| --- | --- | --- |
| Public landing UI | Pass | Production build served meaningful content; no error overlay; annotated screenshot captured. |
| Public pricing UI | Conditional | Page renders, but billing controls appear actionable under invalid local Stripe configuration (QA-006). |
| Compatibility UI | Pass | 38 platform rows, capability-specific status, dates, limitations and reporting form rendered. |
| Login UI | Pass/limited | Consent gate and provider controls render; real OAuth was not attempted. |
| Privacy/terms | Pass | Public pages return 200 and privacy sections render. |
| Protected dashboard/admin pages | Pass | Anonymous requests redirect; authenticated non-admin enforcement is covered by automated tests, not freshly completed in the interrupted full run. |
| Protected account/sync APIs | Pass | Anonymous `/api/account/me` and `/api/sync/dashboard` returned 401. |
| Security headers | Pass | CSP, frame denial, content-type protection, referrer, permissions, COOP and CORP headers observed. |
| Onboarding | Pass under test auth | Upload-CV and build-new-CV branches passed in Chromium. Live persistence remains separately unverified. |
| ESCO questionnaire | Pass under test auth | Explainable skill-overlap journey passed. |
| Job-linked tailoring/export guards | Pass under test auth | Required fields blocked export and tailoring used the tracked job. |
| Mobility UI and local reconciliation | Partial pass | First 16 full-suite cases progressed through desktop/mobile, consent, conflicts, deletion and offline behavior before disk exhaustion. |
| Web production build | Pass with warning | 73 routes generated; Edge Runtime deprecation recorded as QA-009. |
| Extension production build | Pass | Chrome MV3 package built, 209.19 kB. Real unpacked-extension/manual ATS run was not performed. |
| Typecheck and lint | Pass | All workspace TypeScript projects completed. |
| Unit/security suite | Pass | Full `pnpm test:unit` passed, including AI quality 10/10 and the declared 95% automation mapping gate. |
| Python analytics service | Pass | Direct `python -m pytest apps/analytics/tests -q`: 5 passed. |
| Python MVP orchestrator | Fail | Cannot parse; QA-001. |
| Market-ready evidence | Fail | No current founder-validation report; QA-003. |
| Full 127-case E2E | Inconclusive | Stopped after disk exhaustion; do not report as passed or failed product-wide. |
| Live OpenAI, Stripe, Resend, PostHog | Not tested | Local environment is intentionally placeholder/incomplete; QA-004. |
| Live Supabase RLS/data round trip | Not freshly proven | Test-auth bypass avoids database access; QA-007. |
| Production deployment | Not tested in this run | This assessment did not inspect live Vercel/Sentry/Stripe dashboards. |

## Confirmed strengths

- The TypeScript codebase compiles and all workspace type checks pass.
- The Chrome extension builds successfully.
- The Next.js production build completes and enumerates 73 routes.
- Unit, security-hardening, environment-boundary, sync, privacy, redirect, SSRF, image-signature, DOCX sanitization and AI-quality tests pass.
- Direct Python analytics tests pass independently of the broken orchestration script.
- Public routes load with meaningful accessible structure on desktop; compatibility smoke also passed on mobile.
- Anonymous account and sync API access is rejected.
- The product exposes strong browser security headers.
- Upload boundaries include MIME/signature checks for profile images and decompression limits for DOCX files.
- Focused authenticated core journeys pass under the documented test-auth mode.
- The compatibility matrix accurately distinguishes capture, autofill and native feed.

## Coverage gaps and untested risk

These are not confirmed bugs, but they prevent a true production-wide assurance statement:

- Real OAuth provider login and callback behavior
- Real Supabase persistence, RLS and account deletion during this run
- Live Stripe checkout, portal, webhook, refund/dispute and credit settlement
- Live OpenAI output quality, timeout and cost settlement
- Real Resend delivery and alert handling
- Live Sentry ingestion, alert delivery, source maps and redaction inspection
- Installed Chrome extension across real ATS forms and navigation redirects
- Job-feed freshness, rate limits and production scheduler execution
- Backup restoration and recovery-time evidence
- Load, soak and concurrency testing under production-like dependencies
- Screen-reader/manual keyboard validation beyond automated browser assertions
- Cross-browser extension and responsive coverage beyond Chromium
- Independent penetration test and legal/privacy assessment
- Cross-site mutation/CSRF verification for every cookie-authenticated state-changing route; same-origin checks are explicit on admin and workflow-event routes but are not uniformly visible across all mutations
- Real-user usefulness, trust and interview outcomes

## Remediation order

1. **Restore a stable test environment:** classify and remove/move only approved caches/worktrees/artifacts, enforce free-space preflight.
2. **Repair the Python MVP runner** and add a syntax/compile CI check.
3. **Fix Playwright teardown** so passing suites exit cleanly and release usable status codes.
4. **Create a real founder-validation run** and complete, rather than bypass, the market-ready evidence gate.
5. **Unify configuration validation** so pricing cannot look enabled when environment doctor rejects billing settings.
6. **Standardize safe API errors** so internal provider/database exceptions are logged but never returned to clients.
7. **Provision an isolated integration environment** for real Supabase, Stripe-test, OpenAI-budgeted, Resend and telemetry flows.
8. **Rerun all 127 browser cases** from a clean environment and retain the final report.
9. **Run manual unpacked-extension and accessibility checks**, then complete production observability/payment/email verification.

## Release recommendation

- **Controlled founder-led beta:** CONDITIONAL GO after the disk condition is corrected; currently tested TypeScript workflows are healthy.
- **Wider unattended beta:** NO-GO until QA-001, QA-002 and QA-005 are resolved and the full suite exits cleanly.
- **Public launch:** NO-GO until all S1 items and the production coverage gaps named above have verified evidence.

## Commands and evidence summary

| Command/check | Result |
| --- | --- |
| `pnpm test:unit` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm lint` | Pass |
| `pnpm build:extension` | Pass |
| `pnpm build:web` | Pass with deprecation warning |
| `python -m pytest apps/analytics/tests -q` | Pass, 5 tests |
| `pnpm test:mvp:python` | Fail, syntax error |
| `pnpm env:doctor:local` | Fail, placeholders/missing integrations |
| `pnpm market:ready:gate` | Fail, no current validation report |
| `pnpm test:e2e:core` | 4/4 cases passed; runner teardown hung |
| `pnpm test:smoke` | 3/3 cases passed; runner teardown hung |
| Full Playwright suite | Interrupted after disk exhaustion; 16 cases completed and case 17 had begun |
| Public route/API probes | Expected 200/307/401/404 responses observed |
| Browser visual inspection | Landing, pricing, compatibility, login and privacy rendered |

The automated “95% coverage” result describes the planned automation/manual distribution. It must not be interpreted as 95% of the live product passing this run, particularly while the Python orchestration and full browser certification are incomplete.
