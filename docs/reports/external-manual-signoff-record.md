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
| Supabase backup/PITR confirmed | **Confirmed absent - risk explicitly accepted** | 2026-09-20 | DataByRajesh (founder) | Checked live: Supabase project `dorqxmnslzzmrpjbhlcl` is on the Free plan (zero scheduled backups, no PITR). Founder explicitly instructed this risk be accepted in writing rather than upgrading. See "Risk acceptance statement" below for the full terms of what's being accepted. |
| Restore rehearsal (if feasible) | Not applicable | 2026-09-20 | - | No backup exists to restore from; not feasible until the plan is upgraded, at which point this should be re-attempted |
| Leaked-password protection confirmed | **Confirmed unavailable - risk explicitly accepted** | 2026-09-20 | DataByRajesh (founder) | Confirmed: Supabase's leaked-password (HaveIBeenPwned) checking is gated behind the Pro plan and unreachable at any Free-tier dashboard location - not a setting that was simply hard to find. Founder explicitly instructed this risk be accepted in writing rather than upgrading. See "Risk acceptance statement" below for the full terms of what's being accepted. |
| Named incident lead | Confirmed | 2026-09-19 | DataByRajesh (founder) | `docs/reports/incident-and-rollback-exercise-record.md` |
| Named rollback operator | Confirmed | 2026-09-19 | DataByRajesh (founder) | Same record; confirmed Vercel access used directly to run a real rollback rehearsal |
| Privacy notice shown to users confirmed accurate | Confirmed | 2026-09-20 | DataByRajesh (founder) / verified against code | `/privacy` checked against actual production code - every subprocessor claim (Supabase, Vercel, OpenAI, Stripe, Resend, PostHog, job-listing providers) genuinely wired, not placeholder text. One known open sub-item: ICO registration reference still pending - separately tracked as a public-launch item |
| Beta acknowledgement/limitations text confirmed | Confirmed | 2026-09-20 | DataByRajesh (founder), approved the wording | Implemented as a real tracked onboarding checkbox (`profiles.beta_terms_accepted_at`, server-set timestamp) - verified live: blocked without acceptance, succeeded with it, timestamp recorded, never re-shown once accepted. Commit `dd122ca3` |
| Support channel and response-time expectation confirmed | Confirmed | 2026-09-20 | DataByRajesh (founder) | `hello@autotimeai.com`, confirmed genuinely wired in `/privacy`, `/terms`, in-app feedback links, and the beta acknowledgement text itself. Response window: founder-monitored, no formal SLA stated (accurate for current scale) |
| Release-owner sign-off (GO / NO-GO / risk-accepted) | **GO WITH LIMITATIONS - risk-accepted** | 2026-09-20 | DataByRajesh (founder) | See "Risk acceptance statement" below |

## Risk acceptance statement — Supabase backup/PITR

**Recorded 2026-09-20, per explicit founder instruction to accept this risk in writing rather than upgrade the Supabase plan at this time.**

**What is being accepted:** the production Supabase project (`dorqxmnslzzmrpjbhlcl`, database for AutoTime EU Apply) is on Supabase's Free tier, which provides **zero scheduled backups and no point-in-time recovery (PITR)**. Concretely: if the production database is lost, corrupted, or subject to a destructive error (accidental `DROP`/`DELETE`, a bad migration, infrastructure failure, etc.), **there is currently no way to restore it** - not to any prior point in time, not even to a recent daily snapshot. Any data loss at the database level is permanent.

**What data is at risk:** real invited beta users' account data, profile/CV evidence, job and application records, interview preparation history, and any billing/subscription state stored in this database.

**Founder's decision:** proceed with the private beta in its current, small, invitation-only scope without upgrading to a paid Supabase tier for backup coverage at this time. This decision can be revisited at any point by upgrading to Supabase Pro (adds up to 7 days of scheduled backups and PITR).

**Recommended trigger to revisit:** per `docs/reference/startup-test-validation-standard.md`'s own trigger table, this should be reconsidered before the beta scales past a small handful of users, and is treated as non-negotiable before any public launch.

## Risk acceptance statement — Supabase leaked-password protection

**Recorded 2026-09-20, per explicit founder instruction to accept this risk in writing rather than upgrade the Supabase plan at this time.**

**What is being accepted:** Supabase Auth's leaked-password protection (which rejects a new or changed password if it appears in the HaveIBeenPwned compromised-password database) is a **Pro-plan-only feature and is not available on the Free tier** this project currently runs on. Concretely: a candidate can set (or already have set) a password that is publicly known to be compromised, and Supabase Auth will accept it with no warning or block. This is a real, current gap in credential-security defense-in-depth, not a configuration oversight - there is no setting to find and enable on this plan.

**What is at risk:** any account whose password happens to match a known-breached password becomes easier to compromise via credential-stuffing attacks (an attacker trying passwords already leaked from other breaches). This does not affect accounts with strong, unique passwords, and does not indicate any breach of this project's own systems - it is the absence of one specific, automated defensive check.

**Founder's decision:** proceed with the private beta in its current, small, invitation-only scope without upgrading to a paid Supabase tier for this check at this time. This decision can be revisited at any point by upgrading to Supabase Pro (which also resolves the backup/PITR gap above - both are Free-tier limitations on the same project, so a single plan upgrade would close both).

**Recommended trigger to revisit:** same as backup/PITR - reconsider before the beta scales past a small handful of users, and treat as non-negotiable before any public launch. Given both open Free-tier gaps are resolved by the same upgrade, revisit them together.

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
