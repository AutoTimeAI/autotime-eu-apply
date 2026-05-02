# Founder Validation Report

## Build

- Date: 2026-05-02
- Commit SHA: `6b19c7ea6474b3ad509f3a9933f909e4abfb35fb`
- Extension build path: `apps/extension/.output/chrome-mv3`
- Tester: Rajan
- Chrome version: 147.0.7727.138
- Operating system: Microsoft Windows NT 10.0.26200.0
- Automated release check: `docs/release-runs/2026-05-02T19-44-45-479Z.md`

## Smoke Test

- Result: Passed, user-reported manual Chrome test
- Checklist used: `docs/extension-smoke-test.md`
- Blockers: None reported
- Follow-up fixes completed:
  - Added Job Analysis current-page import.
  - Added location inference from pasted job descriptions.
  - Added stronger Greenhouse, Lever, and Workday title cleanup.
  - Added semi-automated release checks with timestamped reports.

## Automated Checks

- Extension unit tests: Passed
- Repo typecheck: Passed
- Repo lint: Passed
- Extension production build: Passed

## Privacy And Safety

- No auto-submit observed: Passed, user-reported
- Autofill only ran after explicit click: Passed, user-reported
- Saved content insertion only filled empty matching textareas: Passed, user-reported
- CSV export contained only locally saved applications: Pending exported CSV review
- AI key used: No production key recorded
- AI usage/cost log checked: Pending exported/manual evidence

## Live Job Validation

Record exact live role/company details before tagging a public MVP release.

| # | Platform | Role | Company | Country | Import OK | Content OK | Status | Outcome notes |
|---|---|---|---|---|---|---|---|---|
| 1 | LinkedIn | Pending exact role | Pending exact company | UK/EU | Pending evidence | Pending evidence | Saved | Needs recorded live job evidence |
| 2 | Greenhouse | Pending exact role | Pending exact company | UK/EU | Pending evidence | Pending evidence | Saved | Needs recorded live job evidence |
| 3 | Lever | Pending exact role | Pending exact company | UK/EU | Pending evidence | Pending evidence | Saved | Needs recorded live job evidence |
| 4 | Workday | Pending exact role | Pending exact company | UK/EU | Pending evidence | Pending evidence | Saved | Needs recorded live job evidence |
| 5 | Other | Pending exact role | Pending exact company | UK/EU | Pending evidence | Pending evidence | Saved | Needs recorded live job evidence |

For `Import OK`, mark `Yes` only if the tracker or job-analysis import captures
the role title, company when visible, application URL, platform/source, and
location notes when the page exposes them.

## Validation Metrics Snapshot

Export `autotime-validation-metrics.csv` from the Validation Metrics tab and
record the headline values here.

- Total applications tracked: Pending CSV export
- Content snapshot coverage: Pending CSV export
- Next-action coverage: Pending CSV export
- Outcome-note coverage: Pending CSV export
- Top sources: Pending CSV export

## Decision

- MVP validation result: Manual smoke test user-reported passed; live job evidence pending
- Release decision: Do not tag a public MVP release until live job rows and validation metrics are recorded
- Highest-risk remaining issue: Live selector behavior on LinkedIn, Greenhouse, Lever, and Workday
- Next action: Fill exact live job rows, export validation metrics, then tag MVP release
