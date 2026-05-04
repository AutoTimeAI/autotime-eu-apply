# V2 Product Surface

This document records the implemented V2 foundation after the local-first V1
Chrome extension candidate.

## Implemented V2 Foundation

- Web companion dashboard in `apps/web` for profile memory, job review,
  application history, local import/export, and interview prep packs.
- Shared schemas and types in `packages/shared` for profile, reusable answers,
  job analysis, application records, content snapshots, and interview prep
  packs.
- Extension platform detection expanded beyond LinkedIn, Greenhouse, Lever, and
  Workday to the next ATS wave: Ashby, SmartRecruiters, iCIMS, BambooHR,
  Teamtailor, Recruitee, Jobvite, and Personio.
- LinkedIn remains manual copy/paste only.
- V2 dashboard remains local-first until Supabase/account sync credentials and
  data policy are ready.

## Product Boundaries

- The Chrome extension remains the execution surface for live applications.
- The web dashboard is the planning, review, application-history, and interview
  prep surface.
- Mobile companion behavior is represented by the responsive web dashboard, not
  a native mobile app.
- Supabase sync, account login, notifications, Edge packaging, and production
  mobile wrapper remain future integration work.

## Validation Requirements

- Run `pnpm test`.
- Run `pnpm -r typecheck`.
- Run `pnpm build:web`.
- Run `pnpm build:extension`.
- Manually verify the web dashboard can save local state, export JSON, import
  valid JSON, update application statuses, and generate interview prep only from
  saved application/profile/job context.
- Manually verify extension import behavior on at least one live page from the
  expanded ATS list before marking native support as production-proven.
