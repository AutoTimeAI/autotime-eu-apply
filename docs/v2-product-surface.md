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
- Extension Applications can export a `CompanionDashboardState`-compatible JSON
  file for import into the V2 web dashboard.
- Web dashboard import uses explicit schema validation and an intentional
  `Import Dashboard` action.
- LinkedIn remains manual copy/paste only.
- V2 dashboard remains local-first until Supabase/account sync credentials and
  data policy are ready.

## Product Boundaries

- The Chrome extension remains the execution surface for live applications.
- The web dashboard is the planning, review, application-history, and interview
  prep surface.
- The extension-to-web bridge is local file export/import, not cloud sync.
- Mobile companion behavior is represented by the responsive web dashboard, not
  a native mobile app.
- Supabase sync, account login, notifications, Edge packaging, and production
  mobile wrapper remain future integration work.

## Local Preview

Use the fixed local preview address to avoid slow or hanging localhost
resolution:

```bash
pnpm dev:web
```

Open:

```text
http://127.0.0.1:3000
```

If a previous Next.js process hangs on port 3000, reset and restart with:

```bash
pnpm dev:web:reset
```

For the fastest non-editing preview, use the production server after building:

```bash
pnpm build:web
pnpm preview:web
```

## Cloud Hosting Readiness

The V2 web dashboard is a static-friendly Next.js app and passes
`pnpm build:web`. It can be deployed once a hosting account/project is provided.
For the current repo shape, deploy `apps/web` as the web project and keep
`pnpm install` plus `pnpm build:web` as the build flow.

The repo includes `vercel.json` for the V2 dashboard deployment:

```text
Framework Preset: Next.js
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm build:web
Root Directory: repository root
```

The hosted dashboard remains local-first: dashboard state is stored in browser
local storage, and extension data moves into the dashboard by exported JSON
import rather than cloud sync.
The root package includes `next` as a dependency for Vercel framework
detection; the web app source remains in `apps/web`.

## Validation Requirements

- Run `pnpm test`.
- Run `pnpm -r typecheck`.
- Run `pnpm build:web`.
- Run `pnpm build:extension`.
- Manually verify the web dashboard can save local state, export JSON, import
  valid JSON, update application statuses, and generate interview prep only from
  saved application/profile/job context.
- Run `docs/v2-smoke-test.md` after extension-to-web export or web dashboard
  import changes.
- Manually verify extension import behavior on at least one live page from the
  expanded ATS list before marking native support as production-proven.
