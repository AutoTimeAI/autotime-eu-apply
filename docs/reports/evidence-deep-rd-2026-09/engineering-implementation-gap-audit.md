# Engineering implementation gap audit

## Outcome

The repository originally contained useful evidence-first components but not the defensible system described by the Phase 2 research. On 12 September 2026, the first engineering foundation was added: versioned source/claim/rule contracts, append-only provenance ledgers, employer-register evidence, canonical decision records and replay comparison, correction records, derived readiness enforcement, expert-sign-off linkage, and fail-closed source-change classification.

This is a schema and policy foundation, not yet a production-operated moat. Existing country-pack citations and UI decisions have not been migrated to the new server-controlled ledgers. The migrations have static safety tests but have not been applied to or exercised against production. Scheduled source capture, reviewer operations, alerts, live provider verification and expert approvals remain outstanding.

## Ten-capability implementation audit

| Capability | Current repository evidence | State | Required engineering closure |
|---|---|---|---|
| Versioned mobility sources | `OfficialSourceCitation` includes `reviewedAt` and `ruleVersion`; country packs embed URLs | Partial | Persist source documents and immutable captures with raw/normalised hashes, retrieval metadata, valid/system time and predecessor links |
| Source-change detection | No governed fetch/diff/quarantine pipeline found | Absent | Scheduled capture, versioned normalisation, semantic classification, dependency impact and automatic safe-state demotion |
| Immutable decision records | Workflow tables save result summaries, but mutable/update patterns remain | Partial/unsafe for moat | Append-only canonical decision envelope referencing exact input, source, claim, rule, employer and output-policy versions |
| Employer and sponsor verification | Netherlands types accept `official-register`; country pack asks for register evidence | Partial | Persist register versions and rows; exact legal-entity resolution; ambiguity/staleness states; vacancy-specific evidence kept separate |
| Candidate evidence provenance | Shared evidence facts carry source kind/label/URI/status | Partial | Immutable evidence-item versions, extraction spans, confirmation/correction lineage and PII-separated payload storage |
| Claim-to-evidence links | `ClaimEvidenceLink` supports/contradicts candidate facts | Partial | Persist atomic legal/product claims and typed links to source spans and candidate/vacancy/employer evidence versions |
| Decision replay | No deterministic historical/successor replay service found | Absent | Canonical serialisation, original-version replay, successor comparison, idempotent jobs and impact reconciliation |
| Correction and disagreement capture | Analytics records `fact_correction`; no governed decision correction chain found | Partial | Persist disagreement reason, target claim/source/decision, triage state, successor decision and notification disposition |
| Country readiness scores | `CountrySupportLevel` is only `full` or `explorer` | Misleadingly coarse | Derive readiness from chain completeness, freshness, tests, sign-off, incident state and output permission |
| Expert sign-off records | Documentation schema exists; no persisted runtime enforcement found | Absent | Version-scoped sign-off table, reviewer evidence, permitted/prohibited language, expiry/withdrawal and automatic route demotion |

## Implementation checkpoint — 12 September 2026

| Capability | Engineering foundation now present | Remaining production closure |
|---|---|---|
| Versioned mobility sources | Source documents, immutable versions/spans, content hashes, temporal fields and lineage | Ingestion workers, object-store snapshots and production migration |
| Source-change detection | Deterministic raw/normalised/pipeline/outage classifier; fail-closed audit ledger | Scheduler, semantic reviewer queue, dependency fan-out and alerts |
| Immutable decision records | Canonical decision envelope, output hash, exact bundle/evidence references | Server repository/service integration and production writes |
| Employer and sponsor verification | Versioned registers/rows and exact-match-only verified state | Country adapters, register ingestion and vacancy-specific sponsorship checks |
| Candidate evidence provenance | Deletable personal item/version lineage with hashes and encrypted-payload references | Encryption/object-storage implementation, extraction spans and retention jobs |
| Claim-to-evidence links | Persisted typed links between decisions, claim versions, source spans and candidate evidence | Authoring/reviewer tooling and migration of existing country packs |
| Decision replay | Stable canonicalisation, original/successor comparison and replay ledger | Durable worker, impact inventory and operator UI |
| Correction/disagreement | Correction target, reason, workflow state and successor decision lineage | User submission UI, triage permissions and notification workflow |
| Country readiness | Derived score/state/output permission with stale/conflict/test/incident gates | Wire into routing/UI; replace `full`/`explorer` as a release signal |
| Expert sign-off | Immutable sign-off records; definitive readiness requires approved linked sign-off | Identity assurance, reviewer workflow, real jurisdictional sign-offs and withdrawal automation |

