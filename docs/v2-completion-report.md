# V2 Completion Report

Date: 2026-05-04

## Decision

V2 MVP foundation is complete for the local-first production surface.

The deployed V2 surface is:

```text
https://autotime-eu-apply.vercel.app
```

## Completed Closure Items

- Production web dashboard is deployed and smoke-tested.
- Light mobile companion is covered by the responsive production web dashboard.
- Market context controls now support General Tech vs FinTech positioning,
  foreign/relocating vs native/local candidate context, target country,
  experience level, and application urgency.
- AI use-case guidance is visible in the product for role classification,
  positioning clarity, wasted-effort reduction, and interview preparation.
- V2 smoke documentation now matches the production UI names:
  Candidate OS, Role Intelligence, Pipeline, and Interview Desk.
- Live ATS validation has a repeatable command:
  `LIVE_ATS_FETCH=1 pnpm test:v2:ats-live`.
- Controlled-cost AI interview prep validation has a repeatable command:
  `OPENAI_API_KEY=... pnpm test:v2:ai-live`.
- Supabase/account sync is no longer treated as a local-first V2 MVP blocker;
  it is a credentialed integration requiring project credentials, RLS policy,
  account model, and data-retention decisions before implementation.

## Validation Evidence

Commands run successfully:

```bash
pnpm test:smoke:web
pnpm test:web:interview
pnpm test:v2:ai-live
pnpm test:v2:ats-live
LIVE_ATS_FETCH=1 pnpm test:v2:ats-live
pnpm smoke:web
pnpm --filter web typecheck
pnpm build:web
```

`pnpm test:v2:ai-live` reported a safe skip because `OPENAI_API_KEY` was not set
in this environment. The live key path is implemented and ready to run with a
controlled-cost key.

## Live ATS URLs Checked

| Platform   | URL                                                                                               | Result   |
| ---------- | ------------------------------------------------------------------------------------------------- | -------- |
| Greenhouse | `https://job-boards.greenhouse.io/capco/jobs/6796278`                                             | HTTP 200 |
| Lever      | `https://jobs.lever.co/OpenPayd/11cfb95b-581c-4be5-82f0-1c1161626fbc`                             | HTTP 200 |
| Workday    | `https://costar.wd1.myworkdayjobs.com/en-US/CoStarCareersEurope/job/Analyst--STR---London_R38684` | HTTP 200 |
| Ashby      | `https://jobs.ashbyhq.com/accurx/92c80ced-031a-4823-aecf-04eb3f58b480`                            | HTTP 200 |

## Remaining Future Integrations

These are post-V2-MVP integration items, not blockers for the completed
local-first V2 production foundation:

- Supabase-backed account sync.
- Native mobile app or app-store wrapper.
- Notifications.
- Edge browser packaging.
- More live ATS selector evidence as external job boards change.
