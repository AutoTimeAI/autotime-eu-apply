# Founder-led scoped penetration-assessment plan

Classification: founder-led/manual assessment supported by automated tests. Environment: authorised local/test only. No independent, professional or CREST claim.

## Rules of engagement

- Synthetic accounts/data only; two ordinary users and one admin-role matrix.
- No production exploitation, load testing, destructive deletion, real payment, email or AI charge.
- Record UTC time, operator, branch, frozen SHA, request shape with secrets redacted, response, database verification and retest.
- Stop on unexpected access, data mutation outside the fixture, service instability or possible credential exposure.

## Scope

| IDs          | Coverage                                                             |
| ------------ | -------------------------------------------------------------------- |
| PEN-001..003 | Authentication, session fixation/expiry, callback and redirect abuse |
| PEN-004..006 | BOLA/IDOR, two-user Supabase RLS bypass, mass assignment             |
| PEN-007..008 | Admin privilege escalation and function/RPC execution grants         |
| PEN-009..011 | SQL/command/template injection, stored/reflected XSS, CSRF/CORS      |
| PEN-012..014 | SSRF, open redirect, file/path traversal and parser abuse            |
| PEN-015..016 | Rate-limit/business-logic/AI-credit concurrency and prompt injection |
| PEN-017      | Stripe signature forgery and event replay                            |
| PEN-018      | Extension message/origin/storage and supported-site boundaries       |
| PEN-019      | Secrets, PII and monitoring/log redaction                            |
| PEN-020      | Dependencies, CSP/security headers/COEP and error disclosure         |

OWASP Top 10 and OWASP API Security Top 10 mappings are recorded per finding. A test is PASS only with reproducible execution evidence; otherwise NOT RUN or BLOCKED.
