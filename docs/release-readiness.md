# Release Readiness

Use this checklist before tagging an MVP build or sharing the unpacked Chrome
extension with testers.

## Privacy Basics

- Data stays local-first in `chrome.storage.local`.
- The extension does not auto-submit forms.
- Autofill and saved-content insertion only run after a user clicks a side-panel
  button.
- Saved application content is inserted only into empty matching textareas.
- No Firebase, backend, or external job API is used in the current extension
  flow.
- AI usage logging records feature name, timestamp, model, and estimated cost,
  but does not send data anywhere by itself.
- Clear saved-data controls are available for profile, reusable answers, job
  analysis, application content, tracker draft, and usage log.

## Release Checks

Run the semi-automated release check first:

```bash
pnpm release:check
```

This writes a timestamped report to `docs/release-runs/` and leaves manual
Chrome/live-job checks as explicit pending items.

1. Run `pnpm --filter extension test`.
2. Run `pnpm --filter extension typecheck`.
3. Run `pnpm -r typecheck`.
4. Run `pnpm -r lint`.
5. Run `pnpm build:extension`.
6. Load or reload `apps/extension/.output/chrome-mv3` in Chrome.
7. Complete `docs/extension-smoke-test.md`.
8. Confirm no extension flow submits an application form.
9. Confirm generated or saved content requires an explicit user click before
   insertion.
10. Confirm CSV export contains only the user's locally saved applications.
11. Copy `docs/founder-validation-report.md`, then record the build date, commit
   SHA, smoke-test result, live job checks, and exported validation metrics.

## Known MVP Risks

- Optional AI-backed generation should be checked with a controlled-cost API key
  before any wider AI-enabled release.
- Priority job-site extraction is selector-based and should be tested on live
  Greenhouse, Lever, and Workday pages before a wider release. LinkedIn remains
  manual copy/paste only.
- Local storage is browser-local; users need to export CSV if they want a backup
  of saved applications.
- Supabase sync, account login, web dashboard, mobile companion, Edge support,
  Interview Prep Pack, and deeper analytics are V2/V1.1 work, not blockers for
  the local-first V1 extension.

## Validation Report

Use `docs/founder-validation-report.md` as the report template for each manual
Chrome smoke test or live UK/EU job validation pass.
The current final-candidate report is
`docs/founder-validation-runs/2026-05-04-final-mvp-validation.md`.
