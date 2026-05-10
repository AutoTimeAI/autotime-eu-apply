# Agent Browser UI Walkthrough Report

Date: 2026-05-10
Environment: Local Next.js dev server, `http://127.0.0.1:3000`
Tester: Codex using `agent-browser 0.27.0`
Auth mode: Local test auth bypass
Test user: `agent-browser@autotime.test`
Branch: `main`
Latest related commit: `f2fb56e Enable local test auth for browser walkthroughs`

## Summary

The dashboard can now be tested with `agent-browser` without an OAuth login session. The local test-auth bypass successfully opened protected dashboard routes as the test user while preserving the normal production auth code path.

Overall result: Pass with UX follow-ups.

No Next.js error overlays or browser page errors were detected during the primary route walkthrough.

## Setup Notes

- Installed `agent-browser 0.27.0`.
- `agent-browser doctor` passed Chrome launch using installed Google Chrome.
- Chrome-for-Testing CDN check failed, but this did not block local browser automation because installed Chrome was usable.
- Started the local dev server with:
  - `AUTOTIME_TEST_AUTH_ENABLED=true`
  - `AUTOTIME_TEST_USER_EMAIL=agent-browser@autotime.test`
  - `AUTOTIME_TEST_USER_PLAN=free`
  - `NEXT_PUBLIC_AUTOTIME_ENV=development`

## Routes Tested

| Route | Result | Notes |
| --- | --- | --- |
| `/dashboard` | Pass | Loaded directly as test user. Overview, guided actions, evidence boundaries, workflow cards visible. |
| `/dashboard/profile` | Pass | Profile evidence, CV review, candidate context, and sync controls visible. |
| `/dashboard/jobs` | Pass | Job Check form visible. AI/save actions disabled until job fields are filled. |
| `/dashboard/applications` | Pass | Application tracker visible. Saved jobs and evidence records appear after saving a checked role. |
| `/dashboard/applications/[id]` | Pass | Saved application detail opened directly and showed score, limits, evidence gate, records, and workflow controls. |
| `/dashboard/interview` | Pass | Interview Buddy generated grounded answer variants from a rough draft. Save action did not throw errors. |
| `/dashboard/extension` | Pass | Extension download and connect links visible. |
| `/dashboard/extension/download` | Pass | Returned `200 application/zip`, about `89 KB`. |
| `/pricing` | Pass | Rendered as signed-in test user with Free/Pro pricing controls and account menu. |

## Functional Checks

### Authentication

Result: Pass

- Protected dashboard pages opened without OAuth when test auth was enabled.
- Browser URL stayed on `/dashboard`, not `/login`.
- Test user appeared in the top nav as `agent-browser@autotime.test`.

### Job Check Save Flow

Result: Pass

Steps:

1. Opened `/dashboard/jobs`.
2. Filled:
   - Job title: `Customer Operations Specialist`
   - Company: `Example SaaS Ltd`
   - Job description: UK SaaS support/operations role with sponsorship unavailable.
3. Confirmed `Ask AI to check role` and `Save blocker for review` became enabled.
4. Clicked `Save blocker for review`.
5. Confirmed navigation to Applications after button was visible in viewport.
6. Confirmed local dashboard state contained:
   - `applications: 1`
   - `evidenceRecords: 10`
   - first application title: `Customer Operations Specialist`

Note: The first automation click did not save because the target was below the viewport. After scrolling into view, the product behavior worked.

### Applications And Evidence

Result: Pass

- Applications page showed the saved role.
- Evidence records displayed grounded risk/missing/found states.
- Status dropdown worked.
- Changing status to `Interview` enabled `Generate Prep`.

### Interview Prep Pack Gate

Result: Pass

- `Generate Prep` did not create a prep pack when required candidate evidence was missing.
- The UI showed a clear blocker:
  - `Interview prep blocked: Add at least two candidate evidence sources: CV text, experience highlights, or project summaries.`

This is a trustworthy behavior and prevents weak/dummy output.

### Interview Buddy

Result: Pass with UX note

- Filled a rough answer.
- Generated four answer variants:
  - Professional answer
  - Natural answer
  - Light funny version
  - Strong final interview answer
- Output stayed evidence-limited and explicitly avoided inventing claims.
- Saving the final answer did not throw errors and profile completion increased.

UX note: Clicking `Generate answers` with an empty draft caused no visible feedback. It should either be disabled until input exists or show a clear prompt.

### Extension Download

Result: Pass

- `/dashboard/extension/download` returned:
  - Status: `200`
  - Content-Type: `application/zip`
  - Length: about `89 KB`

### Python Analytics

Result: Pass with UX note

- Clicking `Run Python analytics` did not break the page.
- UI displayed:
  - `Python analytics unavailable: service returned 404`

UX note: This is technically accurate, but too raw for production users. A better message would explain that the analytics service is unavailable in this environment.

## Visual Checks

Screenshots captured:

- `screenshots/autotime-dashboard-overview.png`
- `screenshots/autotime-dashboard-mobile.png`

Desktop result:

- Dashboard looks credible and data-backed.
- Evidence boundaries, local-only storage state, decision index, manual-apply boundary, and blocker explanations make the product feel honest rather than dummy.

Mobile result:

- Main flow is usable.
- No major content overlap was observed.
- Workspace tab rail is horizontally clipped/scrollable on mobile, which is usable but visually tight.
- Next.js dev-tools floating button overlaps content in dev only; not a production concern.

## Issues And Follow-Ups

### High

None found in tested local flows.

### Medium

1. Empty Interview Generate action has no feedback
   - Route: `/dashboard/interview`
   - Issue: Clicking `Generate answers` with no rough draft produces no visible message.
   - Recommendation: Disable until draft/context exists, or show `Add a rough answer first`.

2. Python analytics unavailable message is too technical
   - Route: `/dashboard/applications`
   - Issue: `service returned 404` exposes implementation detail.
   - Recommendation: Replace with a product-safe message such as `Analytics service is not available in this environment. Saved evidence remains available.`

### Low

1. `Skip for now` can read like an action instead of a verdict
   - Routes: Dashboard overview and Job Check
   - Recommendation: Consider `Decision: Skip for now` or `Current verdict: Skip for now` where context is tight.

2. Mobile workspace rail feels clipped
   - Route: `/dashboard`
   - Recommendation: Add stronger scroll affordance or compact mobile menu for workspace sections.

3. Save buttons below viewport require scroll for reliable automation clicks
   - Product works after scrolling; no user-facing bug confirmed.
   - Recommendation: Keep important submit actions near form end and consider sticky section actions only if it does not clutter the dashboard.

## Not Tested

- Live AI `Ask AI to check role`, to avoid spending real API calls.
- Stripe `Start Pro`, `Upgrade plan`, and billing portal actions, to avoid creating test billing sessions/customers during this UI pass.
- Real OAuth login flow, because this run specifically validated local test-auth browser walkthroughs.

## Cleanup

- Closed the `agent-browser` session.
- Stopped the local Next.js dev server.

