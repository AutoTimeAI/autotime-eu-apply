# Founder-First Real-Time Testing Guide

Use this guide as Rajan, the first real user, to prove AutoTime EU Apply is
ready for a controlled market pilot. Follow it in order. Do not mark the MVP
market-ready until the final gate passes.

## Goal

Prove the product works on real UK/EU job-search execution:

- profile memory works
- job analysis works
- scoring and positioning are useful
- generated content is editable and truthful
- autofill never submits forms
- LinkedIn stays manual copy/paste only
- applications and validation metrics export correctly
- five real jobs are recorded with evidence

## Test Rule

Use your real job-search context, but avoid saving secrets into docs. Record job
titles, company names, country, source URL, import result, content result,
status, and outcome notes. Do not record private API keys.

## Phase 1: Automated Build Gate

Run:

```bash
pnpm market:ready:automated
```

Expected result:

- extension unit tests pass
- repo typecheck passes
- lint passes
- extension build passes
- web build passes
- MVP automation report is created
- final market gate fails only because manual evidence is missing

Record these generated paths in the validation report:

- latest `docs/release-runs/...`
- latest `docs/automation-runs/...`

If the command fails before the manual evidence gate, stop and fix the failing
automated check.

## Phase 2: Create Evidence Report

Run:

```bash
pnpm validation:new
```

Open the generated report in:

```text
docs/founder-validation-runs/
```

This is the single evidence file for the test run.

Fill:

```text
Chrome version:
```

Find Chrome version from:

```text
chrome://settings/help
```

Expected value example:

```text
Chrome version: 124.0.0.0
```

## Phase 3: Build And Load Extension

Run:

```bash
pnpm build:extension
```

Open Chrome:

```text
chrome://extensions
```

Steps:

1. Enable Developer mode.
2. Click Load unpacked if first time, or reload existing AutoTime extension.
3. Select:

```text
apps/extension/.output/chrome-mv3
```

Expected result:

- AutoTime EU Apply appears in Chrome extensions.
- No extension load error appears.
- Extension icon is available.

Record in validation report:

```text
Extension Smoke Test
- Result: In progress
```

## Phase 4: Side Panel Smoke Test

Click the AutoTime extension icon.

Expected result:

- Chrome side panel opens.
- Navigation shows:
  - Profile
  - View Profile
  - Reusable Answers
  - View Answers
  - Job Analysis
  - View Job Analysis
  - Application Content
  - View Content
  - Tracker
  - View Tracker
  - Applications
  - Usage Log
  - Validation Metrics
  - AI Settings

Pass condition:

```text
Side panel opens and all expected sections are visible.
```

If this fails, record blocker and stop.

## Phase 5: Profile Memory Test

Open `Profile`.

Fill real founder-first data:

- full name
- email
- phone
- LinkedIn URL
- GitHub or portfolio URL if available
- current country
- target countries
- target roles
- work-right details
- sponsorship status
- salary expectation
- notice period
- base CV text
- project summaries
- experience highlights

Click Save.

Expected result:

- success message appears
- form saves without error
- data appears in `View Profile`
- closing and reopening the side panel keeps saved data

Record:

```text
Profile memory: Passed
```

## Phase 6: Reusable Answers Test

Open `Reusable Answers`.

Fill answers for:

- sponsorship
- relocation
- work authorisation
- notice period
- salary expectation
- motivation
- strengths
- availability

Click Save.

Open `View Answers`.

Expected result:

- saved answers are visible
- answers are truthful and reusable

Record:

```text
Reusable answers: Passed
```

## Phase 7: LinkedIn Manual Policy Test

Open a real LinkedIn UK/EU job.

Important rule:

```text
LinkedIn must remain manual copy/paste only.
```

In AutoTime:

1. Open `Job Analysis`.
2. Click Import Current Job Page.

Expected result:

- AutoTime shows manual copy/paste message.
- It does not import LinkedIn job details automatically.
- It does not autofill LinkedIn.
- It does not save current LinkedIn tab automatically.

