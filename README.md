# AutoTime EU Apply

Cross-border job application copilot for European tech (and FinTech)
candidates: a Chrome extension that captures and scores job postings, plus a
production Next.js dashboard for tracking applications, preparing interviews,
understanding country and work-right fit, and getting AI-assisted job
analysis and application content.

This repository is a pnpm monorepo: a WXT Chrome extension, a production
Next.js web app backed by Supabase, and a Python analytics service.

## Apps

- `apps/extension` - Chrome extension built with WXT. Detects job postings on
  supported job boards and ATS platforms, scores fit locally, and links into
  the web dashboard.
- `apps/web` - Production Next.js dashboard: authentication, job tracking,
  applications pipeline, interview preparation, country/mobility guidance,
  role pathways, AI-assisted content generation, Stripe billing, and an admin
  panel. Deployed at <https://autotime-eu-apply.vercel.app>.
- `apps/analytics` - Python FastAPI evidence and outcome analytics service.
- `packages/shared` - Shared domain types and Zod schemas used by both the web
  app and the extension.

Full documentation index: [`docs/README.md`](docs/README.md).

## Product architecture

- **Dashboard** (`apps/web`) is organized around seven primary destinations:
  Home, Career Direction (Role Pathways), Jobs, Applications, Interviews,
  Countries (international mobility), and Profile. See
  `docs/product-information-architecture.md` for the full navigation and
  workflow model.
- **Auth and data**: Supabase (Postgres + Auth). Row-level security is
  enforced per-user on every table; a service-role admin client is used only
  from trusted server-side routes (webhooks, sync, admin).
- **AI-assisted features** (job analysis, cover letters, tailored CVs,
  interview prep, outreach drafts) run server-side using AutoTime's own
  OpenAI key - users do not supply their own key. Usage is gated by an
  atomic reserve/confirm/release flow plus per-user rate limits so
  concurrent requests can't double-spend a user's allowance.
- **Billing**: Stripe subscriptions (Free / Pro) plus one-off AI credit
  packs, both handled by an idempotent webhook handler
  (`apps/web/app/api/stripe/webhook/route.ts`).
- **Admin panel** (`/admin`): role-gated operational tooling, separate from
  the candidate-facing dashboard. See `docs/admin-operations.md`.
- **Extension-to-dashboard bridge**: the extension captures a job page and
  hands off into the dashboard's Jobs/Applications workflow; account linking
  happens through `/dashboard/extension`.
- **Observability**: Sentry error tracking with privacy-redacting event
  filtering, so secrets, tokens, CVs, and job-description content never leave
  the app in an event payload.

## Extension

The extension detects job postings across major EU/international job boards
(Indeed, StepStone, EURES, EuroTechJobs, EuroJobs, NextLevelJobs, Wellfound,
Xing, Welcome to the Jungle, Nationale Vacaturebank, InfoJobs, Monster,
EuroTopTech, JobTeaser) and ATS platforms (Greenhouse, Lever, Workday, Ashby,
SmartRecruiters, iCIMS, BambooHR, Teamtailor, Recruitee, Jobvite, Personio).
LinkedIn remains manual copy/paste only - the extension does not automate or
scrape LinkedIn job pages. The current, authoritative platform list lives in
`apps/extension/tests/fixtures/platform-coverage.json` and is checked weekly
against the live sites by `.github/workflows/platform-coverage.yml`.

Release tagging follows `git tag` (see the latest `v0.1.x` tag for the current
release line); the extension's own package version is tracked separately in
`apps/extension/package.json`. Release-process detail lives in
`docs/release-readiness.md` and `docs/market-ready-mvp-procedure.md`.

The extension currently supports:

- Candidate profile, reusable answers (sponsorship, relocation, work
  authorisation, notice period, salary expectation, motivation, strengths,
  availability), and tracked applications, stored in `chrome.storage.local`.
- A draggable, resizable in-page widget (injected by the content script - not
  a Chrome-native side panel) for reviewing job details, job-fit scoring,
  and the saved-application tracker directly on the job page.
- JSON-LD `JobPosting` extraction plus platform-specific selectors for the
  supported job boards and ATS platforms listed above.
- An ESCO occupation-match overlay on LinkedIn job pages; LinkedIn itself
  remains manual copy/paste only - the extension does not automate or fill
  LinkedIn's own application forms.
- Transparent local job-fit scoring with visible factors, recommendation, and
  positioning angle.
- Basic autofill for common profile and reusable-answer fields on supported
  application forms, with user review before submission - the extension never
  submits an application on the user's behalf.
- Syncing tracked applications to the web dashboard for authenticated users
  (`syncTrackedApplicationsToDashboard`), so tracking and preparation continue
  in `apps/web` once a job is captured.
- CSV export of saved applications.

The extension never submits forms or automates LinkedIn. AI-assisted content
generation (cover letters, tailored CVs, interview prep) happens in the web
dashboard, not the extension, and runs server-side against AutoTime's own
OpenAI key rather than a user-supplied one - see "Product architecture" above.

## Local Setup

Install dependencies:

```bash
pnpm install
```

Create local environment variables from the development template:

```bash
cp .env.local.example .env.local
```

Use separate provider resources for each lane: local and preview should use a
development Supabase project plus Stripe test mode, while production should use
the production Supabase project plus Stripe live mode. The full policy lives in
`docs/environment-strategy.md`.

