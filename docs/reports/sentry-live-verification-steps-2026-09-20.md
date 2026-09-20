# Sentry live verification — steps for the founder

Closes the last part of "Monitoring testing" in
`testing-categories-coverage-v1.0.1-2026-09-19.md`, which needs Sentry
dashboard/API access this session doesn't have (no `SENTRY_AUTH_TOKEN` or
similar in any local env file — confirmed by search).

This does **not** require re-enabling `SENTRY_TEST_API_ENABLED` on
Production. That flag is disabled in production on purpose (see
`apps/web/app/api/sentry-test/route.ts` — it 404s in production unless
that flag is `true`), and flipping it there would undo real security
hardening shipped this session. Use a **Preview deployment** instead,
which is a safer, equally valid way to prove Sentry actually receives
events end to end.

## Steps

1. **In Vercel dashboard** → Project → Settings → Environment Variables:
   add `SENTRY_TEST_API_ENABLED=true`, scoped to **Preview** only (not
   Production).
2. Push any small branch (or just re-push the current branch head) to
   trigger a Preview deployment, or redeploy an existing Preview build
   from the Vercel dashboard so it picks up the new env var.
3. Once the Preview URL is live, hit:
   ```
   curl https://<preview-url>/api/sentry-test
   ```
   Expect a JSON response like `{"eventId": "...", "ok": true}` — the
   route calls `Sentry.captureException(new Error("Sentry MVP server
   verification error"))` and returns the event ID directly.
4. **In the Sentry dashboard**, search for that event ID or the message
   `Sentry MVP server verification error`. Confirm:
   - The event actually arrived (proves the DSN/ingestion pipeline
     works, not just that code exists).
   - The stack trace resolves to real source file/line numbers, not
     minified/obfuscated output (proves source maps are uploaded and
     working — this is the part that's easy to silently break and hard
     to notice otherwise).
   - The `environment` tag reads whatever `getSentryEnvironment()`
     resolves to for a Preview deploy (check `lib/sentry-privacy.ts` if
     you want to confirm which string that is).
5. **Clean up**: remove the `SENTRY_TEST_API_ENABLED` Preview env var
   from Vercel afterward so it doesn't linger.

## What this proves vs. doesn't

Proves: the full pipeline (app → Sentry SDK → DSN → Sentry ingestion →
readable stack trace) works for real, not just that the SDK is
initialized.

Doesn't prove: alert *rules* (e.g. Slack/email notification on error)
actually fire — that's a separate check, done from Sentry's own Alerts
settings page, not from the app. If that matters before scaling beyond
the current small cohort, verify it the same way: trigger this test
event and confirm the configured alert channel actually receives a
notification, not just that the event lands in the Sentry UI.
