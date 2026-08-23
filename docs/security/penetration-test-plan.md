# Penetration Test Plan

## Classification (stated up front, per §9 of the assessment brief)

This is a **founder-led/automated security assessment**, not an
independent professional penetration test. It combines source review,
static analysis (CodeQL, dependency-review), passive scanning (ZAP
baseline), and safe local/API-level dynamic testing performed by this
assessment. It does **not** claim CREST certification, independent
assurance, or professional penetration testing. Per §9's own criteria,
an independent professional test is recommended before public launch,
before any enterprise/customer-security review, before handling
larger personal-data volumes, before broader browser-extension
distribution, and before material payment volume — none of which
apply to a small invite-only private beta, which is the only scope
this plan covers.

## Scope

In scope:
- `apps/web` — all 52 API routes, page-level auth enforcement, admin
  authorization model
- `apps/extension` — content script boundary, message passing,
  storage isolation
- `supabase/functions/*` — cron-authenticated edge functions
- `supabase/migrations/*` — RLS policy design (source review only,
  live exploitation requires DB access — see G-04/G-06)
- Source-level review of: authentication, session handling, IDOR/BOLA,
  injection, XSS, SSRF, open redirect, CSRF/CORS, secrets handling,
  AI-credit business logic, Stripe webhook handling

Out of scope for this pass:
- Active/authenticated ZAP scanning (only passive baseline exists and
  runs on schedule; an active scan against real production is a
  founder decision, not made unilaterally here)
- Physical/social-engineering testing
- Infrastructure-level testing (Vercel/Supabase platform security —
  their responsibility, not this app's)
- Real Stripe/email/AI-provider live-charge testing without explicit
  authorisation (operating rule 15)
- Any testing against production that could degrade service for real
  users, even the small existing user base

## Exclusions

- Denial-of-service testing (would risk degrading a live product with
  real users)
- Brute-force credential attacks (OAuth-only login narrows this
  surface; no password field exists to attack)
- Anything requiring production database write access this assessment
  does not have

## Assumptions

- The QA test account documented in `docs/qa-test-account.md` is
  representative of a normal, non-admin, non-Pro-billing user for any
  live production testing performed.
- The codebase at the tested SHA (`130ca9ae5f9038e4eece27ad9a3eb549af431a3a`
  per `docs/release/release-candidate-record.md`) is representative of
  what's deployed — itself an unverified assumption, tracked as G-02.

## Rules of engagement

1. No destructive action against production data.
2. No real payment, email, or AI-provider charge without separate,
   explicit authorisation.
3. Any live production request is read-only or uses the QA test
   account's already-safe-by-design blocked-actions (Stripe checkout
   returns 403 for it; welcome email is skipped for it).
4. Findings are reported honestly regardless of severity — no
   downgrading to make the release look more ready than it is.
5. Every finding gets a retest after any fix, with new evidence — a
   retest is never marked resolved from the original evidence alone.

## Authorisation boundary

This assessment operates under the same authorisation as the rest of
this release-assurance program — initiated by the repository's
founder/owner, against the founder's own repository and (where
read-only production checks are performed) the founder's own
production deployment. No third-party systems are targeted.

## Methodology

| Technique | Tool/method | Status |
|---|---|---|
| Static analysis | CodeQL (existing CI) | Latest run retrieved, not re-triggered |
| Dependency audit | dependency-review (existing CI) | Latest run retrieved |
| Secret scanning | GitHub built-in secret scanning (repo Settings toggle) | Founder to confirm enabled — this assessment cannot toggle repo settings |
| Passive dynamic scan | ZAP baseline (existing CI, weekly) | Latest run retrieved |
| Manual source review | OWASP Top 10 / API Security Top 10 checklist against actual route code | This assessment, Phase 3 |
| API-level authorisation testing | Local Playwright/unit tests constructing real cross-user scenarios | This assessment, Phase 3 — see `RLS-###`/`ADMIN-###` in `test-cases.csv` |
| Safe local dynamic testing | Local dev server, mocked externals | This assessment, Phase 3 |

## Environment

- Tester: this assessment (Claude Code, acting on the founder's
  behalf, per the operating rules)
- Dates: 2026-08-23 onward
- Commit SHA: `130ca9ae5f9038e4eece27ad9a3eb549af431a3a` (provisional
  release candidate)
- Tools/versions: CodeQL (GitHub default JS/TS query set),
  `dependency-review-action` (as pinned in `.github/workflows/dependency-review.yml`),
  `zaproxy/action-baseline` (as pinned in `.github/workflows/zap-baseline.yml`)

## Deliverables

- `docs/security/penetration-test-report.md` — findings, evidence,
  severity, remediation, retest status
- `docs/security/security-findings.csv` — structured findings register
- `docs/security/security-retest-report.md` — populated only after a
  fix is made and re-verified

## Severity definitions

| Severity | Definition |
|---|---|
| Critical | Directly exploitable, unauthenticated or low-effort, leads to cross-user data exposure, account takeover, or financial loss |
| High | Exploitable with some precondition (e.g. requires a valid but non-privileged session), significant impact |
| Medium | Requires unusual conditions or has limited impact |
| Low | Defense-in-depth gap, minimal standalone impact |
| Informational | Best-practice deviation, no direct exploitability demonstrated |

## Recommendation for beyond this beta

Per §9, this plan explicitly recommends commissioning an independent,
qualified third-party penetration test before: public (non-invite)
launch, any enterprise customer requiring a security review, handling
materially larger personal-data volumes, wider browser-extension
distribution (e.g. Chrome Web Store public listing at scale), or
material payment volume. This recommendation is made regardless of
this pass's findings — it reflects the inherent ceiling of a
founder-led/automated assessment, not a specific concern about this
codebase.
