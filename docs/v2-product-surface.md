# V2 Product Surface

This document records the implemented V2 foundation after the local-first V1
Chrome extension candidate.

## Market Positioning

AutoTime EU Apply is positioned as a tech guide for the European job market: it
helps candidates understand country fit, work-right risk, role positioning,
domain expectations, and whether a role is worth applying to before they spend
effort.

## Implemented V2 Foundation

- Web companion dashboard in `apps/web` for profile memory, job review,
  application history, local import/export, and interview prep packs.
- Market context controls for General Tech vs FinTech candidates, foreign or
  relocating vs native/local candidates, target country, experience level, and
  application urgency.
- AI use-case guidance explains how AutoTime classifies roles, clarifies
  positioning, reduces wasted effort, and prepares interviews for different
  European tech candidate contexts.
- User-approved CV/resume intake can suggest candidate type, market, seniority
  and target roles from pasted resume text, but it does not overwrite profile
  data until the user approves the suggestion.
- AI Decision Brief turns candidate context, country, CV evidence, role fit and
  readiness into a visible apply recommendation, confidence level, rationale,
  risks and next actions.
- Optional web-only AI interview prep using a user-provided OpenAI key stored in
  browser local storage, with deterministic local fallback.
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
- Mandatory MVP profile bridge: the V2 dashboard must receive usable candidate
  profile evidence from the extension export/import flow before it can be
  treated as market-ready. Required bridge fields are full name, current
  country, target countries, target roles, work-right details, and CV evidence.
  Cloud sync remains post-MVP, but profile continuity is not optional.
- LinkedIn remains manual copy/paste only.
- V2 dashboard remains local-first until Supabase/account sync credentials and
  data policy are ready.
- AI interview prep is browser-local and does not introduce backend sync or
  server-side key storage.
- Production V2 dashboard alias:
  `https://autotime-eu-apply.vercel.app`.
- Live/controlled-cost validation commands are now available for V2 external
  evidence:
  - `pnpm test:v2:ats-live`
  - `LIVE_ATS_FETCH=1 pnpm test:v2:ats-live`
  - `OPENAI_API_KEY=... pnpm test:v2:ai-live`

## Product Boundaries

- The Chrome extension remains the execution surface for live applications.
- The web dashboard is the planning, review, application-history, and interview
  prep surface.
- The extension-to-web bridge is local file export/import, not cloud sync.
- Candidate profile continuity through that local bridge is mandatory for MVP
  validation. A dashboard without imported or completed candidate profile
  evidence is a demo surface, not a market-ready pilot surface.
- Light mobile companion behavior is represented by the responsive production
  web dashboard. A native mobile app or app-store wrapper is not part of this
  V2 MVP completion gate.
- Supabase sync, account login, notifications, Edge packaging, and production
  mobile wrapper remain integration work that requires credentials, data-policy
  decisions, and a user-account model before implementation.

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

The V2 web dashboard is a static-friendly Next.js app, passes `pnpm build:web`,
and is deployed to Vercel production at:

```text
https://autotime-eu-apply.vercel.app
```

For the current repo shape, deploy `apps/web` as the web project and keep
`pnpm install --frozen-lockfile` plus `pnpm build:web` as the build flow.

The repo includes `vercel.json` for the V2 dashboard deployment:

```text
Framework Preset: Next.js
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm build:web
Output Directory: apps/web/.next
Root Directory: repository root
```

The hosted dashboard remains local-first: dashboard state is stored in browser
local storage, and extension data moves into the dashboard by exported JSON
import rather than cloud sync.
The root package includes `next` as a dependency for Vercel framework
detection; the web app source remains in `apps/web`.

## Validation Requirements

- Run `pnpm test`.
- Run `pnpm test:smoke:web`.
- Run `pnpm test:web:interview`.
- Run `pnpm test:v2:ats-live`.
- Run `pnpm test:v2:ai-live` with `OPENAI_API_KEY` set for controlled-cost live
  AI evidence.
- Run `pnpm -r typecheck`.
- Run `pnpm build:web`.
- Run `pnpm smoke:web` against the deployed Vercel URL.
- Run `pnpm build:extension`.
- Manually verify the web dashboard can save local state, export JSON, import
  valid JSON, update application statuses, and generate interview prep only from
  saved application/profile/job context.
- Manually verify incomplete profile exports/imports are blocked or visibly
  marked as missing mandatory profile bridge fields.
- Manually verify AI interview prep with a controlled-cost key, then test an
  invalid key and confirm local fallback/status messaging. The automated live
  key check is `pnpm test:v2:ai-live`.
- Run `docs/v2-smoke-test.md` after extension-to-web export or web dashboard
  import changes.
- Manually verify extension import behavior on at least one live page from the
  expanded ATS list before marking native support as production-proven. The
  deterministic platform evidence check is `pnpm test:v2:ats-live`.
