# Founder-Led UAT Plan

Last updated: 2026-05-23 23:43:13 +01:00

## Purpose

Founder-led UAT is the next validation step for AutoTime EU Apply Private Beta
v1. It is not yet complete. Browser E2E verifies that the product flow works;
UAT verifies whether real early users understand, trust and value the outcome.

## Participants

- Invite 3 to 5 early users.
- Prefer UK/EU tech jobseekers who can test with fake or non-sensitive sample
  job data.
- Use founder-guided onboarding rather than public self-serve onboarding.

## Scope

Each participant should test:

- Job import.
- EU fit check.
- Save EU fit result.
- Application kit generation.
- Waitlist or feedback action.

Do not ask users to enter real CV text, full real job descriptions, email
addresses, phone numbers, visa/share-code data, payment data, cookies, tokens,
API keys or secrets during UAT.

## What To Collect

- Was the flow clear from job import to feedback?
- Did the EU fit recommendation make sense?
- Was the application kit useful enough to copy, edit or adapt?
- Did the disclaimers feel clear and trustworthy?
- Did anything feel legally risky, overconfident or confusing?
- Would the user use this again for a real application after privacy guidance?
- What should change before a wider launch?

## Beta Limits To Explain

- This is Private Beta v1 / Early Access Beta.
- Access is limited and founder-guided.
- Feedback will shape the next version.
- This is not a full public SaaS launch.
- No job guarantee.
- No interview guarantee.
- No visa guarantee.
- No sponsorship guarantee.
- Employer requirements must be verified.
- Official immigration/government guidance must be verified where relevant.

## Acceptance Criteria

UAT can be signed off when:

- At least 3 early users complete the guided flow.
- No user hits a blocking runtime error during the core flow.
- Users understand the next action at each step.
- EU fit output is judged sensible enough for beta use.
- Application kit output is judged useful enough to copy/edit.
- No user interprets the product as guaranteeing jobs, interviews, visas or
  sponsorship.
- Sentry is monitored during sessions and no sensitive payload leakage is found.
- Feedback is recorded without sensitive personal data.

## Current Status

Pending UAT.

The product is ready for founder-led early users with browser E2E verified, but
formal UAT is not complete until real early users run the guided sessions.