Now manually copy job title, company, location, URL, and job description from
LinkedIn into AutoTime.

Click Save.

Expected result:

- job analysis saves
- fit score appears
- recommendation appears
- positioning angle appears
- skills/gaps are visible

Record the LinkedIn row in the validation report:

```text
Platform: LinkedIn
Role: real role title
Company: real company
Country: real country
URL or source: LinkedIn URL
Import OK: N/A - manual copy/paste only
Content OK: Yes
Status: Saved / Applying / Applied
Outcome notes: Manual copy/paste validated; no LinkedIn automation used.
```

## Phase 8: Greenhouse Live Job Test

Open a real UK/EU Greenhouse job.

In AutoTime:

1. Open `Job Analysis`.
2. Click Import Current Job Page.
3. Review imported fields.
4. Save analysis.

Expected import:

- role title captured
- company captured if visible
- URL captured
- source/platform notes captured
- location captured if page exposes it

If import misses a field, manually complete it, but mark `Import OK` as `No`
or `Partial`.

Then:

1. Open `Application Content`.
2. Generate content from saved data.
3. Review the output.
4. Confirm it is editable and truthful.

Record Greenhouse row:

```text
Import OK: Yes
Content OK: Yes
Outcome notes: Imported useful fields and generated editable content.
```

## Phase 9: Lever Live Job Test

Repeat the same flow on a real UK/EU Lever job:

1. Open job.
2. Import current job page.
3. Save job analysis.
4. Generate application content.
5. Save or track the application.

Expected result:

- import captures useful role details
- generated content matches role and profile
- no form is submitted

Record Lever row in the validation report.

## Phase 10: Workday Live Job Test

Repeat the same flow on a real UK/EU Workday job:

1. Open job.
2. Import current job page.
3. Save job analysis.
4. Generate application content.
5. Save or track the application.

Workday pages can vary. If import is incomplete:

- manually complete missing fields
- record exact issue in outcome notes
- do not mark `Import OK` as `Yes` unless useful exposed fields are captured

Record Workday row in the validation report.

## Phase 11: Other Source Test

Use one other real UK/EU job source, for example:

- company careers page
- SmartRecruiters
- Ashby
- Teamtailor
- Recruitee
- Personio
- Jobvite
- iCIMS

Repeat:

1. Import current job page if supported.
2. Use manual paste fallback if needed.
3. Save job analysis.
4. Generate content.
5. Save to tracker/applications.

Record Other row in the validation report.

## Phase 12: Autofill Safety Test

Use a non-LinkedIn application page with obvious empty fields.

In AutoTime:

1. Open `Profile`.
2. Click Autofill Current Page.

Expected result:

- obvious empty name/email/phone fields may fill
- no submit button is clicked
- no application is submitted
- if fields are not detected, a clear no-fields message appears

Record:

```text
No auto-submit observed: Yes
Autofill only ran after explicit click: Yes
```

## Phase 13: Saved Content Insertion Safety Test

Use a non-LinkedIn application page with empty textareas.

In AutoTime:

1. Save application content first.
2. Open `Application Content`.
3. Click Insert Saved Content.

Expected result:

- only obvious empty matching textareas are filled
- existing typed text is not overwritten
- no application is submitted

Record:

```text
Saved content insertion only filled empty matching textareas: Yes
```

## Phase 14: Tracker And Applications Test

For each tested job:

1. Save tracker entry or save current non-LinkedIn tab.
2. Open `Applications`.
3. Confirm application is listed.
4. Set realistic status:
   - Saved
   - Applying
   - Applied
   - Interview
   - Rejected
   - Closed
5. Add next action.
6. Add next action date if useful.
7. Add outcome notes.

Expected result:

- applications are searchable
- statuses update
- duplicate URL warning appears if same job is saved again
- notes and next actions persist

## Phase 15: Validation Metrics Test

Open `Validation Metrics`.

Expected result:

