# Before/after repository investigation

**Comparison:** B0 `4b5e1c7e` versus B2 working tree, inspected 12 September 2026. **Confidence:** high for file-level presence; medium for end-to-end completeness because B2 is uncommitted.

| CID ID | Capability | B0 finding | B2 finding | Current evidence state | Evidence |
|---|---|---|---|---|---|
| CID-2026-001 | Versioned sources/claims | Country citations carried coarse review metadata; no immutable source-version graph. | Source documents, versions, spans, claims and bundle schemas/migration exist. | Implemented; not deployment-verified | `packages/shared/src/evidence/versioned.ts`; `supabase/migrations/20260912120000_mobility_evidence_registry.sql`; `scripts/mobility-evidence-registry-migration.test.mjs` |
| CID-2026-002 | Change detection | No governed deterministic classifier found. | Raw/normalised/pipeline/outage classification and tests exist. | Implemented; scheduler/operation absent | `packages/shared/src/evidence/change-detection.ts`; `scripts/mobility-source-change.test.mjs` |
| CID-2026-003 | Decision provenance/replay | Mutable workflow summaries; no canonical historical replay. | Canonical envelopes, hashes, evidence links, correction and replay ledgers exist. | Implemented foundation; live writes incomplete/unproved | `packages/shared/src/evidence/decision.ts`; `supabase/migrations/20260912130000_mobility_decision_provenance.sql`; `scripts/mobility-decision-replay.test.mjs` |
| CID-2026-004 | Employer verification | Country-specific types/documentation; no versioned register graph. | Versioned register rows and exact-match constraints exist. | Implemented data model; adapters/data absent | migration above; `docs/reports/evidence-deep-rd-2026-09/engineering-implementation-gap-audit.md` |
| CID-2026-005 | Candidate evidence provenance | Evidence facts existed but were mutable/user-content oriented. | Personal item/version lineage and encrypted-payload references exist. | Implemented model; storage/retention operation unproved | decision-provenance migration |
| CID-2026-006 | Readiness/sign-off | `full/explorer` support was too coarse; sign-off was documentary. | Derived readiness/output permission and sign-off-linked ledger exist; live decision boundary has integration changes. | Implemented and locally tested; no real sign-off | `packages/shared/src/evidence/readiness.ts`; `supabase/migrations/20260912140000_mobility_readiness_ledger.sql`; `apps/web/platform/application-preparation/mobility-governance-repository.ts` |
| CID-2026-007 | Research breadth | No evidence-deep 20-market control package. | 123 claims, 74 cases, 20 source chains and 20 expert packets reported and validator-backed. | Documented research; not 20-market launch readiness | `docs/reports/evidence-deep-rd-2026-09/completion-and-limitations-audit.md`; `validate-package.ps1` |

## Net change

The repository moved from citation-aware decision support toward a temporal, auditable evidence architecture. This is strategically meaningful because replayability and traceability are prerequisites for regulated/high-consequence trust. It is not yet a moat: ingestion, operational learning, proprietary outcome feedback and demonstrated user value are missing.

## Integrity risks

- B2 is uncommitted and can drift; create a named checkpoint.
- Static migration tests do not prove PostgreSQL execution or production RLS behavior.
- Two decision implementations and legacy `full/explorer` semantics can produce inconsistent assurances.
- Existing country packs are not yet migrated into governed versions.
- Schemas create option value only when operated with source freshness, reviewer queues and correction feedback.
