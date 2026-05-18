# Founder Validation Report

## Build

- Date: 2026-05-18
- Branch: main
- Commit SHA: `f8f3d49dd60a8351f38235254356ff30e1bb9927`
- Extension build path: `apps/extension/.output/chrome-mv3`
- Tester: Rajan
- Chrome version: Pending manual entry
- Operating system: win32 x64
- Automated release check: `docs\release-runs\2026-05-18T14-40-18-140Z.md`
- MVP automation report: `docs\automation-runs\2026-05-18T14-41-23-207Z.md`

## Automated Testing Gate

Run these before manual release validation and link the generated reports above.

- [ ] `pnpm release:check` passed
- [ ] `SKIP_LIVE_SMOKE=1 pnpm test:mvp` passed for offline/local validation, or `pnpm test:mvp` passed with deployed smoke enabled
- [ ] `pnpm build:extension` produced `apps/extension/.output/chrome-mv3`
- [ ] `pnpm build:web` passed if V2 dashboard changed
- [ ] `pnpm test:smoke:web` passed if dashboard smoke markers changed
- [ ] `pnpm test:web:interview` passed if interview prep changed

## Extension Smoke Test

- Result: Not run
- Checklist used: `docs/extension-smoke-test.md`
- Chrome extension loaded from: `apps/extension/.output/chrome-mv3`
- Blockers:
- Follow-up fixes:

## V2 Dashboard Smoke Test

- Result: Not run
- Checklist used: `docs/v2-smoke-test.md`
- Preview or deployed URL:
- Import/export checked:
- Interview prep checked:
- Responsive check completed:

## Privacy And Safety

- No auto-submit observed:
- Autofill only ran after explicit click:
- Saved content insertion only filled empty matching textareas:
- LinkedIn remained manual copy/paste only:
- CSV export contained only locally saved applications:
- AI key used:
- AI usage/cost log checked:

## Live Job Validation

Record at least five real UK/EU roles before calling the MVP validation loop complete.

| # | Platform | Role | Company | Country | URL or source | Import OK | Content OK | Status | Outcome notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | LinkedIn |  |  |  |  | N/A - manual copy/paste only | Not run | Saved |  |
| 2 | Greenhouse |  |  |  |  | Not run | Not run | Saved |  |
| 3 | Lever |  |  |  |  | Not run | Not run | Saved |  |
| 4 | Workday |  |  |  |  | Not run | Not run | Saved |  |
| 5 | Other |  |  |  |  | Not run | Not run | Saved |  |

For `Import OK`, mark `Yes` only if tracker or job-analysis import captures the role title, company when visible, application URL, platform/source, and location notes when exposed by the page. For LinkedIn, keep `Import OK` as `N/A - manual copy/paste only`; do not use active-page import, autofill, saved-content insertion, or current-tab application capture on LinkedIn pages.

## Export Evidence

- Applications CSV exported:
- Applications CSV reviewed for local-only saved data:
- Validation Metrics CSV exported:
- V2 Dashboard JSON exported, if V2 flow changed:
- V2 Dashboard JSON imported successfully, if V2 flow changed:

## Validation Metrics Snapshot

- Total applications tracked:
- Content snapshot coverage:
- Next-action coverage:
- Outcome-note coverage:
- Top sources:

## Decision

- MVP validation result: Not ready
- Release decision:
- Highest-risk remaining issue:
- Next action:
