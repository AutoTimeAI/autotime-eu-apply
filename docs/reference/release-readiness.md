# Release Readiness

Use this checklist before tagging an MVP build or sharing the unpacked Chrome
extension with testers.

## Privacy Basics

- Extension profile, reusable-answer, and tracker data is local-first in
  `chrome.storage.local` unless the extension is linked to a web account.
- The extension does not auto-submit forms.
- Autofill and saved-content insertion only run after an explicit user action
  in the extension's in-page widget.
- Saved application content is inserted only into empty matching textareas.
- AI-assisted generation (job analysis, cover letters, tailored CVs, interview
  prep) runs server-side in `apps/web` against AutoTime's own OpenAI key, and
  is gated by the user's subscription/credit balance - see
  `../README.md#product-architecture`.
- Web dashboard account data lives in Supabase, with row-level security
  enforced per-user; see `docs/product-security-protocols.md`.
- Clear saved-data controls are available for profile, reusable answers, job
  analysis, application content, tracker draft, and usage log.

## Release Checks

Run the semi-automated release check first:

```bash
pnpm release:check
```

This writes a timestamped report to `docs/release-runs/` and leaves manual
Chrome/live-job checks as explicit pending items.

Create a fresh founder validation evidence file before starting manual browser
checks:

```bash
pnpm validation:new
```

This writes a timestamped report to `docs/founder-validation-runs/` with the
automated gates, Chrome smoke test, dashboard smoke test, live job evidence,
CSV exports, and release decision sections ready to fill.

Run the broader MVP automation toolkit when validating the dashboard, AI
interview prep, and deployed web smoke path:

```bash
pnpm test:mvp
```

This writes a timestamped report to `docs/automation-runs/`. Use
`SKIP_LIVE_SMOKE=1 pnpm test:mvp` when network access is unavailable.

The 90-95% automated testing target is defined in
`docs/mvp-testing-automation.md` and enforced by:

```bash
pnpm test:mvp:coverage
```

1. Run `pnpm --filter extension test`.
2. Run `pnpm --filter extension typecheck`.
3. Run `pnpm -r typecheck`.
4. Run `pnpm -r lint`.
5. Run `pnpm build:extension`.
6. Run `pnpm validation:new`.
7. Load or reload `apps/extension/.output/chrome-mv3` in Chrome.
8. Complete `docs/extension-smoke-test.md`.
9. Confirm no extension flow submits an application form.
10. Confirm generated or saved content requires an explicit user click before
    insertion.
11. Confirm CSV export contains only the user's locally saved applications.
12. Record the smoke-test result, live job checks, exported validation metrics,
    and release decision in the generated founder validation report.

## Known Risks

- AI-backed generation is billed server-side; verify the reserve/confirm/
  release flow and rate limits before a wider release rather than assuming
  cost is bounded by a user-supplied key.
- Job-board and ATS extraction is selector/JSON-LD based; the live platform
  list is checked weekly by `.github/workflows/platform-coverage.yml`, but a
  selector regression on a specific site can still slip through between runs.
  LinkedIn remains manual copy/paste only.
- Extension data not linked to a web account is browser-local; users need to
  export CSV or link an account if they want a backup of saved applications.
- Native mobile and deeper analytics remain post-MVP work; Supabase account
  sync, cloud hosting, and billing are live in production, not pending V2
  work.

## Validation Report

Use `docs/founder-validation-report.md` as the report template for each manual
Chrome smoke test or live UK/EU job validation pass.
The current final-candidate report is
`docs/founder-validation-runs/2026-05-04-final-mvp-validation.md`.
