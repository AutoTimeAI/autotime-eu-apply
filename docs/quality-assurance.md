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
