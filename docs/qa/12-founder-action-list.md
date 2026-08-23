# Founder Action List

Strict priority order. Each item states exactly what's needed and
what it unblocks.

## Tier 1 — unblocks the most evidence for the least effort

1. **Provide `QA_SESSION_BOOTSTRAP_SECRET` + `QA_TEST_ACCOUNT_USER_ID`
   (or the resulting `QA_SESSION_URL`)**. Unblocks: 9 production
   Playwright specs (`tests/e2e/production/`), dashboard Lighthouse
   (`scripts/lighthouse-dashboard.mjs`), and Gate 6 (production smoke).
   Already documented as safe-by-design in `docs/qa-test-account.md`
   (Stripe checkout hard-blocked, welcome email skipped for this account).
2. **Provide the current production Vercel deployment ID/SHA**, or
   grant read-only Vercel access. Closes Gate 2 (deployed-SHA match),
   the single gate everything else depends on being meaningful.
3. **Investigate `DEF-003`** — authenticated dashboard Lighthouse
   performance dropped to 0.37-0.38 (budget 0.6) starting around
   2026-08-22, confirmed via 2 consecutive real production CI runs.
   Not root-caused by this assessment. Real, user-facing, worth fixing
   before beta users hit it regardless of the overall release decision.

## Tier 2 — closes the remaining hard release gates

4. **Confirm production migration status** — either grant Supabase
   read access so this assessment can run the queries in
   `docs/database/migration-register.csv`, or run them yourself and
   share results. Closes Gate 11.
5. **Confirm production configuration presence** (not values) per
   `docs/release/production-configuration-register.csv`'s 26 unverified
   rows. Closes Gate 12.
6. **Demonstrate or formally accept the backup/restore/rollback gap**
   (Gates 15-17) — either provision a disposable Supabase project for
   a demonstrated restore and confirm a Vercel rollback, or explicitly
   accept the residual risk in `docs/release/risk-register.csv`
   (RISK-010) with a target date.
7. **Confirm whether paid beta is enabled at launch.** If yes,
   `PAY-001` through `PAY-006` need to be authored and run (test-mode
   Stripe, no real charges) before Gate 21 can close. If no, this
   tier's payment items become NOT APPLICABLE, not NOT RUN.

## Tier 3 — decisions only the founder can make

8. **Confirm the actual admin role model** — is
   Owner/Admin/Support/Analyst four genuinely distinct enforcement
   levels, or one flat "admin" role with per-permission grants (which
   is what this pass's code review found)? Answers `ADMIN-006`.
9. **Decide whether a second production QA account is worth creating**
   for live cross-user isolation evidence, or whether the existing
   code/API-layer evidence (6 of 10 RLS cases, several tracing to real
   fixes from this session) is sufficient for this beta's cohort size.
10. **Sign off on `docs/qa/11-go-no-go-sign-off.md`** once Tiers 1-2
    are addressed — record GO / CONDITIONAL GO / NO-GO with your own
    name and date.
11. **Confirm Checkly and Sentry are actually deployed/receiving
    events** in production (both previously flagged as
    configured-but-unverified).

## Tier 4 — lower priority, does not block a beta decision

12. Confirm GitHub secret scanning is enabled (repo Settings toggle).
13. Investigate `SEC-FIND-002` (unconfirmed ZAP attribute-injection
    finding on `/compatibility`) with a deliberate, safe test payload
    against a local/test instance.
14. Fix `SEC-FIND-001` (DOCX sanitization ordering) — small,
    self-contained, not currently exploitable but cheap to close properly.
15. Consider a lint rule or shared auth wrapper (`SEC-FIND-004`) as
    forward-looking hardening against a future route missing its auth check.
16. Author and run the remaining ~50 NOT RUN test cases in
    `test-cases.csv` as ongoing QA investment, prioritised per
    `docs/qa/05-master-test-plan.md`'s priority order.

## What does NOT need founder action

Everything already verified this pass needs no further founder input
unless you want to independently spot-check it: the 53-route auth
sweep, the stored-XSS review, the regression suite, the Sentry
redaction pipeline, SSRF/open-redirect/injection defenses, and the
ingestion deduplication/auth logic all came back clean with real
evidence.
