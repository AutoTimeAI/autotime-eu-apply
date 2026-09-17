# Foundation and Repository Reconciliation

## Current position

The repository contains meaningful evidence-first foundations, but it does not yet contain the governed mobility platform specified by this R&D package. The earlier estimate that the full ten-capability moat is below 10% remains directionally reasonable; several capabilities are partially represented in types or analytics, not end-to-end production systems.

## Existing assets to preserve

### Evidence facts and claim support

`packages/shared/src/evidence/model.ts` already defines evidence states including verified, user-declared, inferred, conflicting, stale, missing and unknown. It separates bounded evidence facts from generated prose and implements claim-to-evidence support/contradiction evaluation.

This is a strong conceptual seed for candidate evidence provenance and claim-to-evidence links. It is not yet the full moat because:

- each fact has one `source`, limiting multi-artifact/issuer/span relationships;
- values are strings without typed/effective-time semantics;
- there is no immutable snapshot or supersession model in the schema;
- comments acknowledge that nothing currently assigns `unknown` to a fact;
- claim links do not preserve stable claim records, source spans or decision snapshots;
- persistence, deletion and replay behaviour are not established here.

### International assessment model

`packages/shared/src/international/types.ts` defines cautious pathway states, money, source citations, mobility profiles, employer evidence and assessment inputs/outputs. `assessment.ts` uses rule-based evaluation, separates missing evidence and blockers, provides official sources and states what it cannot confirm.

This aligns well with the foundation principle “Unknown—verify.” It should be evolved rather than replaced wholesale.

### Country packs and explorer mode

The live engine has dedicated packs for Ireland, Germany, Netherlands and UK, with a generic explorer fallback for other countries. Explorer mode deliberately returns `Investigate first` and avoids pathway conclusions. This is safer than pretending the listed explorer countries are fully supported.

The public/product terminology must keep “listed for exploration” distinct from “supported.” The R&D atlas uses R0–R4 for this reason.

### Sponsor and decision signals

The assessment supports official-register employer evidence for the Netherlands and UK, and explicitly notes that register presence does not guarantee sponsorship for a vacancy. Vacancy sponsorship rejection language and missing evidence are integrated into decisions.

This is the right caution, but the current employer evidence is a single object supplied to the assessment. It lacks a versioned register snapshot, legal identifier, entity-resolution method, aliases, possible-match state and correction history.

### External statutory assessment

The `Stamp4SponsorshipAssessment` path provides a second, narrower statutory-threshold/occupation assessment for UK, Ireland, Netherlands and Germany. This confirms that two decision implementations exist: AutoTime's country-pack evaluator and the external Stamp4 check.

The adapter is additive, but the systems are not unified under one canonical rule bundle and immutable decision contract. External labels such as Eligible/Likely are translated into AutoTime evidence without preserving the full external rules/source bundle in the shown schema.

## Ten-capability evidence

| Capability                      | Repository evidence                                                        | Current judgement                     | Required next increment                                                    |
| ------------------------------- | -------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------- |
| Versioned mobility sources      | `OfficialSourceCitation.reviewedAt/ruleVersion`                            | Partial metadata only                 | Immutable source document/span and bundle dependency model                 |
| Source-change detection         | No end-to-end implementation found in reviewed core files                  | Missing                               | Fetch/hash/diff/triage/replay pipeline                                     |
| Immutable decision records      | Assessment outputs exist                                                   | Missing as durable append-only record | Snapshot IDs, engine/rule version, immutable hash and persistence          |
| Employer/sponsor verification   | Employer evidence and official-register type                               | Partial/input-level                   | Authoritative snapshots, identifiers and precision-first resolver          |
| Candidate evidence provenance   | `EvidenceFact` and source kinds                                            | Partial                               | Artifact/span graph, typed values, multiple evidence links and persistence |
| Claim-to-evidence links         | `ClaimEvidenceLink`, support evaluator                                     | Partial                               | Stable claims/spans, application integration and export blocking           |
| Decision replay                 | No canonical replay record found                                           | Missing                               | Old/new bundle execution and delta/notification record                     |
| Correction/disagreement capture | `fact_correction` and override analytics; audit says disagreement not live | Partial                               | Durable correction cases, evidence, resolution and affected decisions      |
| Country readiness scores        | Full/explorer support level                                                | Missing as governed readiness         | Derived R0–R4 hard gates and operational health                            |
| Expert sign-off records         | No scoped signed bundle record found                                       | Missing                               | Reviewer scope, decision, limitations, credentials and expiry              |

## Critical product risks found

### “Apply” can overstate readiness

The international engine returns `Apply` when no blocker/missing evidence remains, while also stating that it cannot confirm permit grant or vacancy sponsorship. For UK personalised use, the verb itself may be advice-sensitive. For all markets, an `Apply` recommendation is broader than route viability.

Introduce separate axes:

- `mobility_evidence_state`;
- `application_action_state`;
- `regulatory_output_state`;
- `review_state`.

One should not automatically imply another.

### Source version is descriptive, not executable

`ruleVersion` is a string citation property. There is no evidence in the reviewed core that the decision loads an immutable effective-dated rule bundle. As a result, stored citations cannot by themselves guarantee replay.

### Money is too coarse

The current money schema has amount, currency and hour/month/year period. Country evidence shows that holiday pay, bonuses, fixed allowances, pension, fringe benefits, special payments and working hours may be included differently. The schema cannot safely evaluate these distinctions.

### Employer status is too optimistic

Employer evidence supports `confirmed`, but does not show the legal entity resolution required to earn that state. Add exact legal identifier/name and possible-match semantics before production Dutch/UK verification.

### Outcome strictness risks biased learning

The legacy fit model lowers future scores based on sponsorship blocks. This may be useful, but historical outcomes can reflect employer selection, market timing, vacancy quality and incomplete reporting—not just route feasibility. Outcome learning must not silently rewrite legal eligibility.

## Recommended migration

1. Keep existing assessment inputs and safe explorer behaviour operational.
2. Introduce new source/span/rule bundle records beside current citations.
3. Extend evidence facts through versioned adapters rather than destructive schema replacement.
4. Persist a canonical decision record around both local and Stamp4 evaluations.
5. Treat Stamp4 as an evidence provider with provider version, source bundle, raw result hash and expiry.
6. Split mobility evidence from apply/skip workflow action.
7. Add compensation components and exact employer identity.
8. Build replay before expanding full country packs.
9. Replace `full/explorer` marketing semantics with derived readiness gates while maintaining compatibility.
10. Backfill old decisions as `legacy_unreplayable`; never fabricate historical rule versions.

## Verification anchors

- `packages/shared/src/evidence/model.ts`
- `packages/shared/src/international/types.ts`
- `packages/shared/src/international/assessment.ts`
- `packages/shared/src/international/stamp4-client.ts`
- `packages/shared/src/fit-model.ts`
- `apps/web/lib/analytics.ts`
- `docs/reports/acceptance-gate-audit-2026-09-10.md`

This reconciliation is based on the current shared core and the existing acceptance audit. Database migrations, API routes and persistence paths require a deeper implementation audit before estimating engineering effort.
