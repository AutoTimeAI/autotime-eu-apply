# Requirements traceability matrix

| Requirement                                       | Test IDs               | Primary implementation/evidence                  | Current status |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------ | -------------- |
| Authentication and session controls               | SEC-AUTH-001..004      | API auth helpers; production auth suite          | NOT RUN        |
| Cross-user RLS isolation                          | DB-RLS-001..004        | Supabase RLS policies; two-user DB run           | BLOCKED        |
| Admin role isolation                              | SEC-ADMIN-001..004     | admin authorization policy; DB/API run           | BLOCKED        |
| AI reserve/confirm/release/refund and concurrency | AI-CREDIT-001..005     | atomic credit migrations; concurrent DB/API run  | BLOCKED        |
| Stripe authenticity and replay idempotency        | PAY-001..004           | webhook route; idempotency migration             | BLOCKED        |
| Privacy consent/export/deletion                   | PRIV-001..005          | consent UI; account export/delete APIs           | NOT RUN        |
| Ingestion authentication and deduplication        | INGEST-001..004        | sync functions; cron secret; dedup logic         | BLOCKED        |
| Extension security/site matrix                    | EXT-SEC-001..005       | extension tests and platform fixture             | NOT RUN        |
| Monitoring redaction and delivery                 | MON-001..004           | Sentry privacy tests; configured delivery        | BLOCKED        |
| OWASP and OWASP API Security                      | PEN-001..020           | penetration plan/findings/retest                 | NOT RUN        |
| Backup, restore and rollback                      | OPS-001..004           | operator runbooks plus exercise records          | BLOCKED        |
| Accessibility and visual quality                  | A11Y-001; VIS-001..012 | Playwright Axe and snapshots                     | BLOCKED        |
| Production configuration/migrations/SHA           | REL-001..006           | registers, migration report, provider deployment | BLOCKED        |
