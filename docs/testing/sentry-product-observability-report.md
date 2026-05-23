# Sentry Product Observability Report

Last updated: 2026-05-24

## Summary

Sentry is configured for AutoTime EU Apply Private Beta v1 across client,
server, edge, request instrumentation, source maps, privacy redaction, and
error-only Session Replay. The setup is suitable for founder-led beta debugging.

## Evidence

- Client config exists in `apps/web/instrumentation-client.ts`.
- Server config exists in `apps/web/sentry.server.config.ts`.
- Edge config exists in `apps/web/sentry.edge.config.ts`.
- Request instrumentation exists in `apps/web/instrumentation.ts`.
- Source maps are configured through `withSentryConfig` in
  `apps/web/next.config.ts`.
- Privacy redaction is covered by `pnpm test:web:sentry-privacy`.
- Session Replay remains error-only:
  `replaysSessionSampleRate: 0` and `replaysOnErrorSampleRate: 1.0`.

## Live Dashboard Status

Status: Pending Manual Evidence.

The Sentry dashboard live spot-check has not been completed in this repository.
Sentry dashboard/insights are accessible, but live production event verification
remains pending until an actual AutoTime EU Apply issue is opened and checked
for environment, breadcrumbs, replay, stack trace, and sensitive data.

The production `/api/sentry-test` route is currently protected again. A live
check on 2026-05-24 returned HTTP 404, which is the expected safe state after a
controlled test window.

Detailed evidence checklist:
`docs/testing/sentry-live-dashboard-verification.md`.

## Product Coverage Verdict

Partial/basic to moderate for public launch, sufficient for founder-led private
beta monitoring. The main public-launch gap is live dashboard evidence and
feature-level debugging depth for save state, dashboard state, profile readiness,
and cloud sync.
