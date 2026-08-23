# Current Test Inventory

Verified by direct file/directory enumeration against `main` @
`130ca9ae5f9038e4eece27ad9a3eb549af431a3a` (2026-08-23). This document
records what automated coverage actually exists on disk today, not what
prior documentation claims exists. Where a prior claim is checked against
reality, both figures are shown.

## 1. Unit / integration / API tests (non-Playwright)

- `scripts/*.test.mjs` — 22 files: `admin-foundation`,
  `ai-quality-evaluation`, `country-fit-model`,
  `decision-quality-evaluation`, `international-audit`,
  `international-mobility-persistence`, `international-module`,
  `international-phase2-entry-gate`, `interview-workflow-sync`,
  `job-aggregation`, `job-workflow-migration-safety`,
  `job-workflow-sync`, `market-ready-gate`,
  `mobility-migration-safety`, `phase-3a-readiness`,
  `phase-3b-workflow`, `phase-3c-interviews`, `platform-coverage`,
  `production-hardening`, `role-pathways`,
  `role-pathways-persistence`, `smoke-web-dashboard`,
  `validation-run`.
- `apps/web/tests/*.test.mjs` — 17 files: `account-export`,
  `admin-users-pagination`, `auth-error-messages`, `cloud-sync`,
  `dashboard-content-snapshot`, `docx-cv`, `environment-boundaries`,
  `image-signature`, `interview-prep`, `linkedin-import`,
  `outreach-contact-import`, `portfolio-ssrf`, `request-ip`,
  `role-intelligence-nvidia`, `safe-redirect-path`,
  `sentry-privacy`, `status-tone`.
- `apps/extension/**` — no per-file `*.test.*` pattern. A single
  custom runner, `apps/extension/tests/run-tests.mjs`, is invoked via
  `pnpm --filter extension test`. Its internal coverage depth is not
  yet independently assessed — see `01-gap-analysis.md`.
- `package.json`'s `test:unit` chains all of the above (~34 pnpm
  scripts) sequentially with `&&`, plus `test:ai-quality` and
  `test:mvp:coverage`. It is one composite command, not a native
  parallel runner.
