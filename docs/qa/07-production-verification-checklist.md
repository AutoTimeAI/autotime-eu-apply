# Production verification checklist

All items are BLOCKED until a frozen candidate is deployed and founder authorises production-safe verification.

- [ ] Provider deployment is READY and its Git SHA equals the frozen candidate SHA.
- [ ] Homepage, login, privacy and terms return expected successful status.
- [ ] Unauthenticated dashboard/API access is rejected or redirected.
- [ ] QA/test authentication is disabled and bootstrap access controlled.
- [ ] Required configuration is present; values are never copied into evidence.
- [ ] Five pending migrations have been backed up, applied in order and verified.
- [ ] Stripe is test/disabled as intended and webhook replay evidence exists.
- [ ] Cron and ingestion endpoints reject missing/incorrect secrets.
- [ ] Sentry and Checkly deliver a synthetic alert with redacted payload.
- [ ] Support and security-reporting channels accept a synthetic message.
- [ ] Backup existence, controlled restore and rollback exercises are recorded.
- [ ] Invitations remain disabled until final founder GO.
