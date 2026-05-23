# Sentry Live Dashboard Verification

Last updated: 2026-05-24

## Summary

Sentry dashboard/insights availability is not the same as live production event
verification. AutoTime EU Apply still needs an actual production issue/event to
be opened and checked for environment, breadcrumbs, replay, stack trace/source
map readability, and sensitive data redaction.

Current honest status:

Sentry dashboard/insights are accessible, but live production event verification
remains pending until an actual AutoTime EU Apply issue is opened and checked
for environment, breadcrumbs, replay, stack trace, and sensitive data.

## Current Operational Status

Status: Pending Manual Evidence.

The production `/api/sentry-test` route is currently protected again. A live
fetch through the Vercel project returned HTTP 404 with `{"error":"Not found"}`
on 2026-05-24. No production Sentry issue/event evidence has been added to this
repo yet, so the Sentry live dashboard gate cannot be marked passed.

## Repo Setup Inspected

- `apps/web/instrumentation-client.ts`
- `apps/web/sentry.server.config.ts`
- `apps/web/sentry.edge.config.ts`
- `apps/web/instrumentation.ts`
- `apps/web/next.config.ts`
- `apps/web/lib/sentry-breadcrumbs.ts`
- `apps/web/lib/sentry-privacy.ts`
- `apps/web/app/sentry-test/page.tsx`
- `apps/web/app/api/sentry-test/route.ts`

## Production Test Route Status

| Route | Production status | Notes |
| --- | --- | --- |
| `/sentry-test` | Protected / disabled | The page calls `notFound()` when the resolved Sentry environment is production. |
| `/api/sentry-test` | Protected by default and currently re-protected | Returns 404 in production unless `SENTRY_TEST_API_ENABLED=true` is explicitly set. Live check on 2026-05-24 returned HTTP 404. |

## Live Verification Status Table

| Check | Status | Evidence / Notes |
| --- | --- | --- |
| Sentry dashboard accessible | Pending Manual Evidence | Dashboard/insights visibility has been reported, but no issue/event evidence is stored in this repo. |
| AutoTime EU Apply project selected | Pending Manual Evidence | Must confirm the correct project, not only an org-level dashboard. |
| Production client test event received | Pending Manual Evidence | Requires a controlled production client event visible in Issues/Events. |
| Production server/API test event received | Pending Manual Evidence | Requires `/api/sentry-test` to be safely enabled/protected and checked in Sentry. |
| Environment shown as production | Pending Manual Evidence | Must be verified inside the actual event. |
| Breadcrumbs visible inside issue | Pending Manual Evidence | Breadcrumbs do not appear alone; they must be checked inside a captured issue/event. |
| Replay attached only for error event | Pending Manual Evidence | Replay is configured error-only, but dashboard attachment must be checked on an error event. |
| Stack trace/source map readable | Pending Manual Evidence | Source maps are configured, but stack readability must be checked in a live issue. |
| No sensitive data visible | Pending Manual Evidence | Redaction tests pass, but live dashboard spot-check is still required. |
| `/sentry-test` protected from public abuse | Passed | Code disables this page in production with `notFound()`. |
| `/api/sentry-test` protected from public abuse | Passed | Code returns 404 in production unless `SENTRY_TEST_API_ENABLED=true`; live check on 2026-05-24 returned HTTP 404. |

## Controlled Production Verification Runbook

Use this only for a short controlled verification window.

1. In Vercel Production environment variables, temporarily set
   `SENTRY_TEST_API_ENABLED=true`.
2. Redeploy or restart production if required for the env var to apply.
3. Trigger `https://autotime-eu-apply.vercel.app/api/sentry-test`.
4. Open Sentry -> AutoTime EU Apply project -> Issues.
5. Open the latest production issue/event.
6. Verify:
   - environment is `production`
   - server/API event was received
   - breadcrumbs are visible if applicable
   - stack trace/source-map context is readable
   - replay behaviour is correct if a client-side event exists
   - no sensitive data is visible
7. Disable/remove `SENTRY_TEST_API_ENABLED` in Vercel.
8. Redeploy or restart production if required.
9. Confirm `https://autotime-eu-apply.vercel.app/api/sentry-test` returns 404
   again.
10. Update this report with the Sentry issue/event evidence summary. Do not
    include secrets, tokens, DSNs, or private screenshots.

## Manual Verification Steps

### Step A - Open Correct Project

1. Go to the Sentry dashboard.
2. Open the AutoTime EU Apply Sentry project.
3. Go to Issues or Events, not only Dashboards/Insights.

### Step B - Trigger Controlled Client Event

1. Open the production app.
2. Use a protected `/sentry-test` route only if it is intentionally enabled for
   a short verification window.
3. Trigger the client test error.
4. Do not enter real user data.

### Step C - Trigger Controlled Server/API Event

1. Enable `/api/sentry-test` only for a short controlled production check, if
   needed.
2. Open the protected `/api/sentry-test` route.
3. Confirm the server test event is created.
4. Do not expose tokens, DSNs, or private URLs in screenshots or docs.

### Step D - Verify Event In Sentry

1. Open the latest AutoTime EU Apply issue/event.
2. Confirm environment is `production`.
3. Confirm stack trace/source map context is readable.
4. Confirm breadcrumbs are attached inside the issue/event.
5. Confirm replay is attached only to an error event.
6. Confirm no CV text, job descriptions, generated cover letter text,
   recruiter message text, email, phone, visa/share-code data, payment data,
   cookies, auth tokens, API keys, secrets, or DSNs are visible.

## Pass / Fail Decision Logic

Status is `Passed` only if:

- A production issue/event appears in Sentry.
- A client or server event is visible.
- Environment is `production`.
- Breadcrumbs are present inside the captured issue/event.
- No sensitive data is visible.
- Test routes are protected from public abuse.

Status remains `Pending Manual Evidence` if:

- Only the dashboard/insights screen is visible.
- No actual issue/event has been opened.
- Replay, breadcrumbs, source maps, or privacy have not been checked inside a
  live production event.

## Current Verdict

Pending Manual Evidence. Sentry is configured for beta runtime monitoring, but
live production dashboard verification is not complete yet.
