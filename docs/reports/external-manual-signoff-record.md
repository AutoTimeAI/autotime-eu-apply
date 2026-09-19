# External / Manual Sign-Off Record

Founder-owned record for the items that only a human can close: backup/PITR,
privacy/beta-terms/support readiness, ICO registration, Chrome Web Store
publication, email delivery, Stripe end-to-end transaction, Sentry live
verification, UAT, and outcome validation. This document references
evidence rather than repeating the procedures already documented elsewhere
(see [`release-evidence-index.md`](./release-evidence-index.md) for the
canonical procedure documents).

**Do not mark any row below Pass/Confirmed without a real date, a real
operator, and a real evidence reference (screenshot, URL, dashboard link,
transaction ID, etc.). An empty or template row must stay `Not started`.**

## Private-beta-blocking items

| Item | Status | Date | Operator | Evidence reference |
|---|---|---|---|---|
| Supabase backup/PITR confirmed | Not started | | | |
| Restore rehearsal (if feasible) | Not started | | | |
| Named incident lead | Not started | | | |
| Named rollback operator | Not started | | | |
| Privacy notice shown to users confirmed accurate | Not started | | | |
| Beta acknowledgement/limitations text confirmed | Not started | | | |
| Support channel and response-time expectation confirmed | Not started | | | |
| Release-owner sign-off (GO / NO-GO / risk-accepted) | Not started | | | |

## Public-launch-blocking items (not required for private beta)

| Item | Status | Date | Operator | Evidence reference |
|---|---|---|---|---|
| Founder-led UAT with 3-5 real users | Not started | | | |
| Outcome usefulness/trust validated with real users | Not started | | | |
| Live Sentry production event inspected | Not started | | | |
| Sentry alert configuration verified | Not started | | | |
| ICO registration completed / reference recorded | Not started | | | |
| Chrome Web Store manual publication pass completed | Not started | | | |
| Real welcome/alert email delivery confirmed (not just send-path code) | Not started | | | |
| Real Stripe end-to-end transaction completed (test-mode or live) | Not started | | | |
| Feedback loop exercised with real user input | Not started | | | |

## Notes

- This record only tracks *whether* each item is done and where the proof lives - it does not replace the procedure documents (runbook, workflow, checklists) that describe *how* to do them.
- Update [`release-evidence-index.md`](./release-evidence-index.md)'s "Mandatory gates still open" table whenever a row here moves out of `Not started`.
