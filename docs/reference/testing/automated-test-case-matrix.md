# Automated Test Case Matrix

Last updated: 2026-05-23

Status values: Planned, Automated, Manual, Blocked, Pass, Fail, Not Run.

| Test ID | Area | Scenario | Priority | Automation Type | Tool | Test Data | Production Safe? yes/no | Expected Result | Current Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QA-AUTO-001 | Homepage | Homepage loads | P0 | Smoke | `pnpm test:e2e` / `scripts/smoke-web-dashboard.mjs` | None | yes | Production URL returns HTML with expected markers | Fail | `fetch failed` against `https://autotime-eu-apply.vercel.app` on 2026-05-23, including escalated network rerun. |
| QA-AUTO-002 | Job import | Valid fake job input can be imported/tracked | P0 | Unit/integration | Existing extension tests + future web flow test | Fake role title, fake company, fake URL | yes | Job record is created with safe metadata only | Automated | Covered at extension/domain level; browser journey still manual/smoke. |
| QA-AUTO-003 | Job import | Empty job input is rejected | P0 | Unit/integration | Existing tests / TypeScript checks | Empty fields | yes | User cannot save invalid job evidence | Automated | Covered by validation/domain behaviour. |
| QA-AUTO-004 | EU fit | EU fit generation uses fake role/profile evidence | P0 | Unit/API smoke | Typecheck + API route unit candidate | Fake role/profile | yes | Fit result is produced or safe fallback is shown | Planned | Needs dedicated API-level automated test. |
| QA-AUTO-005 | Application kit | Application kit generation from saved fake job | P0 | Unit/API smoke | Typecheck + API route unit candidate | Fake saved job/profile | yes | Copy-friendly draft fields are generated | Planned | Current build verifies compile path; dedicated behavioural test pending. |
| QA-AUTO-006 | Waitlist/feedback | Waitlist/feedback action does not collect sensitive input | P1 | Static/unit | Typecheck + code review | None | yes | Mail link or safe action triggers without storing PII | Automated | Sentry breadcrumb sends route/status only. |
| QA-AUTO-007 | Full happy path | Job import -> EU fit -> kit -> waitlist/feedback | P0 | E2E smoke | Planned Playwright or browser smoke | Fake job/profile only | yes | User reaches final feedback/waitlist action with clear next steps | Planned | Manual until e2e browser test exists. |
| QA-AUTO-008 | Sentry client error | Client test error is captured | P0 | Manual/dev smoke + route compile | `/sentry-test` | No input | no | Error appears in Sentry development environment | Manual | Requires DSN and Sentry dashboard verification. |
| QA-AUTO-009 | Sentry server error | Server test error is captured | P0 | API smoke | `/api/sentry-test` | No input | gated | Event ID returned in dev; 404 in production unless enabled | Automated/Manual | Route exists; dashboard arrival is manual. |
| QA-AUTO-010 | Sentry breadcrumbs | Breadcrumbs attach to captured events | P0 | Unit/static + manual dashboard | Sentry helper + `/sentry-test` | Safe route/status only | yes | Breadcrumb names appear inside captured event | Manual | Breadcrumbs do not create events alone. |
| QA-AUTO-011 | Sentry environment | Local uses development; live uses production | P0 | Static/typecheck | `getSentryEnvironment()` | Env vars only | yes | Environment is `development` or `production`; no staging added | Automated | Uses `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_AUTOTIME_ENV`, Vercel env, then `NODE_ENV`. |
| QA-AUTO-012 | Sentry replay | Replay is error-only | P0 | Static/typecheck | `instrumentation-client.ts` | None | yes | `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 1.0` | Automated | Verified in config. |
| QA-AUTO-013 | Sentry privacy | Sensitive keys are redacted | P0 | Unit/static | `pnpm test:web:sentry-privacy` | Fake sensitive keys | yes | Sensitive request/extra/context/tag/breadcrumb values are filtered | Automated | Dedicated unit test added for redaction and environment mapping. |
| QA-AUTO-014 | Protected test route | `/sentry-test` hidden in production | P0 | Build/static | Next build + route code | Env only | yes | Production environment returns not found | Automated | Runtime production spot-check still manual. |
| QA-AUTO-015 | Protected server route | `/api/sentry-test` protected in production | P0 | Build/static | Next build + route code | Env only | yes | Production returns 404 unless `SENTRY_TEST_API_ENABLED=true` | Automated | Runtime production spot-check still manual. |
| QA-AUTO-016 | Build check | Root build succeeds | P0 | Build | `pnpm build` | None | yes | Extension production build succeeds | Pass | Passed on 2026-05-23 after filesystem permission rerun. |
| QA-AUTO-017 | Web build check | Active Next.js app build succeeds | P0 | Build | `pnpm build:web` | Local env/fake-safe env | yes | Next.js production build succeeds | Pass | Passed on 2026-05-23 after filesystem permission rerun. |
| QA-AUTO-018 | Typecheck | TypeScript project checks pass | P0 | Static | `pnpm typecheck` | None | yes | All workspace typechecks pass | Pass | Initial sandbox spawn EPERM, passed after permission rerun on 2026-05-23. |
| QA-AUTO-019 | Lint | Lint/typecheck script passes | P0 | Static | `pnpm lint` | None | yes | All workspace lint scripts pass | Pass | Passed on 2026-05-23. |
| QA-AUTO-020 | Unit tests | Unit test suite passes | P0 | Unit | `pnpm test:unit` | Fake/local data | yes | Existing unit/smoke helper tests pass | Pass | First run found stale label assertion; fixed test expectation, rerun passed. |
| QA-AUTO-021 | Production smoke | Production smoke checks deployed page | P0 | Smoke | `pnpm test:e2e` | None | yes | Production URL responds with expected safe markers | Fail | `fetch failed`; verify deployed URL/network manually or set `WEB_SMOKE_URL`. |
