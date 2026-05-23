# Sentry Test Report

Last updated: 2026-05-24

## Setup Status

Sentry is installed in the active Next.js app under `apps/web`.

Checked files:

- `apps/web/instrumentation-client.ts`
- `apps/web/instrumentation.ts`
- `apps/web/sentry.server.config.ts`
- `apps/web/sentry.edge.config.ts`
- `apps/web/next.config.ts`
- `apps/web/lib/sentry-breadcrumbs.ts`
- `apps/web/lib/sentry-privacy.ts`
- `apps/web/app/sentry-test/page.tsx`
- `apps/web/app/api/sentry-test/route.ts`

## Environments

Expected environments:

- Local/dev: `development`
- Vercel/live: `production`

Environment resolution prefers `NEXT_PUBLIC_APP_ENV` if present, then existing
`NEXT_PUBLIC_AUTOTIME_ENV`, then Vercel env, then `NODE_ENV`. No staging
environment is used for now.

## Session Replay

Expected client replay config:

```ts
replaysSessionSampleRate: 0
replaysOnErrorSampleRate: 1.0
```

Status: configured as error-only.

## Breadcrumbs

Expected safe breadcrumbs:

- `job_import_started`
- `eu_fit_checked`
- `application_kit_generated`
- `waitlist_submitted`

Breadcrumb data policy: action, route, status, timestamp, and other
non-sensitive scalar metadata only. Sensitive keys are stripped before
breadcrumbs are added and redacted again in `beforeSend`.

## Source Maps

Status: configured through `withSentryConfig` in `apps/web/next.config.ts`.

Required Vercel env vars:

- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

`SENTRY_AUTH_TOKEN` must remain server/build-only and must not be exposed to
client code.

## Alerts

Status: not verified in this repo. Configure Sentry alerts in the dashboard for:

- New issue in production.
- Error spike in production.
- High-frequency API errors.

## Privacy Redaction

Status: configured with `beforeSend` and covered by
`pnpm test:web:sentry-privacy`.

Redacted key patterns include:

- email
- phone
- cv
- resume
- jobDescription
- description
- visa
- shareCode
- token
- cookie
- password
- secret
- apiKey
- payment
- card

Covered event areas:

- request headers
- request data
- request query string
- extra
- contexts
- tags
- breadcrumbs

## Test Route Protection

- `/sentry-test`: development only; production returns not found.
- `/api/sentry-test`: development enabled; production returns 404 unless
  `SENTRY_TEST_API_ENABLED=true`.
- Current production route re-protection evidence: live check on 2026-05-24
  returned HTTP 404 for `/api/sentry-test`.

## Risks And Next Actions

- Manual Sentry dashboard spot-check is still required after deployment.
- Sentry dashboard/insights are accessible, but live production event
  verification remains pending until an actual AutoTime EU Apply issue is
  opened and checked for environment, breadcrumbs, replay, stack trace, and
  sensitive data.
- Use `docs/testing/sentry-live-dashboard-verification.md` as the live evidence
  checklist.
- Alerts are a dashboard configuration task and are not verified in code.
- Existing root-level Sentry wizard files outside `apps/web` should not be
  committed or deployed unless intentionally migrated.
- Keep the redaction unit test in the private beta release gate.
