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
- Expanded profile memory for LinkedIn, GitHub, portfolio, target countries,
  target roles, work-right details, salary expectation, base CV text, project
  summaries, and experience highlights.
- Basic active-tab job page import and fallback from tab title/URL.
- Manual pasted job description fallback in Job Analysis.
- Local transparent fit scoring with visible factors and positioning angle.
- Editable application tracker with search, status filtering, notes, next
  action, next action date, delete, duplicate URL detection, and CSV export.
- Spec-aligned tracker statuses: `Saved`, `Applying`, `Applied`, `Interview`,
  `Rejected`, and `Closed`, with legacy lowercase status normalization.
- Basic form autofill for obvious name, email, phone, and reusable answer
  textarea prompts.
- Unit tests for autofill, storage, validation, job page inference, scoring,
  application filtering, duplicate detection, update/delete, and CSV export.
- Side-panel component split so `main.tsx` now mostly acts as orchestration.

## Full-Spec Gaps

- Deeper use of saved profile memory in generated content and application
  answers.
- Reusable answer snippets beyond the current small set.
- AI-backed analysis, positioning, and content generation using the approved
  controlled-cost API model.
- AI usage/cost logging by feature name, timestamp, model, and approximate cost.
- Generated tailored content snapshots attached to tracker records.
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

1. Add generated content snapshot fields to tracker/application records.
2. Add controlled-cost AI integration for analysis, positioning, and editable
   content generation.
3. Add usage/cost logging for AI calls.
4. Improve platform extraction for LinkedIn, Greenhouse, Lever, and Workday.
5. Run the manual Chrome smoke test and record founder validation metrics.