Run the extension in development:

```bash
pnpm dev:extension
```

Build the extension:

```bash
pnpm build:extension
```

After building, load or reload the unpacked extension from:

```text
apps/extension/.output/chrome-mv3
```

Run the web app:

```bash
pnpm dev:web
```

If the local preview hangs after a previous run, reset stale preview processes
and restart on the fixed local address:

```bash
pnpm dev:web:reset
```

For the fastest preview after a build, run the production preview:

```bash
pnpm build:web
pnpm preview:web
```

Open the dashboard at:

```text
http://127.0.0.1:3000
```

Build the web app:

```bash
pnpm build:web
```

Smoke-test the deployed dashboard:

```bash
pnpm smoke:web
```

Run the mocked unit tests for the smoke automation:

```bash
pnpm test:smoke:web
```

Run the web interview-prep unit tests:

```bash
pnpm test:web:interview
```

Run the MVP automation toolkit and write a timestamped evidence report:

```bash
pnpm test:mvp
```

To skip the live deployed web smoke check:

```bash
SKIP_LIVE_SMOKE=1 pnpm test:mvp
```

Check the 90-95% MVP testing automation target:

```bash
pnpm test:mvp:coverage
```

The coverage model is documented in `docs/mvp-testing-automation.md`.

To test a different preview or production URL:

```bash
WEB_SMOKE_URL=https://your-vercel-url.vercel.app pnpm smoke:web
```

Create a fresh manual validation evidence report before Chrome/live-job testing:

```bash
pnpm validation:new
```

This writes a timestamped file in `docs/founder-validation-runs/` with the
automated gates, extension smoke test, dashboard smoke test, LinkedIn manual
copy/paste check, Greenhouse/Lever/Workday live-job rows, CSV export evidence,
and release decision sections.

Run the validation report generator tests:

```bash
pnpm test:validation-run
```

Deploy the web dashboard to Vercel from the repo root:

```bash
pnpm build:web
```

Use these Vercel project settings:

```text
Framework Preset: Services
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm build:web
Output Directory: apps/web/.next
Root Directory: repository root
```

Vercel serves `apps/web` at `/` and `apps/analytics/main.py` at `/analytics`.
Verify the analytics service after deployment with `/analytics/health`.
The Chrome extension remains a browser extension and is not hosted as a normal
Vercel web app.

## Tests

Run extension unit tests:

```bash
pnpm --filter extension test
```

Run extension typecheck:

```bash
pnpm --filter extension typecheck
```

Run web and external-evidence checks:

```bash
pnpm test:smoke:web
pnpm test:web:interview
pnpm test:v2:ats-live
pnpm test:v2:ai-live
pnpm smoke:web
```

Run Python analytics tests:

```bash
python -m pytest apps/analytics/tests
```

`pnpm test:v2:ai-live` performs the controlled-cost live OpenAI check only when
`OPENAI_API_KEY` is set; otherwise it reports a safe skip.

Current unit tests cover:

- Name splitting for autofill.
- Autofill field detection.
- Reusable answer field detection.
- Safe fill eligibility checks.
- Job page detail inference for tracker import.
- Transparent job-fit scoring and positioning inference.
- Expanded profile storage and legacy profile normalization.
- Reusable answer storage.
- Job analysis, application content, and tracker draft storage.
- Profile and draft validation.
- Saved application create/delete behavior.
- Resilient current-tab application saving with page-detection fallback.
- Saved application search and status filtering.
- Legacy tracker and application status normalization.
- Saved application duplicate URL detection.
- Saved application CSV export formatting.
- OpenAI cost estimation, response normalization, and user-visible fallback
  error formatting.
- Founder validation report generation for manual Chrome/live-job evidence.

## Chrome Extension Notes

The extension uses these Chrome permissions:

- `storage` for `chrome.storage.local`.
- `activeTab` for reading/importing the current job page.
- `scripting` for injecting the in-page widget and autofill logic.

Host permissions are scoped to the production dashboard
(`autotime-eu-apply.vercel.app`) plus the job boards listed in "Extension"
above (`apps/extension/wxt.config.ts`). The content script itself matches all
pages (`*://*/*`) so it can detect and score jobs anywhere, but only makes
cross-origin calls to those explicitly permitted hosts. LinkedIn remains
manual-input only.

After building, load the generated extension from:

```text
apps/extension/.output/chrome-mv3
```

The manual extension smoke-test checklist lives at:

```text
docs/extension-smoke-test.md
```

Run that checklist before shipping an MVP build to testers.

The full MVP spec alignment checklist lives at:

```text
docs/mvp-spec-alignment.md
```

The release-readiness checklist lives at:

```text
docs/release-readiness.md
```

The founder validation report template lives at:

```text
docs/founder-validation-report.md
```

## Repository Notes

Generated folders such as `node_modules`, `.next`, `.output`, `build`,
`.plasmo`, `.wxt`, and TypeScript build info files are ignored by Git.

## Policies

- [`LICENSE`](LICENSE)
- [`PRIVACY.md`](PRIVACY.md) - see the live, authoritative policy at
  [`/privacy`](https://autotime-eu-apply.vercel.app/privacy)
- [`SECURITY.md`](SECURITY.md) - vulnerability reporting
- [`CHANGELOG.md`](CHANGELOG.md)