### Verified locally

- Mobility registry migration tests: 4/4.
- Decision provenance migration tests: 4/4.
- Decision replay tests: 4/4.
- Readiness policy tests: 5/5.
- Source-change tests: 5/5.
- Readiness-ledger migration tests: 3/3.
- Evidence integrity tests: 12/12.
- Shared TypeScript typecheck: passed.

These results prove repository contracts and policy behavior only. They are not evidence that migrations ran in production, sources are monitored, legal guidance is accurate, users trust recommendations, or third-party providers deliver successfully.

## Critical model conflicts

### Mutable evidence versus immutable provenance

`public.evidence_records` currently grants owners update and delete policies. That is appropriate for user-managed content but cannot double as immutable legal provenance. The new evidence registry must be separate. Candidate personal payloads must remain deletable; non-personal source/version and decision-integrity metadata can be append-only subject to the approved retention basis.

### Code citations versus governed source versions

Country-pack `reviewedAt` and `ruleVersion` strings identify developer review, not a captured source object. They cannot prove what bytes were retrieved, detect silent edits, represent publication versus commencement, or replay a historical output. Packs should reference activated rule-bundle IDs supplied server-side.

### `full` support versus release readiness

Germany and Netherlands are marked `full`, but Phase 2 requires independent expert sign-off, source freshness, boundary tests and incident state. Rename the concept to content coverage or preserve it only for compatibility; it must not control user-facing confidence or release.

### Decision labels versus mobility evidence state

`Apply`, `Investigate first`, `Stretch application` and `Skip` mix application strategy with mobility evidence. The canonical record must store them as separate domains:

- role/action recommendation;
- mobility evidence state;
- employer verification state;
- regulatory output permission;
- uncertainty/reason codes.

## Additive implementation sequence

### Slice A — source and claim registry

Create append-only `mobility_source_documents`, `mobility_source_versions`, `mobility_source_spans`, `mobility_claims` and `mobility_claim_versions`. Version rows carry valid time and system time, content hashes, snapshot references, source authority/language, publication/effective/expiry dates and predecessor/supersession relationships.

**Acceptance:** two versions coexist; an update/delete attempt is rejected; a historical effective-time query resolves the predecessor; personal data is prohibited from source snapshots.

### Slice B — rule bundles and sign-off

Create immutable `mobility_rule_bundles`, versions, rules, claim dependencies and expert sign-offs. Activation is a separate audited event. A bundle cannot activate if critical claims, tests or unexpired sign-off are absent.

**Acceptance:** expiring or withdrawing sign-off demotes the route without deleting history; only Germany/Netherlands can enter a conditional release state.

### Slice C — evidence and employer versions

Add candidate evidence item/version, vacancy snapshot and employer-register/version/row/match tables. Store encrypted/deletable personal payload separately from content-addressed non-personal provenance.

**Acceptance:** exact legal-name/identifier match, ambiguous match, not found and stale states are distinct; register membership never means vacancy sponsorship.

### Slice D — immutable decisions and replay

Persist a canonical decision envelope referencing every version above. Implement original and successor replay; corrections create linked successors. Canonical output excludes volatile timestamps and uses stable ordering.

**Acceptance:** `EU-REPLAY-001` is byte-equivalent; source or rule change produces a comparison diff and affected-decision inventory; replay is idempotent.

### Slice E — change and disagreement operations

Implement fetch/diff/materiality/quarantine, correction reports, reviewer queue, incident timeline and reconciliation metrics. No automated fetch activates legal interpretation.

**Acceptance:** simulated silent change, source outage, register removal and compromised sign-off move affected outputs to their specified safe states.

## Immediate engineering non-goals

- Do not hard-code all 20 market thresholds into client bundles.
- Do not migrate existing mutable evidence rows into immutable provenance without a privacy design.
- Do not rename current `full` coverage to “verified” or “approved.”
- Do not use fuzzy company matching to award a sponsor badge.
- Do not collapse role fit and mobility evidence into a single score.
- Do not expose routes outside Germany/Netherlands as automated eligibility.

## First pull-request boundary

The safest first change is Slice A only: shared schemas plus additive database objects and migration-safety tests. It should not change current UI output. This creates the stable identifiers and temporal model required by every later capability while preserving rollback and avoiding a premature dual-write migration.

The first pull request is complete only when it includes schema/API contracts, additive migration, ownership and immutability controls, temporal and coexistence tests, threat/privacy notes, observability fields and a documented rollback that disables activation without dropping data.
