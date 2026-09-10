# Roadmap execution status

**Reviewed:** 10 September 2026  
**Scope:** EU Fit, evidence integrity, application preparation and profession expansion

## Decision

Engineering foundations can be delivered in code, but product phases are not
complete merely because code exists. Cohort, comprehension, willingness-to-pay,
qualified-review and regulated-profession gates require observed external evidence.

| Phase | Engineering status | Exit-gate status | Decision |
| --- | --- | --- | --- |
| 0 — foundation | Core decision, evidence, preparation, occupation, environment, ownership and logging contracts implemented | Complete source/version persistence still needs production evidence | Continue foundation hardening |
| 1 — Tech/FinTech validation | Launch module and core workflow implemented | Beta activation, comprehension, retention, safety and payment thresholds are not evidenced | Run controlled beta; do not claim completion |
| 2 — adjacent roles | Governed low-risk module mechanism exists | Discovery, evidence coverage and non-degradation evidence absent | Do not open broadly |
| 3 — occupation platform | Versioned schema, risk rules, freshness checks and test-pack identity implemented | No second validated module has demonstrated configuration-only onboarding | Validate one adjacent module first |
| 4 — regulated professions | Contract rejects regulated modules without qualified review and sources | Named qualified owners, jurisdiction reviews and vertical test evidence absent | Intentionally blocked by governance |
| 5 — multi-profession platform | Universal core direction is represented | Multiple independently profitable, validated modules do not exist | Not started |

## Implemented controls

- EU Fit decisions are isolated from scoring mechanics.
- Evidence states and claim support are canonical shared policy.
- Application drafting, approval, export and submission use explicit gates.
- The content API delegates orchestration through typed domain ports.
- Occupation modules declare scope, exclusions, evidence, requirements,
  uncertainty behavior, output conventions, accessibility, sources and ownership.
- Regulated modules fail validation without qualified review and sources.
- Local, test, preview, staging and production boundaries are explicit.
- Ownership and structured-log privacy requirements are executable tests.
- Codebase size is reproducible with `pnpm report:codebase`.

## Remaining engineering decomposition

These are maintainability tasks, not product-phase exit evidence:

1. Split `DashboardExperience.tsx` by workflow using characterization tests.
   EU Fit, evidence-review, application-preparation, role-outcome,
   interview-answer-drafting, resume-to-context-inference and profile
   quality/readiness logic are extracted to their own `apps/web/domains/`
   modules, plus one piloted JSX extraction (the CV-review suggestion panel
   to a presentational component), all verified with `tsc`, the full
   characterization-test sweep, and (for the JSX pilot) a live Playwright
   visual-regression run (10 September 2026, `DashboardExperience.tsx`
   9,903 -> 8,345 lines, a 15.7% reduction). Most remaining JSX is either
   the tab-by-tab workflow panels (large, deeply coupled to dashboard state)
   or the shared shell - splitting those further is deferred pending
   appetite for that higher-risk, prop-threading-heavy work.
2. Split extension page detection, widget UI and reviewed autofill from `autofill.ts`.
3. Split dashboard sync request handling from reconciliation and persistence.
   Step 1 done: the sync route's pure row<->record mappers and legacy-payload
   normalization moved to `apps/web/domains/sync/`, with new unit test
   coverage (`scripts/sync-dashboard-mappers.test.mjs`) that didn't exist
   before (10 September 2026, `route.ts` 1,185 -> 780 lines). The actual
   reconciliation/persistence sequencing inside POST/DELETE - tombstone
   resolution, application dedup, upsert ordering - is intentionally
   untouched: it writes real user data and needs its own characterization
   tests before being extracted behind a repository interface.
4. Divide global CSS into tokens, foundations and workflow styles.

Each extraction must be independently reviewable and test-protected. A wholesale
rewrite would violate the incremental-decomposition policy and create unnecessary
regression risk.

## Required next evidence

Run a controlled Tech/FinTech beta cohort and record time-to-decision, completion,
comprehension, factual corrections, unsupported-claim incidents, second-role return,
approved-kit conversion, payment behavior, and support/AI/source-maintenance cost.
Until those results satisfy the documented gates, the product remains a focused
validated-MVP candidate rather than a proven multi-profession platform.
