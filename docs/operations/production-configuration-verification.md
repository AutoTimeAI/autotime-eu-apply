# Production configuration verification procedure

Read-only presence checks may run after founder authorises production verification. Never print values.

1. Compare expected variable names from server configuration to provider production names.
2. Report each as present/missing and its environment scope only.
3. Inspect the built/client bundle for forbidden server-only variable names or known secret prefixes.
4. Verify canonical URL and OAuth redirect allowlists through provider dashboards.
5. Confirm QA test auth is disabled and bootstrap is absent or owner-restricted.
6. Confirm cron/ingestion missing and invalid credentials return 401/403 in an authorised test environment.
7. Confirm Stripe mode, webhook endpoint/signature and required price mapping without charging.
8. Execute redacted Sentry and Checkly synthetic delivery tests.

Any missing required control remains BLOCKED/FAIL; variable names in source are not proof of production configuration.
