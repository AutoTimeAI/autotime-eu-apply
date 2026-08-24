# Release assurance gap analysis

| Area                     | Current state                                                                                                        | Required closure                                                  | Status  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------- |
| Dependencies             | Three High advisories removed by eliminating the vulnerable optional/parser and LHCI dependency paths                | Re-run audit on frozen SHA and index JSON                         | NOT RUN |
| Visual regression        | Login baselines are invalid fallback/error captures; desktop dashboard changed intentionally in commit `f837e201`    | Founder approval, baseline replacement, then frozen-SHA rerun     | BLOCKED |
| Browser shutdown         | Direct Next child process is now managed by Playwright; clean exit verified with adequate Windows process permission | Frozen-SHA rerun                                                  | NOT RUN |
| RLS/admin/AI/payment     | Code and migrations exist; no authorised local database daemon is available                                          | Execute two-user and concurrency scenarios in local/test Postgres | BLOCKED |
| Production migrations    | Five repository migrations absent from production history                                                            | Backup, founder authorisation, ordered apply and verification     | BLOCKED |
| Production configuration | Several controls are unverified (Sentry, Checkly, cron/ingestion, backup/recovery)                                   | Operator validation without exposing values                       | BLOCKED |
| Monitoring/support       | Runbooks created; delivery channels and alert delivery not demonstrated                                              | Configure and capture redacted delivery evidence                  | BLOCKED |
| Penetration assurance    | Founder-led scope and register prepared                                                                              | Execute and retest in authorised local/test environment           | NOT RUN |
| Deployment               | Remediation candidate not frozen or deployed                                                                         | Freeze, deploy, compare SHAs, smoke                               | BLOCKED |
| Founder sign-off         | Not recorded                                                                                                         | Only after every mandatory gate passes                            | BLOCKED |
