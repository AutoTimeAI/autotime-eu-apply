# Gap Analysis

Companion to `00-current-test-inventory.md`. States what blocks a
release decision today, who owns closing each gap, and what evidence
would close it. This is the working backlog for the rest of this
assessment — items are removed (moved to `06-test-execution-report.md`)
only once genuine evidence exists, never on documentation alone.

## Gaps that block a release decision (mandatory-gate related)

| # | Gap | Blocks gate (§19) | Owner | Closing evidence |
|---|---|---|---|---|
| G-01 | No release SHA is tagged/frozen; latest tag `v0.1.2-pre-commercial-prod` is 15 days and ~65 PRs behind `main`. | Gate 1 | Founder | `docs/release/release-candidate-record.md` + a real tag once you decide the cut point. |
| G-02 | Deployed SHA cannot be verified against tested SHA from this environment (no Vercel access, `/api/diagnostics/health` didn't return a parseable marker). | Gate 2 | Founder | Vercel deployment ID/SHA or dashboard access, or confirmation the health route needs an internal header I don't have. |
| G-03 | No penetration-test artefact of any kind existed before this assessment. | Gate 22 | This assessment | `docs/security/penetration-test-plan.md` + `-report.md` (founder-led/automated tier — see G-13). |
| G-04 | Production Supabase migration-applied status is unverified — I have no production DB access. | Gate 11 | Founder | Either grant read access, or run the verification queries in `docs/database/migration-verification-report.md` yourself and paste results back. |
| G-05 | Production secrets/config presence is unverified beyond the repo's own `.env.production.example` template. | Gate 12 | Founder | Confirm presence (not values) for each row in `docs/release/production-configuration-register.csv`. |
| G-06 | Backup/restore/rollback are described in `docs/operations-runbook.md` narrative but never demonstrated. | Gates 15–17 | Founder (needs Supabase/Vercel access) | A controlled restore test in a non-production project, or a documented reason it's deferred with residual-risk acceptance. |
| G-07 | Real Stripe checkout, real email delivery, and real AI-provider charges are all untested end-to-end (mocks only). | Gate 21, partially 13 | Founder authorisation required | Explicit go-ahead to run one real, low-value transaction of each type, or accept the residual risk in `docs/release/risk-register.csv`. |
| G-08 | Two existing readiness docs (`docs/testing/public-launch-gate-checklist.md`, `docs/testing/readiness-status-table.md`, both dated 2026-05-24) say "Not Ready" and predate the entire August fix sprint. | Credibility of any GO decision | This assessment | Explicit reconciliation note added to both files pointing to this assessment as the current source of truth (done below). |

## Reconciliation of stale readiness docs (G-08)

Both `docs/testing/public-launch-gate-checklist.md` and
`docs/testing/readiness-status-table.md` are **not deleted or
silently overridden** — per the operating rules, existing
documentation is not proof either way. They predate:

- the 2026-08-15 beta-readiness pass (`docs/beta-release-qa-2026-08-15.md`),
- the 2026-08-21 QA-documentation generation (123-case workbook),
- and this session's 65-PR audit-and-fix sprint (PRs #88–#176),

so their "Not Ready" verdict reflects the May state of the product,
not today's. A pointer note will be added to the top of both files
once `docs/qa/09-release-readiness-report.md` exists, directing
readers to the current assessment rather than leaving two
contradictory "ready" signals live in the repo simultaneously.

## Non-blocking but material gaps

| # | Gap | Impact | Plan |
|---|---|---|---|
| G-09 | Visual regression covers only 6 states × 2 viewports; no admin, populated, error, or blocked states. | Weakens Gate 5/6 confidence, not a hard blocker | Add `E2E-VIS-###` cases in `05-master-test-plan.md`; extend baselines locally, do not blind-update on failure. |
| G-10 | Extension has no per-file test coverage — only a custom `run-tests.mjs` runner of unknown depth. | Weakens `EXT-###` confidence | Inspect `run-tests.mjs` directly in Phase 6 before writing new `EXT-###` cases so they're additive, not duplicated. |
| G-11 | No PAY-### structured test catalogue despite a webhook-idempotency migration (`20260821170000_stripe_webhook_idempotency.sql`) landing 2026-08-21. | Payment confidence is code-verified, not test-catalogued | Author `PAY-###` cases against the mocked/test-mode Stripe path in Phase 3. |
| G-12 | No CSV-structured defect/risk/requirements-traceability registers exist — only small prose tables. | Traceability | Create the CSV registers per §6/§10/§15 field sets; migrate any still-open items from `docs/testing/` prose docs rather than losing them. |
| G-13 | No independent professional penetration test — only source review + automated scanning is possible from this seat. | Gate 22 ceiling | This assessment will explicitly self-classify as **founder-led/automated**, never claim independent/CREST assurance, and recommend a real third-party test before public launch per the master prompt's own criteria (§9). |
| G-14 | `docs/qa/Test-Evidence/` exists but is empty (`.gitkeep` only); no `test-evidence/<sha>/` tree exists. | Evidence storage | Create the tree under `test-evidence/130ca9ae.../` per §11, with a `.gitignore` rule for anything containing personal data. |

## What is NOT a gap (verified working, not re-litigated)

- `pnpm test:unit` — full chain green at HEAD (39 files, `fail 0`
  everywhere), independently re-verified as part of this session's
  merge-queue closure, not just trusted from an old CI badge.
- CodeQL and the "CI" unit-test workflow — both green on HEAD per
  `gh run list`.
- `docs/quality-assurance.md` — actively maintained, current, not
  stale (last substantive entry this session, 2026-08-23).
- Sentry redaction — has dedicated, passing test coverage
  (`apps/web/tests/sentry-privacy.test.mjs`, 9 cases including a
  QA-secret-in-URL end-to-end case) plus a real fix landed this
  session (PR #169) reusing that pipeline in the diagnostics logger.
- Atomic AI-credit reserve/confirm/release lifecycle — has migration-level
  implementation (`20260821160000_atomic_ai_call_reservation.sql`)
  and multiple `production-hardening.test.mjs` assertions confirming
  reserve-before-call, release-on-failure, and finalize-before-DB-write
  ordering across `ai/*` and `outreach` routes.

## Immediate next actions (this phase)

1. `docs/qa/02-environment-and-prerequisites.md`
2. `docs/qa/03-test-data-and-fixture-plan.md`
3. `docs/qa/04-requirements-traceability-matrix.md`
4. `docs/architecture/verified-system-architecture.md`
5. `docs/security/data-flow-and-trust-boundaries.md` + `attack-surface-register.csv`
6. `docs/release/release-candidate-record.md`
