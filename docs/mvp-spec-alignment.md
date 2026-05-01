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

The repo has a strong local-first Chrome extension foundation, but it is not
yet complete against the full uploaded MVP spec. Current completion is roughly
60-70% of the full spec.

## Implemented

- WXT Chrome MV3 extension shell with side-panel workflow.
- `chrome.storage.local` persistence for profile, reusable answers, drafts, and
  saved applications.
- Profile, reusable answers, job analysis, application content, tracker, and
  applications sections.
- Basic active-tab job page import and fallback from tab title/URL.
- Manual pasted job description fallback in Job Analysis.
- Local transparent fit scoring with visible factors and positioning angle.
- Editable application tracker with search, status filtering, notes, next
  action, next action date, delete, duplicate URL detection, and CSV export.
- Basic form autofill for obvious name, email, phone, and reusable answer
  textarea prompts.
- Unit tests for autofill, storage, validation, job page inference, scoring,
  application filtering, duplicate detection, update/delete, and CSV export.
- Side-panel component split so `main.tsx` now mostly acts as orchestration.

## Full-Spec Gaps

- Richer profile memory: LinkedIn, GitHub/portfolio, CV text, project summaries,
  target countries, target roles, salary expectation, work-right details, and
  reusable answer snippets beyond the current small set.
- AI-backed analysis, positioning, and content generation using the approved
  controlled-cost API model.
- AI usage/cost logging by feature name, timestamp, model, and approximate cost.
- Generated tailored content snapshots attached to tracker records.
- Spec-aligned tracker status model: `Saved`, `Applying`, `Applied`,
  `Interview`, `Rejected`, `Closed`.
- More complete job extraction for priority platforms: LinkedIn, Greenhouse,
  Lever, and Workday.
- Structured job insights: title, company, location, skills, seniority, summary,
  fit factors, and gaps.
- Spec recommendation labels: `High Priority`, `Worth Applying`, `Stretch`,
  `Skip`, or a deliberate documented mapping from current labels.
- User-approved insertion of generated content, not only profile/reusable answer
  autofill.
- Privacy basics and release-readiness notes from the UAT pack.
- Founder validation loop: real UK/EU jobs analysed, applications sent, outcomes
  tracked, and validation metrics recorded.

## Explicitly Out Of Scope For V1

- Autonomous one-click applications.
- Auto-submit or hidden submission.
- Recruiter outreach automation.
- Full CRM/team workflows.
- Paid job scraping or paid job APIs.
- Mobile, Safari, and Firefox support.
- Supabase sync until the local-first flow is stable.

## Recommended Next Build Order

1. Expand profile memory to match the spec-critical fields.
2. Align tracker statuses and migrate/display existing records safely.
3. Add generated content snapshot fields to tracker/application records.
4. Add controlled-cost AI integration for analysis, positioning, and editable
   content generation.
5. Add usage/cost logging for AI calls.
6. Improve platform extraction for LinkedIn, Greenhouse, Lever, and Workday.
7. Run the manual Chrome smoke test and record founder validation metrics.
