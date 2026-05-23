# AutoTime EU Apply QA Strategy

Last updated: 2026-05-23

## Principle

AutoTime EU Apply uses an 80% automated / 20% manual QA model for the MVP.
Automation should cover repeatable behaviour, privacy rules, builds, type
safety, smoke checks, Sentry wiring, and regression-prone logic. Manual QA is
reserved for judgement-based checks: visual quality, content usefulness,
compliance wording, real-user clarity, and final production sanity.

This split is used because the MVP flow depends on both deterministic system
behaviour and human judgement. Automated checks give fast release confidence.
Manual checks confirm whether the journey is understandable, useful, and safe
for a first user.

## Product Flow Under Test

Job import -> EU fit -> application kit -> waitlist / feedback.

## Project Inspection Summary

- Active Next.js app: `apps/web`.
- App Router folder: `apps/web/app`.
- Root scripts: lint, typecheck, extension build, web build, unit/smoke helpers,
  MVP automation gate, and production smoke alias.
- Existing automated tests: Node-based tests under `scripts/`, `apps/web/tests/`,
  and `apps/extension/tests/`.
- Playwright config: not present.
- Vitest config: not present.
- Sentry setup: present in the active web app with client, server, edge,
  instrumentation, breadcrumb helper, privacy filter, and dev/protected test
  routes.
- Existing QA docs: legacy docs exist under `docs/qa`; this folder contains the
  MVP finalisation docs for the 80/20 QA target.

## Automated Testing Scope

- Static checks: TypeScript typecheck, lint, package build checks.
- Unit tests: domain logic, validation helpers, smoke-test helpers, cloud sync
  helpers, interview-prep helpers.
- Build checks: extension build and active Next.js web build.
- Smoke checks: homepage/deployed dashboard HTML markers where network access
  is available.
- Sentry checks: config presence, error-only replay config, source map config,
  privacy redaction, protected test routes, safe breadcrumbs.
- Privacy/security checks: no Sentry auth token in client code, env files
  gitignored, no sensitive data intentionally sent in breadcrumbs.

## Manual Testing Scope

- Visual UI quality across desktop/mobile.
- Product journey clarity and next-action wording.
- Application kit content usefulness and copy quality.
- Compliance/disclaimer wording for jobs, interviews, visa, sponsorship, and
  employer/government verification.
- Real-user UX feedback from a controlled MVP walkthrough.
- Sentry dashboard spot-check for event privacy and expected environment.
- Final production sanity after deployment.

## Sentry Role

Sentry is used for production debugging and MVP verification:

- Runtime client/server/edge errors.
- Error-only Session Replay.
- Breadcrumbs attached to captured events.
- Source maps for readable stack traces.
- Safe dev/prod test routes.

Sentry is not product analytics and must not receive CV text, job descriptions,
email addresses, phone numbers, visa/share-code data, payment data, cookies,
tokens, or API keys.

## CI/CD Role

CI/CD should run the automated slice before release:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:unit`
4. `pnpm build`
5. `pnpm build:web`
6. `pnpm test:e2e` when a deployed URL is reachable

Vercel production deployments must include Sentry source map upload env vars:
`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and
`SENTRY_PROJECT`.

## Production Smoke Testing

Production smoke testing should use fake data only:

- Open the homepage and dashboard entry points.
- Confirm the MVP flow is visible and understandable.
- Confirm `/sentry-test` is unavailable in production unless intentionally
  enabled for a controlled test.
- Confirm `/api/sentry-test` returns 404 in production unless
  `SENTRY_TEST_API_ENABLED=true`.
- Confirm Sentry events arrive in the correct environment.

## Privacy And Security Testing

- Search the codebase for `SENTRY_AUTH_TOKEN` and confirm it appears only in
  server/build config.
- Confirm `.env`, `.env.local`, `.env.*.local`, and `.env.sentry-build-plugin`
  are gitignored.
- Verify Sentry `beforeSend` redacts sensitive request, tag, context, extra, and
  breadcrumb fields.
- Verify breadcrumbs only send safe metadata: action, route, status, timestamp.
- Use fake test data only.

## Release Gate Checklist

- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test:unit` passes.
- [ ] `pnpm build` passes.
- [ ] `pnpm build:web` passes.
- [ ] `pnpm test:e2e` passes or is marked blocked with reason.
- [ ] Sentry DSN configured for production.
- [ ] Sentry source map env vars configured in Vercel.
- [ ] Sentry replay remains error-only.
- [ ] Sentry test routes are protected in production.
- [ ] Manual visual/UX/compliance checklist completed.
- [ ] No sensitive data appears in Sentry dashboard spot-check.
- [ ] Release decision recorded in `docs/testing/final-qa-report.md`.
