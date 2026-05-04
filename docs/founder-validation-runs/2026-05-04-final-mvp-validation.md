# Founder Validation Report

## Build

- Date: 2026-05-04
- Commit SHA: `ea3ba3e1adabbe109dd233ebe12ca57abac992e8`
- Extension build path: `apps/extension/.output/chrome-mv3`
- Tester: Rajan
- Chrome version: Pending manual entry
- Operating system: Microsoft Windows NT 10.0.26200.0
- Automated release check: `docs/release-runs/2026-05-04T09-34-13-369Z.md`

## Smoke Test

- Result: Pending final manual Chrome run
- Checklist used: `docs/extension-smoke-test.md`
- Blockers: None found by automated release checks
- Follow-up fixes: Pending only if final manual smoke test finds a blocker

## Automated Checks

- Extension unit tests: Passed
- Repo typecheck: Passed
- Repo lint: Passed
- Extension production build: Passed

## Privacy And Safety

- No auto-submit observed: Pending final manual Chrome confirmation
- Autofill only ran after explicit click: Pending final manual Chrome confirmation
- Saved content insertion only filled empty matching textareas: Pending final manual Chrome confirmation
- CSV export contained only locally saved applications: Pending exported CSV review
- AI key used: Pending manual entry
- AI usage/cost log checked: Pending manual evidence

## Live Job Validation

Record exact live role/company details before tagging a public MVP release.

| # | Platform | Role | Company | Country | Import OK | Content OK | Status | Outcome notes |
|---|---|---|---|---|---|---|---|---|
| 1 | LinkedIn | Pending exact role | Pending exact company | UK/EU | N/A - manual copy/paste only | Pending evidence | Saved | User must copy job details from LinkedIn and paste into AutoTime |
| 2 | Greenhouse | Pending exact role | Pending exact company | UK/EU | Pending evidence | Pending evidence | Saved | Needs recorded live job evidence |
| 3 | Lever | Pending exact role | Pending exact company | UK/EU | Pending evidence | Pending evidence | Saved | Needs recorded live job evidence |
| 4 | Workday | Pending exact role | Pending exact company | UK/EU | Pending evidence | Pending evidence | Saved | Needs recorded live job evidence |
| 5 | Other | Pending exact role | Pending exact company | UK/EU | Pending evidence | Pending evidence | Saved | Needs recorded fallback/manual evidence |

For `Import OK`, mark `Yes` only if the tracker or job-analysis import captures
the role title, company when visible, application URL, platform/source, and
location notes when the page exposes them. For LinkedIn, keep `Import OK` as
`N/A - manual copy/paste only`; do not use active-page import, autofill, saved
content insertion, or current-tab application capture on LinkedIn pages.

## Validation Metrics Snapshot

Export `autotime-validation-metrics.csv` from the Validation Metrics tab and
record the headline values here.

- Total applications tracked: Pending CSV export
- Content snapshot coverage: Pending CSV export
- Next-action coverage: Pending CSV export
- Outcome-note coverage: Pending CSV export
- Top sources: Pending CSV export

## Decision

- MVP validation result: Automated checks passed; final manual Chrome and live job evidence pending
- Release decision: Do not tag `v0.0.2` until live job rows and validation metrics are recorded
- Highest-risk remaining issue: Live selector behavior on Greenhouse, Lever, and Workday; LinkedIn manual copy/paste evidence still pending
- Next action: Complete the final manual smoke test, fill exact live job rows, export validation metrics, then tag `v0.0.2`
