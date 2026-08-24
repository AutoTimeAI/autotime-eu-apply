# Monitoring and alerting runbook

Status: production delivery BLOCKED.

## Required controls

- Sentry server/client error ingestion with environment/release tags and privacy hooks.
- Checkly or equivalent checks for public pages, unauthenticated protection and health endpoints.
- Alerts for ingestion/cron failures, Stripe webhook failures/replay anomalies, AI reserve leaks and elevated 5xx.
- Named primary/backup recipients and documented escalation windows.

## Safe verification

1. Confirm variable presence and project/check identity without reading secret values.
2. Trigger a synthetic, non-sensitive test event in an authorised environment.
3. Confirm receipt, environment and release SHA; inspect payload for email, authorization headers, cookies, tokens, CV/job text and user IDs.
4. Confirm redaction tests and alert delivery; hash/index the redacted evidence.
5. Remove or close synthetic events according to retention policy.

Never use a screenshot alone to prove redaction; retain structured event fields or an export with secrets/PII removed.