- total applications matches saved applications
- status counts are visible
- content snapshot coverage is visible
- next-action coverage is visible
- outcome-note coverage is visible
- source counts are visible

Record metrics in validation report:

```text
Total applications tracked:
Content snapshot coverage:
Next-action coverage:
Outcome-note coverage:
Top sources:
```

## Phase 16: Export Evidence

From `Applications`:

1. Export Applications CSV.
2. Open/review the file.
3. Confirm it only contains locally saved application data.

From `Validation Metrics`:

1. Export Validation Metrics CSV.
2. Open/review the file.

Record:

```text
Applications CSV exported: Yes
Applications CSV reviewed for local-only saved data: Yes
Validation Metrics CSV exported: Yes
CSV export contained only locally saved applications: Yes
```

## Phase 17: Usage Log And AI Evidence

Open `Usage Log`.

If using local-only generation:

Record:

```text
AI key used: No production key; local fallback used
AI usage/cost log checked: Yes, local-template entries confirmed
```

If using OpenAI with controlled-cost key:

1. Open `AI Settings`.
2. Add API key.
3. Set budget.
4. Generate one job analysis or application content item.
5. Open `Usage Log`.
6. Confirm model and non-negative estimated cost are recorded.
7. Clear the key after testing if desired.

Do not paste the API key into any report.

Record:

```text
AI key used: Controlled-cost OpenAI key tested; key not recorded
AI usage/cost log checked: Yes
```

## Phase 18: V2 Dashboard Smoke Test

Run the web app if testing locally:

```bash
pnpm dev:web
```

Open:

```text
http://127.0.0.1:3000
```

Or use deployed URL:

```text
https://autotime-eu-apply.vercel.app
```

Test:

1. Dashboard loads.
2. Candidate memory can be edited.
3. Job review fields can be edited.
4. Application history displays saved/imported state.
5. JSON export works.
6. JSON import works with valid dashboard JSON.
7. Interview prep pack generates from saved application/profile/job context.
8. Page is usable on narrow/mobile viewport.

Record:

```text
V2 Dashboard Smoke Test
- Result: Passed
- Preview or deployed URL:
- Import/export checked: Yes
- Interview prep checked: Yes
- Responsive check completed: Yes
```

## Phase 19: Complete Decision Section

After all evidence is filled, update:

```text
MVP validation result: Passed market-ready validation
Release decision: Ready for controlled founder-led pilot
Highest-risk remaining issue: Live selector drift on job sites; monitor during pilot
Next action: Tag v0.0.2 and begin controlled founder-led pilot
```

Use stronger wording only if evidence supports it. Do not call it public-scale
Chrome Web Store ready yet unless onboarding, privacy copy, support process, and
pilot feedback are also complete.

## Phase 20: Final Market Gate

Run:

```bash
pnpm market:ready:gate
```

Expected result:

```text
Market-ready gate passed for docs/founder-validation-runs/...
```

If it fails:

1. Read each missing evidence line.
2. Fill the validation report.
3. Re-run the gate.

## Phase 21: Release Tag

Only after `pnpm market:ready:gate` passes:

```bash
git status --short
git tag v0.0.2
```

Recommended status statement:

```text
AutoTime EU Apply V1 is market-ready for a controlled founder-led pilot.
It is not yet a public-scale launch until pilot feedback, privacy copy,
onboarding copy, and support handling are complete.
```

## Quick Pass/Fail Summary

The run passes only if:

- automated checks passed
- Chrome extension loaded
- side panel smoke passed
- profile memory passed
- reusable answers passed
- LinkedIn manual-only policy passed
- Greenhouse live import/content passed
- Lever live import/content passed
- Workday live import/content passed
- one other source passed
- no auto-submit observed
- autofill required explicit click
- content insertion required explicit click
- applications CSV exported and reviewed
- validation metrics CSV exported
- usage/cost log checked
- V2 dashboard smoke passed
- final market-ready gate passed

Anything else means the MVP remains a completed candidate, not market-ready.
