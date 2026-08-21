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

## Known gaps

Documented honestly rather than silently glossed over:

- **One accepted dependency-review exception**: GHSA-jmr9-qjv8-65gv
  (`extract-zip` symlink path traversal, high severity), transitive via
  `@lhci/cli` -> `lighthouse` -> `puppeteer-core` -> `@puppeteer/browsers`.
  No patched `extract-zip` release exists upstream (2.0.1 is latest). Used
  only to unpack pinned Chrome-for-Testing binaries from Google's own CDN
  during local/CI Lighthouse runs - never untrusted/user-supplied zip
  content - so allow-listed in `dependency-review.yml` with that
  justification recorded in the workflow itself, not silently ignored.
  Revisit if extract-zip ships a fix, or if `@lhci/cli` drops the
  puppeteer-core dependency.
- **No active AI-side prompt-injection defence.** `openai-server.ts`
  structurally separates user content (the `input` field) from system
  instructions (the `instructions` field) when calling the OpenAI Responses
  API - `scripts/ai-quality-evaluation.test.mjs`'s AI-006 case verifies
  this separation holds - but there is no output-side filtering if a
  future prompt change ever merges the two. Revisit if the AI feature set
  changes materially.
- **Single QA account limits true cross-user data-isolation testing.**
  `tests/e2e/production/09-error-and-isolation-states.spec.ts` verifies
  unauthenticated/unauthorized rejection, not genuine cross-account data
  leakage, since there is only one QA account by design.
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
