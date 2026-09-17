# Repository Capability Gap Audit

**Inspection date:** 10 September 2026  
**Scope:** code/schema evidence for the ten proposed moat capabilities; not a runtime production audit

## Executive finding

The repository contains meaningful evidence-first foundations, but none of the ten capabilities is
complete as a governed production moat. The strongest reusable pieces are evidence status/claim links,
international assessment contracts, country citations, mobility persistence, RLS, administrative
audit foundations and Stripe webhook idempotency. The largest missing layer is versioned source/rule
operations bound to immutable decision records and exact expert sign-off.

## Capability-by-capability evidence

| Capability                         | Present evidence                                                                                   | Missing for intended capability                                                                 | Verdict                         | First ticket |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------- | ------------ |
| 1. Versioned mobility sources      | `OfficialSourceCitation` has `reviewedAt`/`ruleVersion`; country packs cite sources                | Immutable content revisions, hashes, effective intervals, supersession and claim links          | Foundation only                 | MOB-003/004  |
| 2. Source-change detection         | `market_refresh_requests` admin foundation exists                                                  | Fetch/revision history, semantic diff, materiality workflow, affected-rule query and freeze     | Not implemented as system       | MOB-005      |
| 3. Immutable decision records      | Analysis/application snapshots and operational events exist                                        | Canonical route input/bundle/trace hash; append-only substance; correction links                | Partial generic persistence     | MOB-010      |
| 4. Employer/sponsor verification   | Employer evidence schema; IND links; vacancy sponsorship detection                                 | Versioned register ingest, legal entities/KVK, assertion semantics, precision benchmark/history | Signal-level only               | MOB-012/013  |
| 5. Candidate evidence provenance   | Shared evidence facts include source, status, observed/confirmed/expiry dates; DB evidence records | Immutable evidence revisions, exact spans, extraction lineage and full cascade/recovery         | Material foundation             | MOB-014      |
| 6. Claim-to-evidence links         | Shared support/contradict links and claim assessment exist                                         | Persisted claim graph, exact revisions/spans, server export/content enforcement everywhere      | Material foundation             | MOB-004/015  |
| 7. Decision replay                 | Deterministic pure functions/tests and saved snapshots provide ingredients                         | Bundle-addressed as-decided replay, current delta, canonical hash and affected-decision query   | Not complete                    | MOB-011      |
| 8. Correction/disagreement capture | Beta feedback/admin audit/operational logs provide generic channels                                | Typed corrections, severity, dual expert labels, adjudication, freeze/replay/notification       | Not capability-complete         | MOB-016      |
| 9. Country readiness scores        | Full/explorer support level and coverage reports exist                                             | Evidence-derived non-compensating route gates; no manual country “supported” promotion          | Current labels are insufficient | MOB-006/017  |
| 10. Expert sign-off records        | No exact bundle/source/corpus-bound record located                                                 | Identity/authority, scope, hashes, expiry, conflict and release enforcement                     | Not implemented                 | MOB-017      |

## Additional engineering observations

### Two decision layers remain

`packages/shared/src/international/assessment.ts` and its orchestration are the newer mobility-specific
path. `packages/shared/src/fit-model.ts` with `eu-fit/decision-policy.ts` remains another decision path.
The repository comments already deprecate portions of the latter, but live reachability must be tested
before convergence. Do not infer dead code from comments.

### Country packs are citations/checklists, not rule bundles

Germany, Netherlands, Ireland and UK packs contain pathways, evidence prompts, citations and
limitations. They deliberately avoid unsafe current-value evaluation in places. That is a sound
interim safeguard, but `ruleVersion` strings on citations do not provide atomic rules, source
snapshots, effective-date selection or expert-signed release authority.

### Honest output safeguards exist

`InternationalAssessment` separates evidence used, missing evidence, blockers, assumptions, sources
and `cannotConfirm`. Existing audit documentation reports a salary-verification disclosure and
sponsorship-denial regression fixes. Preserve and migrate these behaviours; a new rule engine must not
regress them.

### Persistence is not automatically immutable

The current `evidence_records` policies include update/delete paths for the user. That may be correct
for user-controlled current evidence, but immutable decision replay requires distinct append-only
revisions/snapshots. Do not simply make all evidence undeletable; reconcile audit integrity with
privacy deletion and user correction.

### Useful adjacent foundations

- `profile_revisions` supports a revision pattern.
- application deletion tombstones show recovery/deletion awareness.
- admin memberships/audit events/feature flags can support controlled publishing.
- workflow operational events can support monitoring.
- `stripe_webhook_events` provides an idempotency foundation, but real production verification is
  still required.
- ESCO data may support occupation candidates, but cannot autonomously establish legal occupation
  mapping without route-specific evidence and review.

## Architecture decision recommendation

Use existing international/evidence types as migration inputs, not as the final governed model.
Introduce additive source, claim, rule-bundle, evidence-revision, decision-snapshot, entity-assertion,
correction and sign-off structures. Dual-write/shadow-evaluate first. Only retire legacy writes after
call-path evidence, data reconciliation, regression parity and rollback proof.

## Audit limitations

This is a static repository inspection. It does not prove which routes are exercised in deployed
production, whether migrations are applied, whether feature flags expose UI, or whether external
services work. MOB-001 and the production verification plan are required to close those gaps.
