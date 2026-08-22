# Quality assurance

A map of every automated QA tool in this repo: what it checks, what's free,
how to run it locally, what CI does with it, and how to investigate a
failure. Written alongside the branch that introduced most of this
(`feature/qa-automation-system`) - if a tool described here doesn't match
what you find in the repo, trust the repo and treat this doc as stale.

## Contents

- [What each tool validates](#what-each-tool-validates)
- [Free vs paid](#free-vs-paid)
- [Local commands](#local-commands)
- [How QA authentication works safely](#how-qa-authentication-works-safely)
- [Required GitHub secrets](#required-github-secrets)
- [CI schedules](#ci-schedules)
- [Investigating failures](#investigating-failures)
- [Updating visual regression baselines](#updating-visual-regression-baselines)
- [Running ZAP and k6 safely](#running-zap-and-k6-safely)
- [Privacy and data-cleanup requirements](#privacy-and-data-cleanup-requirements)
- [Pre-release validation - 2026-08-21](#pre-release-validation---2026-08-21)
- [Known gaps](#known-gaps)

## What each tool validates

| Tool | Validates | Where |
|---|---|---|
| `pnpm test:unit` | Business logic, storage, decision engine, migrations, privacy redaction, AI-eval mocks | `scripts/*.test.mjs`, `apps/web/tests/*.test.mjs` |
| Playwright (local-fixture) | Full functional workflows against a local dev server with mocked auth/data | `tests/e2e/*.spec.ts` |
| Playwright (production) | Real production behaviour: auth, navigation, rendering, seeded-data display, error/empty states - deliberately **read-mostly** | `tests/e2e/production/*.spec.ts` |
| axe-core | WCAG-style accessibility violations on key pages/states | `tests/e2e/helpers/axe.ts`, wired into 11 states |
| Playwright screenshot comparison | Visual regressions on principal desktop/mobile states | `tests/e2e/visual/key-states.spec.ts` |
| Lighthouse CI | Performance/accessibility/best-practices/SEO budgets | `lighthouserc.json`, `scripts/lighthouse-dashboard.mjs` |
| CodeQL | Static security analysis (JS/TS) | `.github/workflows/codeql.yml` |
| Dependency review | New/changed dependencies with known high-severity advisories | `.github/workflows/dependency-review.yml` |
| OWASP ZAP baseline | Passive web-security scan of production (headers, cookies, common misconfig) | `.github/workflows/zap-baseline.yml` |
| GitHub secret scanning | Committed secrets | Repo Settings toggle - no workflow |
| k6 | Response time/error rate under light synthetic load, public pages only | `k6/smoke.js`, `k6/load.js` |
| Checkly | Ongoing production availability/auth/critical-journey monitoring (config only - not deployed) | `checkly.config.ts`, `__checks__/` |
| Sentry | Runtime error capture, with PII/secret redaction | `apps/web/lib/sentry-privacy.ts` |
| AI quality evals | Structured-output validity, unsupported-claim prevention, prompt-injection resistance, repeatability, graceful failure, privacy - fully mocked | `scripts/ai-quality-evaluation.test.mjs` |

## Free vs paid

Everything added in this pass runs on tools that are free at the volumes
configured here:

- **Free, no account needed**: Playwright, axe-core, Lighthouse CI (local
  runner), k6 (open-source CLI), CodeQL and Dependency review (both free for
  this public GitHub repo), GitHub secret scanning (free for public repos).
- **Free tier, needs an account you don't yet have configured**: Checkly
  (has a free tier; nothing is deployed until `CHECKLY_API_KEY`/
  `CHECKLY_ACCOUNT_ID` exist and someone runs `checkly deploy`). LangSmith
  (optional AI-eval reporting; inactive without `LANGSMITH_API_KEY`).
- **Could incur real cost if misused**: the app's own OpenAI-backed AI
  features (job analysis, cover letters, interview prep, CV tailoring).
  This is why the production Playwright suite and Checkly checks are
  deliberately scoped to **not** trigger these - see
  [How QA authentication works safely](#how-qa-authentication-works-safely).
  k6 against production is manual-only and targets only static pages.

## Local commands

```bash
# Unit tests (includes Sentry-privacy redaction tests and the AI eval suite)
pnpm test:unit

# Local-fixture Playwright suite (full, or just the fast core smoke)
pnpm test:e2e
pnpm test:e2e:core

# Production Playwright suite - requires QA_SESSION_URL, skips cleanly without it
QA_SESSION_URL="<the full bootstrap URL>" PLAYWRIGHT_BASE_URL="https://autotime-eu-apply.vercel.app" pnpm test:e2e:production

# Visual regression (see "Updating baselines" below for --update-snapshots)
pnpm exec playwright test tests/e2e/visual

# Lighthouse - public pages (builds the app first)
pnpm test:lighthouse
# Lighthouse - authenticated /dashboard, requires QA_SESSION_URL, skips cleanly without it
QA_SESSION_URL="<the full bootstrap URL>" pnpm test:lighthouse:dashboard

# AI quality evals on their own (no OpenAI key needed - fully mocked)
pnpm test:ai-quality

# k6 (requires the k6 CLI installed separately - https://k6.io/docs/get-started/installation/)
k6 run k6/smoke.js
```

## How QA authentication works safely

Production-authenticated checks (Playwright's `tests/e2e/production/`,
Checkly's two browser checks, the authenticated Lighthouse run) all use the
same mechanism already documented in full in
[`docs/qa-test-account.md`](./qa-test-account.md): a locked-down server
route mints a real session for one dedicated, non-admin, fake-data-only test
account when given `QA_SESSION_URL` - a URL containing a bearer secret,
never a password.

Rules every check in this repo follows:

- `QA_SESSION_URL`'s value is **never** printed, logged, screenshotted, or
  written to a file. Every script/spec reads it from `process.env` only.
- Every authenticated check **skips (not fails)** when the variable is
  absent - see `tests/e2e/production/helpers.ts::bootstrapQaSession` and the
  early-exit in `scripts/lighthouse-dashboard.mjs`.
- The production Playwright suite and the two Checkly browser checks are
  **read-mostly**: they navigate and assert on rendered state, but never
  click "Analyse job", generate a cover letter, or trigger any other AI
  action, because those make real, metered OpenAI calls billed to
  production (see `docs/qa-test-account.md`'s "what is safe to do" section).
  The existing local-fixture Playwright suite already covers full mutating
  workflows for free, against mocked data.
- If this secret is ever pasted into a chat, ticket, or committed by
  mistake, treat it as compromised and rotate `QA_SESSION_BOOTSTRAP_SECRET`
  in Vercel immediately (see `docs/qa-test-account.md`'s rotation section).

## Required GitHub secrets

| Secret | Used by | Required for |
|---|---|---|
| `QA_SESSION_URL` | `production-smoke.yml`, `lighthouse.yml` (dashboard job) | Authenticated production checks. Everything skips cleanly without it. |
| `CHECKLY_API_KEY` / `CHECKLY_ACCOUNT_ID` | Not yet wired into any workflow | Only needed if/when someone runs `checkly deploy` for real - not required for anything currently in CI. |
| `LANGSMITH_API_KEY` | Not yet wired into any workflow | Optional AI-eval reporting via `scripts/ai-evals/langsmith-adapter.mjs`. The eval suite passes fully without it. |

No new secret is required for CodeQL, dependency review, ZAP baseline, or
k6 - all three run with the default `GITHUB_TOKEN` or no auth at all.
External/fork pull requests never receive `QA_SESSION_URL` because no new
workflow here uses the `pull_request_target` trigger, and the workflows
that do read the secret (`production-smoke.yml`, `lighthouse.yml`) are
`schedule`/`workflow_dispatch`-only, which never run in a fork's context.

## CI schedules

| Workflow | Trigger | What it does |
|---|---|---|
| `unit-tests.yml` (existing) | PR, push to main | lint, typecheck, unit tests, both builds, deploy smoke |
| `e2e.yml` (existing + new `accessibility` job) | PR, push to main, nightly 02:23 UTC | core Playwright smoke; axe checks on landing/login |
| `codeql.yml` | PR, push to main, weekly Mon 04:17 UTC | Static security analysis |
| `dependency-review.yml` | PR | Flags new high-severity+ dependency advisories |
| `production-smoke.yml` | Daily 06:43 UTC, manual | Authenticated production Playwright journeys |
| `zap-baseline.yml` | Weekly Mon 05:31 UTC, manual | Passive ZAP scan of production |
| `lighthouse.yml` | Daily 07:09 UTC, manual | Lighthouse on public pages + best-effort authenticated dashboard |
| `e2e-full.yml` | Manual only | The complete local-fixture Playwright suite |
| `visual-regression.yml` | Manual only | Compares (or regenerates) visual baselines |
| `k6-manual.yml` | Manual only, confirmation-gated | Configurable k6 run - never automatic, never defaults to production |

## Investigating failures

1. **Unit test failure**: `pnpm test:unit` output names the failing script
   directly - re-run just that one (e.g. `pnpm test:web:sentry-privacy`).
2. **Playwright failure**: download the `playwright-report`/
   `production-smoke-report`/`e2e-full-report` artifact from the failed
   run, open `index.html` locally (`pnpm exec playwright show-report
   <path>`), and check the trace/video for the failing test.
3. **Production-only failure that doesn't reproduce locally**: check
   whether it's a real regression or a QA-account data-state difference
   (e.g. a seeded application changed stage) before assuming a code bug -
   the production suite intentionally adapts to whatever's actually seeded
   (see the `test.skip()` guards throughout `tests/e2e/production/*.spec.ts`
   for "no jobs seeded" etc.).
4. **axe failure**: open the uploaded `axe-report` artifact - each JSON
   file names the violated rule, its impact, and the offending DOM node(s).
   Only `serious`/`critical` impact fails the build; anything else is
   logged to the job's console output for visibility.
5. **Lighthouse failure**: only the accessibility budget (`>=0.90`) fails
   the build by design (see the rationale in
   [Free vs paid](#free-vs-paid) above and the comment in
   `lighthouserc.json`) - performance/best-practices/SEO dips show as
   warnings in the job log, not a red build, until the app's baseline
   performance is better understood.
6. **ZAP finding**: download the `zap-baseline-report` artifact
   (`report_html.html`) - this workflow never fails the build
   (`fail_action: false`) on its first pass; findings are for review, not
   an automatic gate, until triaged.
7. **CodeQL/dependency-review alert**: shows up under the repo's Security
   tab / as a PR check annotation directly - no separate artifact.

## Updating visual regression baselines

Baselines live in
`tests/e2e/visual/key-states.spec.ts-snapshots/*.png` and are committed to
the repo.

```bash
pnpm exec playwright test tests/e2e/visual --update-snapshots
git diff --stat tests/e2e/visual/key-states.spec.ts-snapshots/
```

Review the diff visually before committing - a baseline update should be a
deliberate response to an intentional UI change, not a way to make a red
build green. `visual-regression.yml` (manual, `update_snapshots: true`
input) can generate updated baselines in CI and upload them as an artifact
for review, but does not commit them automatically - download and commit
locally after reviewing.

## Running ZAP and k6 safely

- **ZAP**: `zap-baseline.yml` already runs on a weekly schedule and via
  manual dispatch, passive/baseline only (`-a`, no active/attacking rules).
  Nothing further to do to "run it safely" - it already is. Do not add
  `-j`/active-scan flags to `cmd_options` without re-reading this doc's
  "known gaps" and getting sign-off, since that would start sending
  attack payloads at production.
- **k6**: `k6/smoke.js` and `k6/load.js` only ever target `/` and `/login`
  - never an authenticated or write endpoint. Local/CI runs default to a
  local server. Running `k6-manual.yml` against production requires typing
  an exact confirmation phrase as a workflow input; keep VUs in the single
  digits and duration under a couple of minutes, and never run it during a
  real incident or alongside another load test. See `k6/README.md`.

## Privacy and data-cleanup requirements

- The QA test account's data is entirely fake/seeded - see
  `docs/qa-test-account.md`. Nothing production-authenticated in this
  suite reads or writes any real customer's data; RLS scopes every table
  to `auth.uid()`, identically for the QA account as for any other user.
- No test in this repo prints, logs, or commits `QA_SESSION_URL`,
  `QA_SESSION_BOOTSTRAP_SECRET`, `CHECKLY_API_KEY`, or `LANGSMITH_API_KEY`.
- Sentry redaction (`apps/web/lib/sentry-privacy.ts`) now scrubs
  secret-bearing query strings from `request.url` and breadcrumb messages,
  not just object keys - closing a gap found while building this suite
  (a QA-bootstrap-shaped URL landing in a Sentry breadcrumb verbatim).
- If you seed additional test data for a new check, use obviously-fake
  values (matching the existing fixtures' style - "Fictional Candidate",
  `example.test` domains) and reset via `scripts/create-qa-test-account.mjs`
  if you need the QA account back to its known baseline.

## Pre-release validation - 2026-08-21

A dated record of an end-to-end validation pass against **real production**
(not fixtures, not mocks) - every claim below is backed by a merged PR, a
GitHub Actions run, or a direct read of the affected code, not assumed from
a green checkmark that was never actually exercised.

This section is a living log, not a one-time snapshot: every audit or test
pass - whether it finds a real defect (recorded with its fixing PR) or
confirms an area is already sound (recorded under "Verified, not just
assumed", with no PR needed) - gets appended here as it happens, so this
stays the single evidenced record of what has and hasn't been checked.

### Confirmed working against real production

- **`production-smoke.yml`** (authenticated Playwright journeys against the
  live deployment): 23 passed, 4 skipped (no data yet seeded for those
  journeys), 0 failed. Was blocked entirely by a `QA_SESSION_URL` secret
  mismatch before this pass; root-caused and fixed.
- **`Daily job ingestion`**: manually triggered end-to-end - 14 real jobs
  synced from 3 ATS companies. EURES sync gracefully reports itself
  disabled (no partner API account configured yet; not a defect - the
  function is designed to degrade this way).
- **`ZAP baseline scan`**: completes cleanly - 0 fail-new findings, 11
  informational warnings (cache-control advisories, `Sec-Fetch-*` headers
  browsers already send, base64 in public JS bundles). Three real,
  low-risk gaps (`X-Powered-By` leak, missing
  `Cross-Origin-Opener-Policy`/`Cross-Origin-Resource-Policy`) fixed and
  independently re-confirmed absent in a follow-up scan.
- **`Platform coverage evidence`**: confirmed producing a real
  evidence-refresh diff and pushing it for review.

### Defects found and fixed this pass

| # | What | Where |
|---|---|---|
| #84/#85 | Duplicated "Limited coverage" copy on unsupported-country pages (`european-explorer.ts`); 8 test-authoring bugs in the new production spec suite (wrong link/button targets, timing races) | Production QA specs |
| #86 | Real CSS defect: a blanket brand-backdrop z-index rule silently flattened the account dropdown's z-index to tie with page content, letting page-header buttons intercept clicks meant for the menu | `phase-1-brand.css` |
| #87 | Sign-out redirect assertion didn't account for a query string on the redirect target | Test-only |
| #88-#92 | Daily job ingestion: wrong auth header, missing `--no-verify-jwt` deploy, missing `apikey` header, and a workflow bug that failed the whole job whenever EURES was intentionally disabled | `job-ingestion.yml`, Supabase Edge Functions |
| #93/#96 | ZAP workflow missing `issues: write`; an artifact-name collision between the scan action's own upload and an explicit one | `zap-baseline.yml` |
| #94 | Platform-coverage workflow needed `pull-requests: write`, blocked by an organization-level policy neither the repo owner nor the assistant could grant - reworked to push a branch + compare link instead | `platform-coverage.yml` |
| #98 | No active prompt-injection defense beyond the Responses API's own channel separation, despite a real attack surface (scraped job postings, arbitrary GitHub CV imports) | `openai-server.ts` |
| #99 | `X-Powered-By` leak; missing `Cross-Origin-Opener-Policy`/`Cross-Origin-Resource-Policy` headers | `next.config.ts` |
| #100 | **Real, quantifiable financial exposure**: every AI-backed route checked the caller's monthly allowance/credit balance with a plain read *before* the paid OpenAI call, and only recorded usage (atomically, via `consume_ai_credit`) *after* - so concurrent requests could all pass the check simultaneously and all reach OpenAI regardless of actual entitlement, up to 20/minute/user, repeatable indefinitely. Fixed with an atomic reserve-before-call pattern (`reserve_ai_call`/`confirm_ai_call`/`release_ai_call`) across all 12 AI routes | `feature-gate.ts`, new migration |
| #101 | Not a defect - a manual, real-cost diagnostic workflow (`workflow_dispatch` only) added to directly confirm #100's fix against live production with one real, deliberately-authorized AI call. Dispatched once; returned a genuine HTTP 200 with a coherent AI response | `.github/workflows/verify-ai-billing-fix.yml` |
| #105 | Stripe delivers webhooks at-least-once; `customer.subscription.created` redelivery had no idempotency guard, so a redelivered event would re-send the "upgrade confirmed" email to the user a second time. Fixed with a `stripe_webhook_events` claim table (event.id, released on processing failure so genuine retries still reprocess) | `api/stripe/webhook/route.ts`, new migration |
| #107 | **Open redirect**: `/auth/callback`, `/api/qa/session`, and the login page all validated `redirectTo` by rejecting a literal `"//"` prefix only - but browsers and Node's URL parser treat a leading `"/\"` the same as `"//"`, so `redirectTo=/\evil.example` bypassed every check and sent a user, immediately after a real successful sign-in, straight to an attacker-controlled origin. Fixed by resolving the candidate value against the request's actual origin (matching the existing `lib/return-url.ts` pattern) instead of blocklisting string prefixes | `lib/safe-redirect-path.ts`, `auth/callback`, `api/qa/session`, `LoginContent.tsx` |
| #106/#108 | **Documentation defects**: the root `README.md`, `PRIVACY.md`, and `docs/release-readiness.md` all still described the product as it was around the `v0.0.1` tag (2026-05-03) - browser-local AI with a user-supplied OpenAI key, no backend, a Chrome side-panel UI, Supabase sync framed as pending work. None of that matched the current system (server-side AI billing, full Supabase/RLS backend, no `sidePanel` permission in the manifest). Corrected against direct code verification (`wxt.config.ts`, `env.server.ts`, `platform-coverage.json`, git tags, the live `/privacy` page); added `docs/README.md` (an index for the 100+ files under `docs/`) and `CHANGELOG.md` | `README.md`, `PRIVACY.md`, `docs/release-readiness.md`, `docs/README.md`, `CHANGELOG.md` |
| #110 | **Compliance-doc defect**: `docs/job-aggregation-compliance.md` explicitly said "do not scrape ... Indeed, national job boards" and claimed automatic extraction was limited to "Workday, iCIMS, and generic/unknown company career sites" - but tracing the real enforcement path (`getJobCaptureMode` -> `detectATS`/`isApiCoveredJobUrl` -> `PLATFORM_COVERAGE`) showed 13 named job boards (Indeed, Stepstone, Xing, Monster, InfoJobs, JobTeaser, EuroTopTech, NationaleVacaturebank, WelcomeToTheJungle, EuroTechJobs, EuroJobs, NextLevelJobs, Wellfound) are deliberately configured for full selector-extraction, verified 2026-08-18 with per-platform fixtures - a real, reviewed product decision the compliance doc never caught up to. Flagged to the founder as a legal/business judgment call rather than silently picked a side; founder chose to update the doc. Rewritten to separate server-side automated bulk ingestion from the extension's user-initiated single-page capture, and to point at `platform-coverage.ts`'s `expectedCaptureMode` field as the one source of truth instead of duplicating the list | `docs/job-aggregation-compliance.md` |
| #111 | **DNS-rebinding SSRF gap**: `fetchPortfolioText` (the user-supplied portfolio-URL CV importer behind `/api/ai/cv-enrich`) already blocked private/loopback/link-local hostnames and pre-checked the resolved IP with a separate `dns.lookup()` call before fetching - but `fetch()` re-resolves the hostname internally at connect time, independent of that earlier check. An attacker controlling their own domain's DNS could return a public address for the pre-check and a private/internal one (e.g. `169.254.169.254`, a cloud metadata address) moments later when `fetch()` actually connects. Fixed by passing a custom lookup directly into undici's `Agent` (`connect.lookup`), so the same validation runs inside the actual connection layer instead of racing it - whatever address is validated is guaranteed to be the address connected to | `lib/cv/sources/portfolio.ts` |
| #112 | **Zip-bomb DoS + double-escaping bug**: `extractDocxText` (DOCX CV import behind `/api/profile/import-cv`) only ever reads the one `word/document.xml` zip entry - already far safer than a general-purpose zip extractor - but its `inflateRawSync` call on that entry had no output-size limit. The route's 5MB upload cap only bounds the entry's *compressed* size; deflate can exceed a 1000:1 ratio on crafted repetitive input (confirmed in the new test: an 80MB run of zeros compresses to a tiny buffer), so a small, valid-looking DOCX could decompress to several GB and OOM the function. Fixed with zlib's built-in `maxOutputLength` (50MB, far above any real CV's `document.xml`). Also fixed a real double-escaping bug CodeQL flagged in the same file: `decodeXmlEntities` decoded `&amp;` in its own pass before `&lt;`/`&gt;`, so a legitimately double-escaped `&amp;lt;` (representing the literal text "&lt;") decoded through two passes into a raw `<` - corrupts real CV content, not just a security nicety. Fixed with a single-pass multi-entity regex; CodeQL's separate `js/incomplete-multi-character-sanitization` alert on the same function cleared as a result, confirming both alerts were two angles on the same root bug | `lib/docx-cv.ts` |
| #113 | **AI safety fixes missed in a second AI pathway**: `lib/role-intelligence.ts` (NVIDIA-backed, used by Role Pathways' evidence extraction) is a completely separate AI client from `openai-server.ts` and had bypassed both major fixes already applied everywhere else - no `UNTRUSTED_CONTENT_GUARD`-equivalent instruction on candidate CV/job-posting text (the same untrusted-content class #98 fixed elsewhere), and no real rate limiting: its only protection was a module-level in-memory `activeRequests`/`MAX_CONCURRENCY = 2` counter, which does not coordinate across Vercel's horizontally-scaled serverless instances (the same class of bug #100 fixed for the main AI billing path, in a different form). Fixed by appending the guard text to the NVIDIA provider's system prompt and wiring the existing, database-backed `assertAiRouteRateLimit` into `POST /api/role-pathways/generate`. Also raised, rather than deciding unilaterally, whether this should be gated behind a subscription/credit check like every other AI route - founder decided yes, so also wired the same reserve/finalize/release primitives from #100 (mock mode still costs nothing and isn't gated; only the real nvidia path reserves a call) plus the standard `FeatureGateError` -> 402 upgrade response | `lib/role-intelligence.ts`, `api/role-pathways/generate/route.ts` |
| #114 | **Missing magic-byte validation on profile photo upload**: `/api/profile/photo` trusted the client-supplied `file.type` to decide whether an upload was JPG/PNG/WebP - a plain REST endpoint any authenticated HTTP client can call directly with any declared Content-Type for any bytes, not just a browser file picker. Nothing checked the actual file signature before storing it and setting that same claimed type as the Supabase Storage object's Content-Type (a separate origin, not covered by this app's own `next.config.ts` security headers). Bounded impact - no `dangerouslySetInnerHTML` sink exists anywhere in this app, and photos are only ever consumed via `<img>` - but a real gap relative to the magic-byte checks already used for PDF/DOCX uploads elsewhere in this codebase. Fixed with `lib/image-signature.ts` checking real JPEG/PNG/WebP signatures before upload | `api/profile/photo/route.ts`, `lib/image-signature.ts` |
| #115 | **Incomplete GDPR data export**: `/api/account/export` (the "Export my data" feature `PRIVACY.md` and the live `/privacy` page explicitly promise downloads "everything stored about your account") only exported 11 tables. Cross-checked every table with an `ON DELETE CASCADE` ownership link to `auth.users(id)` across all migrations against that list and found 7 real, actively-used, server-synced content tables missing entirely: `job_workflow_jobs`/`job_workflow_analysis_snapshots`/`job_workflow_applications`/`job_workflow_screening_answers` (the old comment claimed this lived only in browser localStorage - confirmed stale by checking `/api/sync/job-workflow` actually syncs it server-side), `interview_records`/`interview_questions`/`interview_preparation_snapshots` (the current interview workflow - a separate, older `interview_prep_packs` table *was* included, creating a false impression of completeness), `cover_letters`, `outreach_contacts`/`outreach_messages`, `user_skill_profile`/`esco_questionnaire_answers`, and `profile_revisions`. Fixed by adding all 7 to the exported set, extracted to `lib/account-export.ts` for testability | `api/account/export/route.ts`, `lib/account-export.ts` |
| #116 | **Unrate-limited unauthenticated DB-write endpoint**: `/api/diagnostics/client` accepts unauthenticated requests by design (it must capture pre-login/OAuth failures), and every accepted request writes a row to `operational_logs` via `logDiagnostic` - but had no rate limit at all, so anyone could flood the table with an unbounded number of free DB writes, a real resource-exhaustion/cost-inflation vector. Fixed with `assertDiagnosticRouteRateLimit`, reusing the existing atomic `increment_ai_rate_limit` RPC (generic despite the name) rather than a new table/migration: 30 requests/5min, keyed by user id when authenticated or a salted SHA-256 IP hash otherwise, deliberately fail-open on RPC errors (contrasted with the AI-billing limiter's fail-closed behaviour, since this is best-effort reporting not a metered action). Bundled a DRY extraction of `getRequestIp` into a new dependency-free `lib/request-ip.ts` (also deduplicates an identical inline copy already in `api/compatibility/reports/route.ts`) since `lib/diagnostics.ts`'s `next/server` import makes it otherwise untestable in isolation under this repo's plain-node test runner | `lib/diagnostics.ts`, `lib/request-ip.ts`, `api/diagnostics/client/route.ts`, `api/compatibility/reports/route.ts` |
| #117 | **Unauthenticated public analytics microservice**: `apps/analytics` (a separate FastAPI service `vercel.json` deploys to the same production domain at `/analytics`) had its one real endpoint, `POST /evidence-outcomes`, completely open - no auth, no payload-size limit. The dashboard's "Run online analytics" button called it directly from the browser with no session/identity information at all, so anyone who found the URL could call it directly, repeatedly, with arbitrarily large record arrays, for free - a real unauthenticated resource-exhaustion vector against a non-trivial `Counter`/loop-based compute endpoint on a production domain (not a data leak - the service is stateless, computing only from the POST body). Since it's a separate Python runtime with no way to validate a Supabase session itself, fixed with a shared-secret gate (`x-analytics-secret` matched against `ANALYTICS_INTERNAL_SECRET` via constant-time compare, 401 otherwise, plus a 2000-record cap per array as defense in depth) and a new authenticated Next.js proxy route (`getRequestUser` first, then forwards with the secret) that the dashboard now calls instead of hitting the Python service directly | `apps/analytics/main.py`, `api/analytics/evidence-outcomes/route.ts`, `components/DashboardExperience.tsx` |
| #118 | **Inconsistent cache header on an admin route**: every other admin read route (`users`, `feedback`, `ai-operations`, `market-data`, `audit-log`, `feature-flags`) sends `Cache-Control: private, no-store`; `/api/admin/overview` was the one exception, sending plain `no-store` without `private`. Found while auditing all six admin read routes for completeness against that pattern (the permission-gating and query-bounding parts of all six were already solid - see below). Low risk in this deployment (no shared proxy cache sits in front of the app), but a real, confirmed inconsistency. Fixed the one line and added a regression test asserting all six routes agree | `api/admin/overview/route.ts` |
| #119 | **Cross-user data-integrity gap in job-workflow sync + a disabled-sync UX bug**: found while independently verifying (not just assuming, since it had never actually been read this session) an earlier claim that `api/sync/job-workflow` "follows the same pattern" as mobility/interview sync. `upsertApplication()` wrote `job_id: application.jobId` straight into the payload with no check that the referenced job belongs to the calling user - the FK only requires the row to exist *somewhere* (not owned by the same account), and `createAdminClient()`'s service-role key means RLS doesn't backstop it either. Not a read leak (`readJobWorkflow` still scopes the jobs list by `user_id`), but a caller who obtains another user's job UUID could link their own application to it, and that job's own `on delete cascade` would then silently delete the *unrelated* application the moment its real owner deletes their job. Separately, `useJobWorkflowSync.ts`'s `upload()` treated a 404 (the feature-disabled response) the same as any real failure, so with `AUTOTIME_JOB_WORKFLOW_SERVER_SYNC_ENABLED=false` in production, every local edit silently showed a false "sync failed" error instead of the correct disabled-state message. Fixed both: verify job ownership before linking, and check `response.status === 404` in `upload()` the same way the initial `GET` already did | `lib/job-workflow-repository.ts`, `lib/useJobWorkflowSync.ts` |
| #120 | **Same unverified-FK pattern found elsewhere, deliberately swept for**: after fixing #119, dispatched a targeted sweep of every other repository/upsert function in the codebase for the exact same pattern (a client-supplied foreign key written into an insert/update payload with no ownership check). Found one real instance: `upsertInterview()` (`lib/interview-workflow-repository.ts`) wrote both `application_id` and `job_id` - two client-supplied FKs - with no verification that either referenced row belongs to the calling user. Same non-leak-but-cascade-risk shape as #119, and arguably higher severity here since there are two cascading FKs instead of one, and `interview_questions`/`interview_preparation_snapshots` cascade off `interview_records.id` in turn - so the blast radius of a real owner deleting their own application/job could take out an unrelated user's interview plus its questions and prep snapshots. `mobility-profile-repository.ts` and `cloud-sync.ts` were checked and confirmed clean (no client-supplied FK fields in the former; the latter's FK values are always server-generated or scoped to the caller). Fixed the same way as #119: verify both referenced rows before writing | `lib/interview-workflow-repository.ts` |
| #121 | **Two more instances of the same unverified-FK pattern**: extended the #120 sweep to every `.insert()`/`.upsert()` call in `apps/web/app/api` and found two more. `POST /api/ai/cover-letter` inserts into `cover_letters` with `job_id: body.jobId` (optional) with no ownership check; `POST /api/outreach` inserts into `outreach_messages` with `job_id: body.jobId` (required) with the same gap. Both FKs reference `public.applications(id) on delete cascade`. Same impact shape as #119/#120: not a read leak, but a caller who obtains another user's application UUID could link their own cover letter or outreach message to it, silently cascade-deleted the moment that application's real owner deletes it. Fixed both by verifying the referenced application belongs to the caller before writing. Swept the remainder of `apps/web/app/api` and `apps/web/lib` and found nothing else: `esco/questionnaire`'s `escoSkillId` only ever references the public `esco_skills` reference table (no per-user ownership applicable), and `sync/extension`'s `extension_id` is an opaque identifier, not a foreign key to another user's row - this closes out the sweep across the whole codebase | `api/ai/cover-letter/route.ts`, `api/outreach/route.ts` |
| #122 | **Unaddressed dependabot alert**: GitHub's one open alert (#74, medium, CVE-2026-41907/GHSA-w5hq-g745-h8pq) had been showing on every push all session without ever being checked - a transitive `uuid@8.3.2` pulled in by `exceljs@4.4.0` in `docs/qa` (a standalone npm project outside the pnpm workspace that generates the QA documentation `.xlsx`, never deployed/run in production). `uuid`'s `v3()`/`v5()`/`v6()` methods don't bounds-check a caller-supplied output buffer, allowing silent partial writes - fixed upstream in `uuid@11.1.1`+. `exceljs@4.4.0` is still the latest release and still requires `uuid@^8.3.0`, so no newer `exceljs` fixes this. Fixed with an npm `overrides` entry pinning `uuid` to `^11.1.1`, matching the same remediation already used for the root workspace's own `uuid` override. Verified `npm install` resolves to `uuid@11.1.1` with 0 vulnerabilities, and `npm run build` still generates the workbook successfully end-to-end | `docs/qa/package.json` |
| #123 | **Missing least-privilege permissions on the CI workflow**: audited all four GitHub Actions workflows (`unit-tests.yml`, `e2e.yml`, `job-ingestion.yml`, `platform-coverage.yml`) for the classic script-injection/`pull_request_target` vulnerability classes (untrusted PR title/branch data interpolated into a `run:` shell step, or fork PR code executed with write-level secrets). All four are clean: none use `pull_request_target`; `job-ingestion.yml`/`platform-coverage.yml` never trigger on `pull_request` at all; `unit-tests.yml`/`e2e.yml` only ever reference literal offline placeholder secrets in PR-triggered env blocks, never `secrets.*`, so there's no real secret-exposure path regardless of fork origin; `platform-coverage.yml`'s `github-script` step only reads the repo's own generated JSON report, never attacker-controlled input. One real, minor inconsistency: `unit-tests.yml` (the required "CI" check, triggered by any `pull_request`) was the only one of the four missing an explicit `permissions:` block. Not a live exploit today (nothing in its steps exercises `GITHUB_TOKEN`), but closes the gap before a future step could silently depend on the org/repo's default token permission level. Fixed by adding `permissions: contents: read`, matching the posture already used elsewhere in this repo's workflows | `.github/workflows/unit-tests.yml` |
| #124 | **Implicit-only grant on a Postgres RPC**: audited all 8 `security definer` functions across every migration for the classic risks (missing `search_path` pinning enabling schema-shadowing privilege escalation, dynamic SQL/injection, or a function grantable to `authenticated`/`anon` that blindly trusts a client-supplied `p_user_id` instead of the caller's real RLS-scoped identity). All genuinely `security definer` functions are correctly `revoke all ... from public, anon, authenticated` + `grant ... to service_role` only, every one has `set search_path = public` pinned, and none build dynamic SQL - clean across the board. One inconsistency, not a live exploit: `get_monthly_ai_calls` is `security invoker` reading RLS-scoped `ai_usage` (a spoofed `p_user_id` just returns nothing) and is only ever called server-side with a session-derived id, but unlike its exact sibling `get_ai_credit_balance` (which has an explicit `grant execute ... to authenticated`), it never had any explicit grant/revoke, relying implicitly on Postgres's default `PUBLIC` grant - safe because of RLS, not because of an explicit decision, the only RPC left that way. Fixed with a migration making the grant explicit, matching the sibling's already-established pattern; no behaviour change | `supabase/migrations/20260822100000_pin_get_monthly_ai_calls_grant.sql` |
| #125 | **Two tables relying on implicit RLS-default-deny instead of an explicit revoke**: re-verified RLS coverage across all 44 current tables against a much older claim from earlier this session ("read every RLS policy on all 41 tables") that predates roughly a dozen tables added since - checked directly rather than trusting the stale number. No RLS gaps found anywhere: every table has RLS enabled with a correct `auth.uid() = user_id` policy, is genuinely public reference data (`job_listings`, `esco_skills`/`esco_occupations`/`esco_occupation_skills`, `company_ats_slugs`, all deliberately `using (true)`), or is service-role-only with client access already blocked. One inconsistency, not a live gap: `stripe_webhook_events` and `ai_rate_limits` both have RLS enabled with zero policies (which already default-denies `anon`/`authenticated` regardless of table GRANTs), but every other service-role-only table (`admin_memberships`, `admin_audit_events`, `market_refresh_requests`, `workflow_operational_events`, `platform_coverage_reports`) backs that up with an explicit `revoke all ... from public, anon, authenticated`, so those tables' safety doesn't depend solely on nobody ever adding a permissive policy later without noticing the missing revoke - these two were the only ones left relying on RLS-with-no-policies alone. Fixed by bringing both in line with the established pattern; no behaviour change | `supabase/migrations/20260822110000_explicit_revoke_stripe_events_rate_limits.sql` |
| #127 | **Two Sentry fields left out of an existing redaction pass**: `filterSentryEvent` already redacts a secret-bearing URL embedded in free text for `event.request.url` and breadcrumb `message` (specifically built to stop the QA session-bootstrap URL's `?secret=...` from reaching Sentry verbatim), but two structurally identical free-text fields were never covered: `event.exception.values[].value` (the thrown Error's own message text) and the top-level `event.message` (used for `Sentry.captureMessage` calls). Checked directly for a live instance - grepped every interpolated `throw new Error(\`...\`)` in the app - and found none that embed a secret-bearing URL today (only HTTP status codes and a non-secret Stripe lookup key), so this isn't closing an active leak. Same defense-in-depth reasoning as #125: two fields identical in risk to already-covered ones, left uncovered only because nothing happened to write a secret through them yet. Fixed by running the same redaction pass over both fields | `lib/sentry-privacy.ts` |
| #129 | **Concurrent-refresh race in the extension's session logic**: found while auditing how the extension stores and accesses its dashboard auth token (see also the judgment call below). `lib/session.ts`'s `refreshSession()` had no lock around the refresh HTTP call - if two call sites both saw an expiring session at roughly the same time, both would POST the same stale `refreshToken` to `/api/sync/refresh` concurrently. Supabase refresh tokens are single-use/rotating, so only one concurrent request can succeed, but the code treated any non-ok/error response as a fully invalid session and called `clearAccountSession()`, signing the user out even when a sibling call had just obtained a perfectly good new token moments earlier - a real, accidentally-triggerable bug. Fixed by sharing a single in-flight refresh promise so every concurrent caller awaits the one real attempt instead of racing separate HTTP calls against the same single-use token. Also fixed a pre-existing extensionless relative import in `session.ts` that made it untestable directly from the plain-node test harness | `apps/extension/lib/session.ts` |
| #130 | **Unbounded regex scan on untrusted page text**: audited every regex in the extension's page-parsing code for ReDoS (the content script runs regex against arbitrary-length text from any website, injected on every page by design). No genuinely exploitable catastrophic-backtracking pattern exists anywhere - every regex here uses single-level quantifiers or negated-character-class matching, never the nested-quantifier shapes (`(a+)+`, `(.*)+`) that cause exponential blowup. One real inconsistency, not exponential but still unbounded: `inferLocationSignalFromText` ran 9 unanchored regex patterns directly against the full, uncapped job description, unlike its siblings in the same file (`isLikelyShortFieldValue`, `isLikelyLocationValue`), which check length before running their own regexes - an unanchored pattern re-attempts from every position, so scan cost scales with input length with nothing bounding it. Fixed by capping the scanned text at 20,000 characters (far beyond any real job description) before the pattern loop, matching the length-then-regex discipline already used by its siblings. New test guards against this scan ever going unbounded again (a 500,000-character padded description now resolves in well under a second) | `apps/extension/lib/job-page.ts` |
| #131 | **Inconsistent friction-penalty clamping in relocation-fit scoring**: audited the core Decision Index / fit-scoring engine (`packages/shared/src/fit-model.ts`) for business-logic correctness - the "Apply now/Stretch/Skip" math real users rely on for real decisions, not just a security surface. `getRelocationFit()` computes a `frictionPenalty` from the target country's `relocationFriction` (high=8, low=-5, medium=0); two of its three scoring branches clamp it with `Math.max(frictionPenalty, 0)` before subtracting (so "low" friction never adds a bonus, only avoids the high-friction penalty), but the third branch (onsite job, unclear relocation willingness) subtracted the raw unclamped value, letting a "low" friction country score a +5 bonus the other two branches deliberately withhold. Not reachable with live data today (every country in `country-rules.ts` is currently "high" or "medium", none "low"), but "low" is a real, documented `RelocationFriction` value and the two sibling branches already establish the intended behavior in this exact function - would silently misscore the moment a "low" friction country is added. Fixed by applying the same clamp to the third branch. Verified via the full existing test suite (unchanged, since no live country data exercises the "low" branch either way) plus manual arithmetic tracing against the two sibling cases; did not export the internal `getRelocationFit` function just to add a direct unit test, since only `evaluate*` functions are part of the shared package's public API | `packages/shared/src/fit-model.ts` |
| #132 | **An Applied application could silently revert to Ready**: audited `job-application-workflow.ts`'s readiness/transition gate for correctness. The unsupported-claims attestation gate (`getApplicationReadiness`) was verified sound (`.length > 0`, not array truthiness; every field defaults safely). But `transitionApplication`'s guard for `next === "Ready"` only checked readiness blockers, never the application's *current* status - and since `"Ready"`/`"Applied"` are adjacent in the status-order array, the generic one-step adjacency check let `transitionApplication(application, "Ready", job)` succeed on an application whose status was already `"Applied"`, silently reverting it: status flips back to `"Ready"` while `appliedAt` keeps the stale original timestamp, `submissionConfirmed` clears, and the application reappears in the "ready to apply" review queue despite already being submitted in the real world - risking a guided duplicate real-world application, and a subsequent re-confirm would silently overwrite the original `appliedAt`. Not reachable through the current UI (checked both call sites), but a real hole in the exported function itself. Fixed by explicitly rejecting `next === "Ready"` when the application is already `"Applied"`, with its own clear error message | `apps/web/lib/job-application-workflow.ts` |
| #133 | **Completed/cancelled interviews could be silently reverted, and outcomes silently overwritten**: same class of bug as #132, found by auditing the adjacent interview state machine. `transitionInterview`'s own `allowed` map correctly declares `completed`/`cancelled` as terminal (zero outbound transitions), but `saveInterviewAnswer` and `refreshInterviewPreparation` bypassed that guard entirely by writing `status: "preparing"` directly on every call regardless of the interview's current status. Reachable in production - `InterviewsWorkspace.tsx` never hides the Preparation tab's "Save draft"/"Refresh preparation" controls once an interview is completed - so a user could complete an interview, record a real outcome (e.g. "offer"), then save a draft answer or refresh preparation and silently revert `status` to `"preparing"` while `outcome`/`outcomeDetails` still held the real result: `getInterviewHomeSignals` would resurface the closed interview as active with "needs final review" prompts, and `InterviewOutcomePanel` would hide the already-recorded outcome and ask the user to "mark completed" again. Separately, `recordInterviewOutcome` had no guard against being called a second time (only checked `status === "completed"` and rejected the `"awaiting"` sentinel, never `interview.outcome !== "awaiting"` as a precondition), so reaching it twice could silently overwrite a real outcome (offer -> rejected) with no warning. Fixed all three: the two status-writing functions now preserve the interview's existing terminal status instead of resetting it, and `recordInterviewOutcome` now rejects re-recording once an outcome already exists | `apps/web/lib/interview-workflow.ts` |
| #134 | **`admin/users` had no pagination, hardcoded to the first 50 accounts**: founder-reviewed judgment call (flagged as "noted, not fixed" alongside #118) - founder explicitly chose "Fix now" rather than deferring. `getAdminUsersOverview` called `listUsers({ page: 1, perPage: 50 })` unconditionally, with no way to see any user past the 50th and no signal to the operator that more existed. Fixed by threading real pagination end-to-end: `getAdminUsersOverview` now accepts a `page` argument and returns `{ users, page, perPage, total, hasMore }` (using Supabase Admin Auth API's own `nextPage`/`total` fields); `GET /api/admin/users` reads `?page=`; the page/table component gained Previous/Next controls and a "Showing X-Y of N users" line (via a new pure `getVisibleRowRange` helper, unit-tested for first/middle/last-partial-page/zero-total cases) | `lib/admin-users.ts`, `lib/admin-users-pagination.ts`, `api/admin/users/route.ts`, `app/admin/users/page.tsx`, `app/admin/users/AdminUsersTable.tsx` |
| #135 | **`GET /api/sync/dashboard` had no row limit at all on any of its four per-user tables**: same founder-approved "Fix now" judgment call as #134 (flagged alongside #117), but a different fix shape - this endpoint fully replaces local component state on every load (`loadDashboardSnapshot`), so it's a local-first state-hydration call, not a list view; naive pagination here would silently hide a user's own real data (search/filter/CSV export all depend on the complete local dataset). Fixed with a generous defensive ceiling instead (`MAX_SYNCED_ROWS_PER_TABLE = 20_000`, added to all four `applications`/`evidence_records`/`outcome_records`/`interview_prep_packs` queries, each already ordered by recency descending so a cap - if ever hit - drops only the oldest rows). The architecturally correct fix for "resync cost grows with total history" is incremental/delta sync, explicitly scoped out as a separate, larger initiative | `api/sync/dashboard/route.ts` |
| #136 | **Extension content script held the raw dashboard auth token directly**: founder chose "Fix now (Recommended)" on this flagged judgment call. The content script (injected into every visited page) read the full account session via `getAccountSession()` - `lib/match-overlay.ts` performed authenticated fetches itself with an `Authorization` header, and `contents/autofill.ts` read the whole session object just to check a connection-status boolean for the widget UI. Separately and more fundamentally: `chrome.storage.local`'s `onChanged` event delivers the full old/new value of any changed key to every listener with access to that storage area, including content scripts - so the token was reaching the content script's execution context via that event's payload even in code paths that never explicitly called `getAccountSession()`. App-level message-passing discipline alone can't close that, since any content-script JS can call `chrome.storage.local.get()` directly regardless of what this codebase's own code chooses to call. Fixed at the actual boundary: moved the account session from `chrome.storage.local` to `chrome.storage.session`, whose default access level (`TRUSTED_CONTEXTS`) is background-worker-and-extension-pages-only and blocks content scripts at the browser API level, not just by convention - plus rewired the content script to request a token-free `ConnectionState` and job-match scoring from the background worker via `chrome.runtime.sendMessage`, rather than reading the session or fetching with the token itself. Real, disclosed trade-off: session storage clears on a full browser restart (unlike `.local`, which persists indefinitely), so users now need to reconnect after fully closing the browser, not just after closing a tab | `lib/storage.ts`, `lib/connection-state.ts`, `lib/match-overlay.ts`, `contents/autofill.ts`, `lib/cloud-sync.ts`, `entrypoints/background/index.ts`, `sidepanel/main.tsx` |
| #137 | **Job-workflow cloud sync had no deletion propagation at all**: founder chose "Design tombstone support (Recommended)" on this flagged judgment call. `reconcileJobWorkflow` treated "exists on the server, not present locally" as "adopt it from the server" unconditionally - correct for a device that has never synced before, but indistinguishable from a job/application a user had deleted locally, which would then silently reappear on the very next sync; no `DELETE` endpoint existed for this feature at all. Fixed schema-first: a new migration adds a nullable `deleted_at` tombstone column to both `job_workflow_jobs` and `job_workflow_applications`; `readJobWorkflow` now excludes `deleted_at` rows entirely, so a soft-deleted row never comes back down to any client regardless of how the deletion got there; new `softDeleteJobWorkflowItems()` plus an authenticated `DELETE /api/sync/job-workflow` handler (scoped to the caller's own `user_id`, matching every other write in this file) cascades a job's tombstone onto its own application, mirroring the real FK's `on delete cascade`; `upsertJob`/`upsertApplication`'s existing-row lookups now exclude soft-deleted rows too, so resaving an already-tombstoned id surfaces as a conflict rather than silently reviving it; `reconcileJobWorkflow` gained optional `pendingDeletedJobIds`/`pendingDeletedApplicationIds` parameters (both defaulting to empty, fully backward compatible) so an offline/failed delete attempt isn't silently undone by the next reconciliation before it reaches the server. Deliberately out of scope: there is no delete/archive action anywhere in the job-workflow UI today (verified - no such function exists in `job-application-workflow.ts` or any dashboard component), so this ships the sync-layer machinery a delete feature needs, not a delete button - choosing that UX is a product decision outside this fix | `job-workflow-repository.ts`, `job-workflow-sync.ts`, `api/sync/job-workflow/route.ts`, `lib/supabase/types.ts`, new migration |
| #138 | **CSV/formula injection in extension application exports**: `escapeCsvValue` in `apps/extension/lib/applications.ts` (used by both `applicationsToCsv` and `validationMetricsToCsv`) only wrapped cells in quotes and escaped embedded quote characters - it never neutralized a leading `=`, `+`, `-`, or `@`, the characters that make Excel/Google Sheets/LibreOffice evaluate a cell as a live formula instead of literal text when the exported CSV is opened. Reachable, not theoretical: `application.roleTitle`/`application.company` are populated by `inferJobPageDetails()` in `lib/job-page.ts` directly from scraped DOM content of arbitrary third-party job posting pages - untrusted, attacker-influenceable strings that flow straight into the exported CSV a real user later opens in a spreadsheet app. A malicious or compromised job listing with a title like `=HYPERLINK("http://evil.example","click me")` would render as a live, clickable formula once exported and opened. Checked every other CSV path in the repo: `apps/web` only ever *imports* CSV (outreach contacts, LinkedIn CV import), never exports it, and the GDPR account export emits JSON only (`Content-Type: application/json`, confirmed by reading both `lib/account-export.ts` and its route in full) - no export surface there. Fixed by renaming the function to `sanitizeCsvCell` and prefixing a leading `'` before quoting any cell whose value starts with `=`, `+`, `-`, `@`, tab, or CR, forcing spreadsheet apps to treat it as literal text | `apps/extension/lib/applications.ts` |
| #139 | **Unauthenticated, unbounded-cost `/api/sync/refresh` route with zero rate limiting**: audited rate-limit coverage across all 47 API routes (grepped every route for a rate-limit reference, then manually reasoned about each unmatched one - most are admin-gated, authenticated-and-scoped, or Stripe/signature-verified, all lower priority). `/api/sync/refresh` stood out: deliberately unauthenticated by design (exchanges a client-held Supabase refresh token for a new access token, mirroring Supabase's own token endpoint), but every POST - including one with a garbage `refreshToken` - triggers a real `auth.refreshSession()` call against Supabase's own Auth service (`runSessionRefresh` only checks the field is a non-empty string first) plus, on an unauthorised result, a DB write via `diagnosticJson`'s `log: true` path. Same vulnerability class already fixed twice this session for other unauthenticated routes (AI billing race #100, analytics microservice #117), just not yet applied here. Fixed by rate-limiting on a salted SHA-256 IP hash (no session to key on, same pattern as the unauthenticated `compatibility/reports` route) via the existing generic `increment_ai_rate_limit` RPC, 10 requests/60s per IP; the 429 branch deliberately never sets the diagnostic-logging flag, since logging every rate-limited hit would recreate the exact unbounded-write cost being closed | `api/sync/refresh/route.ts` |

### Verified, not just assumed

- **Cross-user data isolation**: read every RLS policy on all 41 tables
  (all correctly scoped to `auth.uid() = user_id`; the only `using (true)`
  policies are on genuinely shared reference data), audited all 27 API
  routes using the service-role client (none let a client-supplied user id
  substitute for the authenticated session's own id), and personally
  verified the two foundational pieces everything else depends on: session
  verification re-validates tokens against Supabase on every call (not a
  local JWT decode), and the test-auth bypass requires four independent
  conditions including `VERCEL_ENV !== "production"`, a value Vercel sets
  automatically and app code cannot misconfigure.
- **Prompt-injection resistance**: the realistic attack surface (scraped
  EURES/ATS job postings, arbitrary GitHub CV imports) now gets an active
  instruction, on all 12 AI generation calls, to treat supplied content as
  data only and disregard anything embedded in it that reads like a
  command - on top of the pre-existing channel separation and strict
  schema validation that already bounded a successful injection's impact.
- **Extension-to-dashboard bridge** (2026-08-21): audited the
  `chrome.runtime.onMessageExternal` channel end to end - `externally_connectable`
  in `apps/extension/wxt.config.ts` restricts which origins can even reach
  the extension to the production dashboard; `isTrustedSender` in
  `entrypoints/background/index.ts` independently re-checks `sender.url`'s
  origin as defense in depth; the account-connect message's `authToken` is
  read directly from the browser's own `supabase.auth.getSession()` in
  `ExtensionConnect.tsx` (never a client-supplied identity claim); and every
  server-side use of that token (`/api/sync/dashboard`, `/api/sync/extension`)
  validates it against Supabase via `getBearerUser` and scopes every read/
  write to the resulting `user.id`, never a client-supplied one. **No fix
  needed** - audited and confirmed sound, not merely assumed safe.
- **Outreach feature** (2026-08-21): `/api/outreach` and
  `/api/outreach/contacts` only draft AI-assisted messages and store
  imported contacts - there is no code path that sends an email or LinkedIn
  message on the user's behalf (confirmed by tracing `OutreachWorkspace.tsx`:
  the only outbound calls are `GET`/`PATCH` against `/api/outreach` itself).
  Contact import requires an explicit `consent: true` field, dedupes by a
  SHA-256 hash of email/profile-URL/name+company, and every route scopes to
  `user_id` from the validated session. **No fix needed.**
- **Admin panel authorization** (2026-08-21): the shared layout
  (`app/admin/layout.tsx`) only gates on the baseline `overview:read`
  permission and filters *nav links* by permission - so the real question
  was whether each admin page/route enforces its own specific permission
  independently, rather than trusting the nav being hidden. Confirmed all
  six admin pages (`users`, `feedback`, `ai-operations`, `market-data`,
  `feature-flags`, `audit-log`) and every admin API route call
  `requireAdminPrincipal`/`requireAdminRequest` with their own specific
  permission. Both mutation routes checked in depth
  (`api/admin/feature-flags`, `api/admin/market-data/refresh`,
  `api/admin/users/[userId]/beta-access`) additionally enforce a same-origin
  check (`isSameOriginMutation`), strict exact-shape body validation, and
  RPC-based writes with actor attribution (`p_actor_user_id`) and
  optimistic-concurrency/idempotency handling. The role/permission matrix
  (`lib/admin-permissions.ts`) correctly scopes `admin_memberships:manage`
  to `owner` only, requires `status === "active"` regardless of role, and
  `getAdminMembership` explicitly excludes test-auth users from ever
  resolving as an admin. Error responses (`admin-safe-response.ts`) never
  leak internals - generic message plus an opaque `diagnosticId` only,
  `Cache-Control: private, no-store` on every response. **No fix needed.**
- **Server-side job-listing ingestion** (2026-08-21, alongside #110): read
  `supabase/functions/sync-job-sources/index.ts` and `sync-eures/index.ts` in
  full. The ingestion pipeline only ever fetches from Greenhouse, Lever,
  Ashby, Personio, and SmartRecruiters' own public APIs (`feed()`'s
  hardcoded platform list - anything else returns `[]`), plus Adzuna/Jooble
  behind their own API credentials (`disabled_missing_credentials` when
  unset), plus EURES via its own dedicated function - exactly matching the
  compliance doc's permitted-sources list, with no path for an
  arbitrary/unapproved source to be added without a code change. Cron-secret
  gated (`x-cron-secret` header check before any work runs). **No fix
  needed** - this is the code-correctness half of the #110 finding; only the
  documentation was wrong.
- **Interview workflow** (2026-08-21): the three interview AI routes
  (`api/ai/interview`, `api/ai/interview-answer`, `api/ai/technical-interview`)
  all correctly use the reserve/confirm/release billing pattern from #100 and
  the prompt-injection guard from #98 (`UNTRUSTED_CONTENT_GUARD`, confirmed
  present in every `generate*WithOpenAI` function in `openai-server.ts`, not
  just some). The interview-prep routes are stateless - the client sends the
  full application/profile/job context in the request body rather than an ID
  the server looks up, so there's no IDOR surface from a client-supplied
  application/interview ID. `api/sync/interviews` and
  `interview-workflow-repository.ts`'s `upsertInterview`/`readInterviewWorkflow`
  consistently scope every read/write to the server-derived `userId`, never a
  client-supplied one. **No fix needed.**
- **CV import: GitHub and LinkedIn sources** (2026-08-21, alongside #111/#112):
  `enrichCvFromGitHub` (`lib/cv/sources/github.ts`) only ever calls the fixed,
  trusted `api.github.com` host - `username`/`repo.name` are URL-encoded path
  segments, not something that can redirect the request elsewhere, and the
  optional user-supplied GitHub token is used transiently for that one
  request, never persisted. Bounded to ~17 requests per enrichment (5
  featured repos x 3 calls + 1 listing + 1 optional GraphQL call). The PDF
  import path (`lib/pdf-cv.ts`, behind `/api/profile/import-cv`) has a 5MB
  upload cap and a magic-byte check; a theoretical PDF-internal decompression
  bomb is accepted as a low-priority residual risk bounded by Vercel's own
  per-invocation timeout, not fixed here. `enrichCvFromLinkedInZip`
  (`lib/cv/sources/linkedin-import.ts`) turned out to be **entirely
  client-side** - a `"use client"` component whose own status message says
  "The ZIP was processed in this browser and was not uploaded" - so a
  malicious LinkedIn-export zip could at most crash the uploading user's own
  tab, never the server; not a fixable server-side defect. **No fix needed.**
- **Extension autofill/DOM-injection** (2026-08-21): read the actual fill
  logic in `apps/extension/contents/autofill.ts` and `lib/autofill.ts`.
  Multiple independent safety layers, not just one: `canFillInput`/
  `canFillTextarea` require the target field to be empty, visible, and
  neither disabled nor read-only; `allowedInputTypes` whitelists only
  `email`/`search`/`tel`/`text`/`""` (no `password`); every fill is
  user-triggered from the widget, never automatic on page load; and
  `getAutofillRoot()` scopes LinkedIn specifically to the open Easy Apply
  modal - autofill silently declines if the modal isn't open, matching the
  documented LinkedIn policy. The widget UI itself is Shadow-DOM isolated
  from the host page. **No fix needed.**
- **Account deletion (GDPR Article 17)** (2026-08-21, alongside #115):
  `DELETE /api/account` deletes only the calling user's own `auth.users` row
  (`user.id` from the validated session, never client-supplied), and the
  code comment's cascade/restrict claims were verified against the actual
  migration SQL rather than trusted at face value - every genuine per-user
  table uses `on delete cascade`, while `admin_audit_events.actor_user_id`
  and `market_refresh_requests.requested_by` correctly use
  `on delete restrict` (a deliberate audit-integrity safeguard: an admin
  with audit history can't self-delete their account). Test-auth accounts
  are explicitly blocked from deletion. **No fix needed** - this is the
  code-correctness half of the #115 finding; only the *export* route had a
  completeness gap, not the deletion route.
- **Job-alert email notifications** (2026-08-21): read
  `supabase/functions/sync-job-alerts/index.ts` in full. All untrusted
  external content that lands in the digest email (job `title`, `company`,
  ESCO `missing_skill_labels`) is passed through `escapeHtml` before
  interpolation - genuinely necessary here, since job titles/company names
  originate from third-party sources (Adzuna, Jooble, scraped ATS listings),
  not from this app. Cron-secret gated; matches are fetched per-iteration
  scoped to that profile's own `user_id` via `match_esco_jobs`, never
  cross-user; sends carry a Resend `Idempotency-Key` derived from
  `user_id:jobIds`, so a retried cron run can't double-email the same
  digest; daily/weekly cadence correctly gated by `isDue()`'s elapsed-time
  check against `alert_last_sent_at`, independent of the cron itself
  running daily for both frequencies. The user-facing preference route
  (`PATCH /api/profile/alerts`) is a simple enum update scoped to
  `user.id`. **No fix needed.** Noted, not fixed: the `profiles` query caps
  at 1000 rows with no pagination - a real scalability limit once past
  1000 alert-eligible users, not a security issue at current scale.
- **International mobility sync** (2026-08-21): `api/sync/mobility`
  follows the identical pattern already verified for interviews and
  job-workflow sync - `userId` is always server-derived from the validated
  session, every read/write in `mobility-profile-repository.ts` scopes to
  that `authenticatedUserId`, and `upsertMobilityProfile` enforces
  optimistic concurrency via `expectedUpdatedAt` the same way
  `upsertInterview` does. **No fix needed.**
- **Pricing/billing surface** (2026-08-22): `PricingCard.tsx` is purely
  presentational - `accountPlan`/price IDs are supplied only by
  `pricing/page.tsx`, which derives plan via server-side `getUserPlan(user.id)`
  and price IDs via server-only `getStripePriceEnv()`; nothing client-readable
  is trusted for entitlement. `POST /api/stripe/checkout` accepts a `priceId`
  from the request body but only as a selector into a fixed server allowlist
  (`getCheckoutProduct`) matched against env-sourced price IDs - a client
  cannot substitute an arbitrary/cheaper Stripe price this way - and
  `user.id`/`client_reference_id`/`metadata.user_id` all come from
  `supabase.auth.getUser()`, never the request body. `stripe/webhook/route.ts`
  verifies the signature against the raw body before parsing, and the
  `stripe_webhook_events` idempotency claim (added for #105) gates all four
  handled event types with no bypass path. `SettingsControls.tsx`/
  `UserNav.tsx`/`DashboardShell.tsx` all receive `plan` as a prop threaded
  from a per-request server call (`dashboard/layout.tsx`,
  `dashboard/settings/page.tsx`), never a JWT claim or client storage. The
  reserve/finalize/release pattern from #100/#113 was confirmed applied
  consistently across all 12 AI-consuming routes, with no route calling a
  provider outside the gate, and no client-side-only "Pro" gate found whose
  underlying API route skips its own server-side entitlement check. **No fix
  needed.**
- **Dashboard insights page** (2026-08-22, alongside #117): `dashboard/insights/page.tsx`
  is a thin wrapper around `DashboardExperience.tsx` - all real data comes
  from a single client-side fetch to `GET /api/sync/dashboard`, which uses
  the service-role client (bypasses RLS) but consistently scopes every one
  of its 10+ queries to `auth.user.id` from the validated session; the DELETE
  handler additionally re-scopes any client-supplied `applicationId` to
  `user_id`, so a foreign id simply matches zero rows (no IDOR). All stats
  (`getOutcomeAnalytics`) are computed client-side over that already-scoped
  data via simple length/filter counts - no division, so no div-by-zero risk;
  the server-side `pct()` in the Python analytics service (see #117) is
  explicitly `whole <= 0 -> 0.0` guarded. **No fix needed** on authorization
  or aggregation correctness. Was noted, not fixed, at the time of this
  pass: `GET /api/sync/dashboard`'s four table queries (`applications`,
  `evidence_records`, `outcome_records`, `interview_prep_packs`) had no
  `.limit()` at all - unlike the job-alerts cron's 1000-row cap, there
  wasn't even a ceiling here, so a long-tenured user's entire history
  loaded on every dashboard/insights page view. Flagged to the founder as a
  judgment call rather than fixed unilaterally, since a naive `.limit()`
  without a pagination UI to receive the truncated result would silently
  hide a user's own real data. Founder chose "Fix now" - see #135, fixed
  with a generous defensive row ceiling rather than a UI-facing pagination
  change, since this endpoint turned out to be full local-state hydration,
  not a list view.
- **ESCO and account/profile routes** (2026-08-22): audited
  `api/esco/{matches,import-evidence,score-job,questionnaire}`,
  `api/account/me`, `api/account/settings`, `api/profile/onboarding`, and
  `api/cv/github` specifically for mass-assignment and IDOR, not just the
  usual auth-presence check. All four ESCO handlers scope every
  `user_skill_profile`/`esco_questionnaire_answers` read-write to
  `user.id`; `score-job`'s job/occupation lookups turned out to hit
  genuinely public reference tables (`job_listings`, `esco_skills`,
  `esco_occupations`, `esco_occupation_skills` all have
  `select ... to authenticated using (true)` RLS policies, confirmed in
  `20260810120000_esco_adaptive_matching.sql`), so there's no per-user data
  to leak there. `account/settings` and `profile/onboarding`'s PATCH
  schemas are strict Zod allow-lists with no `.passthrough()`, and both
  build their upsert objects field-by-field from validated values rather
  than spreading the raw request body - confirmed there's no path for a
  client to smuggle an extra field (`plan`, `role`, `credits`) into a
  privileged column, and separately confirmed the `profiles` table itself
  has no such columns to begin with (plan/subscription state lives only in
  the separate `subscriptions` table, which neither route touches).
  `cv/github` delegates entirely to the already-audited (alongside
  #111/#112) `lib/cv/sources/github.ts`, which hardcodes `api.github.com`
  for every call - no client-supplied host parameter exists at the route
  layer. **No fix needed** on any of the seven files.
- **Admin read routes and remaining sync routes** (2026-08-22, alongside
  #118): all six admin read routes (`overview`, `users`, `feedback`,
  `ai-operations`, `market-data`, `audit-log`) call `requireAdminRequest`
  with their own specific `*:read` permission, not a shared/generic gate;
  `admin/users` additionally gates email inclusion behind a second, finer
  permission (`users:read_email`) so an admin with only list-view rights
  gets `email: undefined`, not the address; `admin/feedback` and
  `admin/overview` select no `user_id`/email columns at all, so they can't
  leak reporter identity; every query across all six is explicitly bounded
  (`.limit(50)`/`.limit(100)`/`.limit(10)`, no unbounded-query risk).
  `sync/extension`, `sync/profile` (GET/POST/DELETE) all scope every
  read/write to the server-derived session user id, never a client-supplied
  one. `sync/refresh` is intentionally unauthenticated by session - by
  design it exchanges a client-held Supabase refresh token for a new access
  token (mirroring Supabase's own token endpoint), never trusts a
  client-supplied user id, and cannot be used to refresh or invalidate
  another user's session without already possessing that user's refresh
  token - the same precondition needed to attack Supabase's own endpoint
  directly, so this route adds no new exposure. **No fix needed** beyond
  #118's cache-header inconsistency (found during this same pass). Was
  noted, not fixed, at the time of this pass: `admin/users` hardcoded
  `listUsers({ page: 1, perPage: 50 })` with no pagination and no
  indication more users existed past the 50th - a real completeness/UX gap
  once the user base exceeds that, not a security issue. Flagged for the
  founder alongside the dashboard's unbounded-query item above, since both
  were "add real pagination" problems rather than one-line fixes. Founder
  chose "Fix now" for both - see #134 (real pagination, this route) and
  #135 (a defensive row cap, the dashboard's different shape of problem).
- **Job-workflow sync route** (2026-08-22, alongside #119): a prior audit
  this session had asserted `api/sync/job-workflow` "follows the same
  pattern" as mobility/interviews purely by analogy, without actually
  reading it - this pass read `route.ts`, `job-workflow-repository.ts`, and
  `job-workflow-sync.ts` in full to verify that claim rather than repeat
  it. It mostly held up: `userId` is always server-derived via
  `getRequestUser`, never client-supplied; the `PUT` body is strictly
  Zod-parsed with no passthrough, and `user_id` in every upsert payload is
  always the server-derived value, not taken from the client; every
  upsert uses the same CAS-guarded `expectedUpdatedAt` pattern
  (`.eq("updated_at", existing.updated_at)` on the actual write, not just a
  pre-check, so it's race-safe); attempting to reuse another user's row id
  hits the primary-key unique constraint (`23505`), surfaced as a
  conflict, not a silent overwrite; and the
  `AUTOTIME_JOB_WORKFLOW_SERVER_SYNC_ENABLED` flag is checked first in both
  `GET` and `PUT`, with no partial-write path when it's off. Two real gaps
  did turn up, both fixed in #119 (see above). Was a judgment call for the
  founder, not fixed, at the time of this pass: `reconcileJobWorkflow` had
  no deletion propagation at all - if a job/application was deleted locally
  but still existed on the server, the next sync would silently **restore
  it from the cloud**, and no `DELETE` endpoint existed for this feature.
  This was a real design gap needing a schema decision (soft-delete/
  tombstone tracking), not a one-line fix, and it's likely exactly why this
  feature had sat behind `AUTOTIME_JOB_WORKFLOW_SERVER_SYNC_ENABLED=false`
  with a "test manually before enabling in production" comment in
  `.env.production.example` - this pass gave a concrete, named reason why
  that caution was warranted. Founder chose "Design tombstone support
  (Recommended)" - see #137, which ships the full schema + repository +
  endpoint + reconciliation-guard machinery, deliberately stopping short of
  a delete UI (none exists in the product yet, so its UX is a separate
  product decision).
- **`api/sync/dashboard`'s applicationId handling** (2026-08-22, alongside
  #120): the same sweep that found #120 also flagged this route's
  `applicationIdMap` fallback (`evidence_records`/`outcome_records`/
  `interview_prep_packs` all fall back to a raw client-supplied
  `applicationId` when it isn't in the map) as a lower-confidence lead
  worth checking directly rather than either dismissing or assuming it was
  a bug. Traced it in full: all three tables' FKs to `applications` are
  `on delete cascade` (same risk shape as #119/#120 if unverified), but
  this route already gates the fallback by construction - `evidence_records`
  /`outcome_records`/`interview_prep_packs` are filtered (lines ~814-826)
  to only include records whose `applicationId` matches an entry in the
  *same request's own* `activeApplications` list, and `applications.id` is
  the primary key with `applications` always upserted with
  `user_id: auth.user.id` - so a client attempting to claim another user's
  real application id as its own would collide on that primary key and
  fail the whole request with a database error, not silently succeed.
  **No fix needed** - confirmed safe by construction, not merely assumed.
- **Postgres RPC layer** (2026-08-22, alongside #124): every API route
  audited this session enforces authorization at the Next.js layer -
  deriving `user.id` from a validated session, then calling Postgres RPCs
  via the service-role client with that id as a parameter - resting on an
  assumption that had never itself been directly verified: that these RPCs
  aren't ALSO directly callable by an ordinary end user via
  `supabase.rpc(...)` from the browser (which uses the `authenticated`
  role, not `service_role`). Confirmed this holds: every genuinely
  `security definer` RPC (`reserve_ai_call`, `confirm_ai_call`,
  `release_ai_call`, `increment_ai_rate_limit`, `grant_ai_credit_pack`,
  `consume_ai_credit`, `classify_job_listings_esco`, the admin/workflow
  RPCs, and the two `auth.users` trigger functions) is `revoke`d from
  `public`/`anon`/`authenticated` and granted only to `service_role` - none
  reachable by a client at all. The few RPCs that ARE granted to
  `authenticated` (`match_esco_jobs`, `get_ai_credit_balance`, and now
  `get_monthly_ai_calls` per #124) are all `security invoker`, and every
  table they read has an RLS policy scoping rows to `auth.uid() = user_id`
  - so even a spoofed `p_user_id` argument from a malicious direct RPC call
  returns nothing, regardless of what's passed. Also checked: every
  `security definer` function has `set search_path = public` pinned (the
  classic schema-shadowing privilege-escalation vector), and none build
  dynamic SQL via `execute format(...)`. **No fix needed** beyond #124's
  consistency fix.
- **RLS coverage across every table in the schema** (2026-08-22, alongside
  #125): the single most consequential remaining assumption in this whole
  session - every API route's careful `user.id`-scoping is worthless if
  Postgres RLS itself (the only thing standing between the browser's
  public anon key + a user's own JWT and direct, unrouted access to
  Supabase's REST API) has a hole anywhere. Re-verified from scratch
  against the CURRENT set of 44 tables, not by trusting the "41 tables"
  figure from an audit early in this session that predates roughly a
  dozen tables added since (all 7 job-workflow/interview tables,
  `cover_letters`, `outreach_contacts`/`outreach_messages`,
  `user_skill_profile`, `esco_questionnaire_answers`,
  `ai_credit_ledger`, `stripe_webhook_events`, and the admin/workflow
  tables). Read every `create table` across all 35 migration files: no
  table was ever created without RLS, no table ever had RLS disabled after
  the fact, and no policy was ever dropped without a replacement. Result:
  39 tables with RLS + correct per-user (or service-role-only) scoping, 5
  correctly public/reference data with an intentional `using (true)`, 0
  problems. Specifically confirmed `admin_memberships`/`admin_audit_events`
  /`market_refresh_requests` (explicit revoke from
  public/anon/authenticated, grant to service_role only - the most
  defensively built tables in the schema, with `admin_audit_events`
  additionally rejecting UPDATE/DELETE via trigger even from the row's own
  owner) and `ai_credit_ledger` (client can read their own ledger, all
  mutations gated through already-locked-down `security definer`
  functions, no forgeable insert/update path). **No fix needed** beyond
  #125's consistency fix - the earlier "41 tables" conclusion still holds
  after full re-verification against the current schema.
- **Extension auth-token lifecycle** (2026-08-22, alongside #129): traced
  the dashboard session token's full lifecycle - storage
  (`chrome.storage.local`, plaintext, no encryption - standard for MV3,
  confirms zero obfuscation), the write path (`ExtensionConnect.tsx` ->
  `chrome.runtime.sendMessage`, restricted by `externally_connectable` to
  the production origin, -> `onMessageExternal` -> `isTrustedSender` origin
  check -> `parseAccountSession` strict validation -> `saveAccountSession`,
  called from nowhere else but the background script), and every read
  site. No logging/telemetry leak found: `normalizeDiagnosticDetails`
  actively strips any key matching `/token|secret|password|authorization/i`
  before persisting diagnostic entries, and `reportClientIssue` only ever
  transmits `area`/`code`/`message` strings, never the session object.
  Was a judgment call for the founder, not fixed, at the time of this pass:
  the content script (`contents/autofill.ts`, `lib/match-overlay.ts`),
  injected on every visited page by design, called `getAccountSession()`
  directly and put `authToken` straight into fetch headers from within its
  own execution context - a larger exposure surface than if only the
  background script (never injected into web content) touched the raw
  token. No current XSS vector was found in the content script's own
  rendering (verified `escapeHtml` usage on user- and job-description-
  derived text at the relevant call sites), so this was architectural
  exposure, not an active exploit. Founder chose "Fix now (Recommended)" -
  see #136, which went further than the routing fix originally sketched
  here: message-passing discipline alone can't fully close this, since
  `chrome.storage.local`'s `onChanged` event hands the full session to any
  listener with access to that area (content scripts included) regardless
  of what this codebase's own code calls - so the real fix moved the
  session to `chrome.storage.session` (browser-enforced
  `TRUSTED_CONTEXTS`-only access), on top of routing the content script's
  authenticated calls through the background worker.
- **Extension regex parsing, broader ReDoS sweep** (2026-08-22, alongside
  #130): every regex in `lib/job-page.ts`, `lib/autofill.ts`,
  `contents/autofill.ts`, `lib/job-analysis.ts`, `lib/match-overlay.ts`,
  and `lib/validation.ts` read in full and checked for genuine
  catastrophic-backtracking structure, not just "complex-looking"
  patterns. Confirmed clean: `cleanText`'s HTML/entity stripping (single
  negated-class quantifiers, linear regardless of size), the field/answer
  detectors in `lib/autofill.ts` (plain `.includes()` string search, no
  regex/backtracking possible at all), `getExactLabeledText`'s dynamically
  built label pattern (anchored, single trailing `.+`), and the
  email/phone regexes in `validation.ts` (only ever applied to short
  user-typed profile fields, never attacker-controlled page content). The
  one real gap found (unbounded scan, not exponential) is #130 above.
  **No fix needed** beyond that one.
- **Admin impersonation, remaining SSRF surfaces, OAuth callback, and
  shared schemas** (2026-08-22): checked for an "act as user"/impersonation
  feature anywhere in the admin panel - none exists at all, so there's
  nothing to audit there. Swept every server-side `fetch()`/`fetchImpl()`
  call site across `apps/web/lib` for a user-supplied-URL SSRF surface
  beyond the one already fixed (#111) - every other site is either a
  server-controlled fixed endpoint (OpenAI's API in
  `lib/interview-prep.ts`, the ATS/aggregator feeds' hardcoded platform
  URLs already verified clean earlier this session) or the already-fixed
  portfolio/GitHub CV importers - no new SSRF surface exists.
  `auth/callback/route.ts` delegates PKCE code-verifier handling entirely
  to Supabase's SDK (`exchangeCodeForSession`) rather than implementing it
  itself, and correctly signs a non-admin out before completing an
  `/admin`-bound redirect. `packages/shared/src/schemas.ts` (used by both
  web and extension) is a data-shape contract for client-side/sync
  payloads, not an input-validation security boundary - every actual API
  route already enforces its own stricter, length-bounded Zod schema
  before untrusted input ever reaches code that uses these shared types,
  confirmed by cross-referencing several already-audited routes. **No fix
  needed anywhere in this pass.**
- **Decision Index / fit-scoring engine, broader correctness sweep**
  (2026-08-22, alongside #131): read `fit-model.ts`, `country-rules.ts`,
  and the international assessment/migration/orchestration modules in
  full and hand-traced worked examples through the most complex scoring
  functions, not just pattern-matched for suspicious-looking code. `evaluateAutoTimeFitScore`'s
  score-breakdown `maxPoints` sum to exactly 100 as documented; every
  sub-score is clamped to its own max; label/threshold ladders
  (`getStatus` 35/55/75, `getFitLabel` 50/65/80, `getApplicationPriority`
  50/65/80, `orchestration.ts`'s `fitDecision` 50/65) are all
  non-overlapping and consistently `>=`-based with no gaps between them;
  `evaluateCountryFit`'s `overallScore` averages a fixed 6-component
  array, so no divide-by-zero risk; `getLanguageBarrierScore`'s
  low-is-easier orientation was checked against its actual UI consumer
  and is correctly signed; `orchestrateJobDecision`'s branch order only
  ever escalates caution (nothing overrides toward "Apply"), the safe
  direction for this product. The one real bug found is #131 above.
  **Judgment call for the founder, not changed**: `getConfidence` returns
  `"High"` confidence whenever a hard blocker is present - i.e. it
  measures certainty-of-verdict, not positivity-of-outcome. Plausible
  intentional design ("we're confident this should be skipped"), but
  worth confirming that's the intended reading, since "High confidence"
  displayed next to a rejection could read as counterintuitive in the UI.
- **Readiness/transition gate, broader correctness sweep** (2026-08-22,
  alongside #132): read `job-application-workflow.ts` in full and
  hand-traced worked examples through the two most safety-critical
  functions. `getApplicationReadiness` correctly uses
  `unsupportedClaims.length > 0` (not array truthiness) so an empty array
  never blocks and any non-empty array always does; `createApplication`
  and `cloudApplicationToWorkspaceJob` both default `unsupportedClaims` to
  `[]` and `evidenceConfirmed`/`consequentialAnswersReviewed` to `false` -
  restrictive, not permissive, defaults. `analyseJob`'s decision ternary
  chain and its "single weak requirement" carve-out were traced and match
  their accompanying comments, with no AND/OR inversion. The one real bug
  found is #132 above; every other transition in `transitionApplication`
  (backward moves among `Preparing`/`Needs review`/`Ready`, and the
  dedicated `Applied`->`Interview`/`Offer`/`Rejected`/`Withdrawn`
  sub-machine) was checked and correctly guarded. **No fix needed** beyond
  #132.
- **Interview state machine, broader correctness sweep** (2026-08-22,
  alongside #133): read `interview-workflow.ts` in full and hand-traced
  worked examples through `getInterviewReadiness` and
  `getInterviewHomeSignals`. `getInterviewReadiness`'s blocker/label logic
  is correct (a 4-question worked example with one clean, one
  unsupported-claim-blocked, one unanswered, and one missing-evidence
  question correctly landed on "Needs attention"); `markedForPractice:
  confidence !== "high"` has the correct polarity, not inverted; every
  boolean default (`answerDraft?.confirmed`, etc.) is restrictive, not
  permissive; the 72-hour "interview soon" window
  (`hours >= 0 && hours <= 72`) is correctly directional; cross-file
  scoping of `applicationId`/`jobId` on interview records is correct in
  isolation. The two real bugs found are #133 above. **No fix needed**
  beyond that.
- **Systematic sweep for the #132/#133 bug class** (2026-08-22): both real
  bugs found so far in this session's correctness pass shared one
  precondition - a dedicated transition-guard function establishing
  restricted/terminal states, plus a SEPARATE function that writes
  `status` directly, bypassing that guard. Searched every file in
  `apps/web/lib`, `apps/extension/lib`, and `packages/shared/src` for that
  same precondition (a local `order`/`allowed` transition map alongside
  any other direct `status:` assignment). No third instance exists: the
  extension's own application/sync-state tracking
  (`getApplicationSyncState`/`updateApplicationSyncState` in
  `apps/extension/lib/storage.ts`) is a simple pending/synced/failed
  tracker with no terminal-state concept to bypass; the admin-panel status
  fields (`admin-market-data.ts`, `admin-feedback.ts`,
  `admin-monitoring.ts`) are DB-driven display/refresh statuses with no
  local pure-function state machine at all; `packages/shared/src` has no
  transition-guard pattern anywhere. **No fix needed** - #132 and #133 are
  the complete set for this bug class.
- **ESCO job-classification scoring** (2026-08-22): read
  `classifyJobToEsco` (`lib/esco/classify-job.ts`) and `score-job`'s
  matched/missing-skill computation in full. No clear-cut logic bug -
  the exact-match path, `words()`'s Unicode-normalization for accent
  insensitivity, and the matched/missing skill split (essential skills
  cross-referenced against confirmed `user_skill_profile` entries) are all
  sound. **Judgment call for the founder, not changed**: the token-overlap
  confidence score is normalized by the *occupation's* own token count
  (`overlap = matchingTokens / occupationTokenCount`), not the job
  description's - this systematically inflates confidence for occupations
  with short preferred-label/description text relative to occupations
  with long, detailed ones, since a short label needs fewer matching
  tokens to reach a high overlap ratio. This is a modeling/tuning
  characteristic of a deliberately simple bag-of-words classifier, not an
  implementation error with an obviously "correct" fix - flagging for the
  founder's awareness rather than changing the scoring formula
  unilaterally, since the intended precision/recall balance for this
  feature isn't something to guess at.

Everything above was independently re-run after its fix merged to confirm
the fix actually worked in the live environment, not just that CI was
green on the PR.

## Known gaps

Documented honestly rather than silently glossed over:

- **Two accepted dependency-review exceptions**, both allow-listed in
  `dependency-review.yml` with justification recorded in the workflow
  itself, not silently ignored - revisit each if/when an upstream fix
  ships:
  - GHSA-jmr9-qjv8-65gv (`extract-zip` symlink path traversal, high),
    transitive via `@lhci/cli` -> `lighthouse` -> `puppeteer-core` ->
    `@puppeteer/browsers`. No patched release exists (2.0.1 is latest).
    Used only to unpack pinned Chrome-for-Testing binaries from Google's
    own CDN during local/CI Lighthouse runs - never untrusted zip content.
  - GHSA-w3rx-r6r6-pgpr / GHSA-5p2g-fcmc-qvqq (`image-size` ICNS/JXL/HEIF
    parser DoS, high), transitive via `apps/extension`'s
    `@wxt-dev/module-react` -> `vite` -> `less`. No patched release exists
    (2.0.2 is latest). Dev-only build-tool dependency of the extension
    bundler - never parses user-supplied images at runtime.
  - Every other dependency flagged by `pnpm audit`/Dependabot when the
    dependency graph was enabled during this pass had a real upstream fix
    and was bumped directly (`next` 16.2.4 -> 16.3.1 plus a `pnpm.overrides`
    block for `tmp`, `vite`, `ws`, `protobufjs`, `uuid`, `shell-quote`,
    `adm-zip`, `fast-uri`, `postcss`, `nanoid`, `js-yaml`, `esbuild`,
    `dompurify`, `@opentelemetry/core`, `@babel/core`, and `brace-expansion`)
    - not exceptions, real fixes, verified via full typecheck/build/test.
- **AI-side prompt-injection defense is instruction-level, not
  output-side.** As of #98, every AI generation call explicitly instructs
  the model to treat supplied content (job descriptions, CVs, GitHub
  imports) as data only and disregard embedded commands, on top of the
  Responses API's own `input`/`instructions` channel separation
  (`scripts/ai-quality-evaluation.test.mjs`'s AI-006 and AI-010 cases
  verify both). There is still no output-side filtering if a future prompt
  change ever merges the channels, and strict Zod schema validation on
  every response is what actually bounds a successful injection's impact
  (it can only manipulate fields the schema defines, never produce
  arbitrary output or trigger actions). Revisit if the AI feature set
  changes materially.
- **Single QA account limits *dynamic* cross-user data-isolation testing.**
  `tests/e2e/production/09-error-and-isolation-states.spec.ts` verifies
  unauthenticated/unauthorized rejection, not genuine cross-account data
  leakage with two live accounts, since there is only one QA account by
  design. Mitigated by a full static audit (2026-08-21, see "Pre-release
  validation" above) of every RLS policy and every service-role-bypassing
  API route, which found no path where a client-supplied user id can
  substitute for the authenticated session's own id - but a live
  two-account test would still be the stronger guarantee if a second QA
  account ever becomes available.
- **Authenticated Lighthouse run is best-effort.** Real dashboard content
  varies with whatever's seeded on the QA account; the budget
  (`scripts/lighthouse-dashboard.mjs`) is deliberately softer than the
  public-page budget and not wired as a hard CI gate.
- **`lint` is currently a `tsc --noEmit` alias, not real ESLint**, despite
  `eslint`/`eslint-config-next` being installed as (unused, version-
  mismatched) devDependencies. Pre-existing, unrelated to this branch - not
  changed here to keep this change surgical, flagged for a future pass.
- **k6 binary verification gap**: the k6 CLI isn't installed on every
  contributor machine by default (Node/pnpm alone don't provide it) -
  `k6/smoke.js` was reviewed for correctness but not executed locally
  during this branch's authoring session; verify with a real `k6 run`
  before relying on it in CI.
- **Windows-local Lighthouse verification**: `pnpm test:lighthouse` was
  verified to complete the full audit locally on Windows, but
  `chrome-launcher`'s post-audit temp-directory cleanup can throw `EPERM`
  on Windows (a known upstream issue, unrelated to this repo's config) -
  does not reproduce on the Ubuntu CI runners used everywhere in this repo.
- **Checkly and ZAP active-scan tiers are not deployed/enabled.** Both are
  fully configured but require a human decision (and, for Checkly, an
  account) before going further than what's described here.
- **Several extension-facing docs still describe the removed Chrome side
  panel.** `docs/extension-smoke-test.md`, `docs/mvp-spec-alignment.md`,
  `docs/technical-debt.md`, `docs/v2-smoke-test.md`,
  `docs/founder-first-realtime-testing-guide.md`, and
  `docs/first-time-user-demo-video.md` all give step-by-step instructions
  referencing a Chrome side panel. Confirmed the manifest no longer declares
  a `sidePanel` permission and nothing imports `apps/extension/sidepanel/`
  (2026-08-21 documentation pass) - the extension now uses an in-page widget
  instead. Not rewritten yet: describing the current widget's exact
  navigation/labels accurately needs a live extension walkthrough rather
  than guessing from source, to avoid replacing one stale doc with another
  fabricated one.
- **CSP still allows `script-src`/`style-src` `'unsafe-inline'`, and there
  is no `Cross-Origin-Embedder-Policy` header.** Both are real, deliberate
  deferrals from #99, not oversights. Removing `unsafe-inline` needs a
  nonce-based CSP threaded through middleware and every inline
  script/style, including third-party embeds (Stripe, PostHog) - a real
  refactor, not a header addition. Adding COEP would require every
  cross-origin resource (Stripe.js, PostHog) to opt in via its own
  CORP/CORS headers, which aren't under this app's control - real risk of
  silently breaking checkout/analytics, for a scan warning with no
  practical benefit here (no `SharedArrayBuffer`/cross-origin-isolation
  need). Revisit only if either becomes a genuine requirement.
