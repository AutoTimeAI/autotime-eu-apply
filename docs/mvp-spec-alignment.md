# MVP Spec Alignment

This checklist reconciles the current repository implementation with the
uploaded MVP product spec pack from `EU Apply.7z`.

Primary source docs reviewed:

- `AutoTime_MVP_Consolidated_Summary.docx`
- `AutoTime_EU_Apply_Final_Build_Execution_Spec_v1.docx`
- `AutoTime_EU_Apply_MVP_Execution_Document.docx`
- `AutoTime_EU_Apply_V1_Supported_Product_Surface.docx`
- `AutoTime_Career_Reset_Sprint_PreBuild_UAT_Release_Pack_v1.docx`

## Current Position

The repo has a strong local-first Chrome extension foundation and the V1 local
implementation is complete against the uploaded MVP spec. Current completion is
roughly 95-100%, with a user-reported manual Chrome smoke test passed and live
UK/EU job validation evidence still pending.

## Implemented

- WXT Chrome MV3 extension shell with side-panel workflow.
- `chrome.storage.local` persistence for profile, reusable answers, drafts, and
  saved applications.
- Profile, reusable answers, job analysis, application content, tracker, and
  applications sections.
- Expanded profile memory for LinkedIn, GitHub, portfolio, target countries,
  target roles, work-right details, salary expectation, base CV text, project
  summaries, and experience highlights.
- Basic active-tab job page import into Job Analysis and Tracker for
  non-LinkedIn job pages, with fallback from tab title/URL.
- LinkedIn manual-input policy: no active-page import, autofill, saved-content
  insertion, or current-tab application capture on LinkedIn pages.
- Priority-platform job extraction selectors for Greenhouse, Lever, and
  Workday, with platform labels in imported tracker notes.
- Manual pasted job description fallback in Job Analysis.
- Local transparent fit scoring with visible factors and positioning angle.
- Structured local job insights for summary, detected skills, seniority, fit
  factors, and gaps.
- Spec-aligned job recommendation labels: `High Priority`, `Worth Applying`,
  `Stretch`, and `Skip`, with legacy label normalization.
- Editable application content generation from saved profile, reusable answers,
  and saved job analysis.
- Reusable answer snippets for sponsorship, relocation, work authorisation,
  notice period, salary expectation, motivation, strengths, and availability.
- AI usage/cost logging storage and side-panel view by feature name, timestamp,
  model, and approximate cost.
- Optional controlled-cost OpenAI Responses API integration for AI-assisted job
  analysis and editable application content generation, with local fallback.
- Generated or saved application content snapshots attached to tracker records.
- Editable application tracker with search, status filtering, notes, next
  action, next action date, delete, duplicate URL detection, and CSV export.
- Spec-aligned tracker statuses: `Saved`, `Applying`, `Applied`, `Interview`,
  `Rejected`, and `Closed`, with legacy lowercase status normalization.
- Basic form autofill for obvious name, email, phone, and reusable answer
  textarea prompts.
- User-approved insertion of saved application content into obvious empty
  content textareas.
- Privacy basics and release-readiness checklist covering local storage,
  explicit user actions, no auto-submit behavior, and manual release checks.
- Founder validation metrics view for tracked applications, status outcomes,
  content snapshot coverage, next-action coverage, outcome-note coverage, and
  sources, with CSV export.
- Founder validation report template for recording smoke-test evidence, live
  UK/EU job checks, metrics snapshots, and release decisions.
- Unit tests for autofill, storage, validation, job page inference, scoring,
  application filtering, duplicate detection, update/delete, and CSV export.
- Side-panel component split so `main.tsx` now mostly acts as orchestration.

## Remaining Validation

- Manual Chrome smoke test has been user-reported passed in the current
  validation run; keep `docs/extension-smoke-test.md` as the repeatable release
  checklist.
- Founder validation loop still needs real UK/EU jobs analysed and outcome
  notes recorded against live applications.
- Priority-platform extraction still needs live checks on Greenhouse, Lever, and
  Workday pages. LinkedIn validation should use manual copy/paste evidence only.

## Explicitly Out Of Scope For V1

- Autonomous one-click applications.
- Auto-submit or hidden submission.
- Recruiter outreach automation.
- Full CRM/team workflows.
- Paid job scraping or paid job APIs.
- Mobile, Safari, and Firefox support.
- Supabase sync until the local-first flow is stable.

## Recommended Next Validation Order

1. Fill the live job evidence rows in the current founder validation report.
2. Validate live priority-platform extraction on Greenhouse, Lever, and
   Workday; validate LinkedIn with manual copy/paste only.
3. Export validation metrics and record the snapshot before tagging an MVP
   release.