- **Verified full-chain result at HEAD**: `pnpm test:unit` — every
  sub-suite reported `fail 0` (run 2026-08-23 as part of the
  post-merge integration check documented in
  `docs/quality-assurance.md`'s "Merge-queue closure" section).

## 2. Playwright end-to-end

- `tests/e2e/` — 26 spec files (numbered 01–36 with intentional gaps)
  plus a shared `helpers.ts`. Representative spread: `01-smoke`,
  `07-sentry-route-protection`, `08-extension-linkedin-sync`,
  `09-international-phase1`, `13-phase-3b-visual-acceptance`,
  `14-admin-foundation-security`, `22-phase-1-home-visual`,
  `25-phase-2-jobs-analysis`, `26-phase-3-applications`,
  `31-mobility-facts-reuse`, `34-core-journeys`,
  `35-outreach-contact-import`, `36-account-menu-stacking`.
- `tests/e2e/production/` — 9 **authenticated production** specs
  (`01-auth-and-access` … `09-error-and-isolation-states`) plus
  `helpers.ts`. Designed to be read-mostly and non-AI-triggering
  (confirmed by naming and by the `production-smoke.yml` workflow
  comment). Gated on the `QA_SESSION_URL` secret — every spec skips
  (not fails) when it's absent.
- `playwright.config.ts` honours an external `PLAYWRIGHT_BASE_URL`
  and skips spinning up a local `webServer` when the target isn't
  localhost — genuinely supports both local-fixture and
  against-a-real-deployment runs from the same config.

## 3. Visual regression

- Only **one** spec uses `toHaveScreenshot()`:
  `tests/e2e/visual/key-states.spec.ts`.
- Baselines: `tests/e2e/visual/key-states.spec.ts-snapshots/` — 12
  PNGs (dashboard, jobs, interviews, applications empty states, plus
  landing and login, each at desktop 1440×900 and mobile 390×844).
- **Gap**: no admin, populated, loading, error, or blocked-state
  baselines exist. The master test plan (`05-master-test-plan.md`)
  will list the missing states as new `E2E-VIS-###` cases.
- `.github/workflows/visual-regression.yml` exists, manual dispatch
  only — does not run on every PR.

## 4. Accessibility (axe)

- Single shared helper: `tests/e2e/helpers/axe.ts`, wrapping
  `@axe-core/playwright`'s `AxeBuilder`.
- Imported by 11 specs: `01-smoke`, `22-phase-1-home-visual`,
  `25-phase-2-jobs-analysis`, `26-phase-3-applications`,
  `27-phase-4-interviews`, `28-phase-5-countries`,
  `29-phase-6-career-direction`, `30-phase-7-profile`,
  `33-phase-8-landing-login`, plus production
  `02-dashboard-navigation` and `08-countries`.
- **Gap**: admin pages, applications pipeline detail views, and the
  extension's in-page widget are not covered by any axe assertion.

## 5. Lighthouse

- `lighthouserc.json` — desktop preset, single run, scans `/` and
  `/login` only, against a locally built `pnpm --filter web start`
  server. Budgets: performance warn <0.75, accessibility error <0.90,
  best-practices warn <0.85, SEO warn <0.80.
- `scripts/lighthouse-dashboard.mjs` — separate authenticated
  dashboard run, uses the same `QA_SESSION_URL` bootstrap pattern,
  runs only when that secret is present.
- **Gap**: no committed history of authenticated-dashboard Lighthouse
  results; that script's last actual run (if any) is unverified from
  the repo alone.

## 6. Security-scanning configuration

- `codeql.yml` — JS/TS analysis; PR→main, push→main, weekly cron.
  Latest run on HEAD: **success** (verified via `gh run list`).
- `dependency-review.yml` — PR-only, fails on `high` severity, three
  explicitly justified `allow-ghsas` exceptions on file (lhci's
  bundled puppeteer `extract-zip`, wxt's `image-size`).
- `zap-baseline.yml` — **passive-only** baseline scan (`-a`, no
  active attack rules) against the real production URL, weekly cron
  + manual dispatch, **never on PR**.
- **Gap**: no active/authenticated ZAP scan exists at any tier; no
  penetration-test artefact of any kind existed before this
  assessment (see `docs/security/penetration-test-plan.md`).

## 7. k6

- `k6/smoke.js` (1–2 VUs, ~20s) and `k6/load.js` (default 5 VUs/1
  min, env-configurable) both target only `/` and `/login` —
  unauthenticated, non-mutating, safe by construction.
- Production execution is gated behind `.github/workflows/k6-manual.yml`,
  `workflow_dispatch` only, with a typed confirmation input. Never
  triggered as part of this assessment without separate authorisation.

## 8. Screenshots

- `screenshots/` at repo root — **130 files** (124 `.png` + 6 `.json`)
  across 12 subdirectories: `admin-foundation`, `phase-1-home`,
  `phase-2-jobs-analysis`, `phase-3-applications`, `phase-3a`,
  `phase-3b-1`, `phase-3c`, `phase-4-interviews`, `phase-5-countries`,
  `phase-6-career-direction`, `phase-7-profile`,
  `phase-8-landing-login`.
- This is a **separate artefact** from the "~58 screenshots" figure
  quoted in the assessment brief — see item 9.

## 9. QA case-catalogue claim verification

- `docs/testing/automated-test-case-matrix.md` — a real structured
  table (Test ID / Area / Scenario / Priority / Automation Type /
  Tool / Test Data / Production Safe / Expected Result / Status /
  Notes), but only **~23 rows** (`QA-AUTO-001`–`023`), several marked
  `Planned` or `Manual`.
- `docs/qa/MVP-Test-Matrix-v1.md` — another small structured table,
  mostly `Manual` status.
- **Source of the "123 test cases / 58 screenshots" claim**:
  `docs/qa/AutoTime-EU-Apply-QA-Documentation.xlsx` (6.0 MB, generated
  2026-08-21 by `docs/qa/generate-qa-documentation.mjs`). Directly
  inspecting the OOXML (worksheet XML, not just the filename)
  confirms: "Test Cases" sheet has 123 data rows, "Screenshot
  Gallery" sheet has 57 rows, workbook embeds 59 media images. **The
  123/58 figures are real and verified**, but this is a generated
  report artefact — it has not been confirmed that every row
  corresponds to an actually-executed, currently-passing test rather
  than a planned or historical one. `05-master-test-plan.md` and
  `test-cases.csv`/`test-cases.json` supersede this workbook as the
  structured source of truth going forward; the workbook itself is
  not modified or deleted.

## Summary table

| Area | Files/cases found | Status |
|---|---|---|
| Unit/integration/API | 39 files, ~34-script chain | Verified passing at HEAD |
| Extension tests | 1 custom runner | Coverage depth not yet assessed |
| Playwright local | 26 specs | Exists, not all re-run this pass yet |
| Playwright production | 9 specs | Exists, requires `QA_SESSION_URL` |
| Visual regression | 1 spec, 12 baselines | Thin — missing admin/error/populated states |
| Accessibility (axe) | 11 specs | Missing admin + extension widget coverage |
| Lighthouse | 2 public pages + 1 dashboard script | Dashboard run history unverified |
| CodeQL | Weekly + PR/push | Latest run green |
| Dependency review | PR-only | 3 documented exceptions |
| ZAP | Passive only, weekly | No active/authenticated scan exists |
| k6 | 2 scripts, public pages only | Production run never triggered automatically |
| Screenshots | 130 files, 12 subdirs | Separate from the 58-screenshot workbook claim |
| QA case workbook | 123 rows / 57 screenshot rows | Verified to exist; execution status per-row unconfirmed |
