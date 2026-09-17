# Claude Code engineering handoff

## Mission

Implement the first defensible slice of AutoTime's candidate-controlled, evidence-backed cross-border decision system. Treat this package as product requirements and research evidence, not as legal approval. The foundation principle is: **deepness provides clarity, and clarity makes the founder clever**. In engineering terms, every recommendation must remain inspectable, versioned, replayable and correctable.

Read in this order: `founder-decision-memo.md`, `foundation-repository-reconciliation.md`, `technical-moat-specification.md`, `source-change-and-expert-review-sop.md`, `evaluation-case-catalogue.csv`, `research-claim-ledger.csv`, then `regulatory-and-privacy-boundaries.md`.

## First implementation boundary

Build Germany and Netherlands only. Do not expose automated eligibility outputs for the other 18 markets. Their research informs the architecture and roadmap, but incomplete source chains must remain general information or evidence checklists.

## Ordered slices

### 1. Canonical evidence contracts

Implement source document/version/span, atomic claim, rule bundle/version and candidate evidence item/version. Use valid-time and system-time intervals where specified. Store content hashes and immutable snapshot references. A rule may reference only explicit claim IDs.

**Gate:** migrations are additive; historical versions cannot be updated in place; tests prove two versions of one claim can coexist and be queried by effective/retrieval time.

### 2. Immutable decision record and replay

Persist candidate-evidence versions, vacancy snapshot, employer verification, rule bundle, source versions, result state, reason codes and rendered claim-to-evidence links. Add deterministic replay using original versions and comparison replay against a successor bundle.

**Gate:** `EU-REPLAY-001` reproduces byte-equivalent canonical output; correction creates a linked successor without deleting the original.

### 3. Netherlands sponsor verification

Ingest the official recognised-sponsor register with retrieval time and content hash. Resolve exact legal entities conservatively; distinguish verified, ambiguous, not found and stale. Never turn brand resemblance into verification or infer willingness to sponsor a vacancy.

**Gate:** `NL-SPONSOR-001`, `NL-SPONSOR-002` and a stale-register test pass. Every verification links to the exact register version and entity row.

### 4. Germany/Netherlands rule compiler

Compile declarative, versioned rules into `potential_match`, `not_supported`, `insufficient_evidence`, `source_conflict`, `employer_unverified`, `ruleset_quarantined`, `expert_review_required` or `information_only`. Keep application action separate from mobility evidence and regulatory output permission.

**Gate:** all applicable catalogue cases pass; unknown never becomes false; an expired or quarantined critical source cannot produce `potential_match`.

### 5. Change detection and correction

Implement scheduled source checks, normalized diff, materiality queue, quarantine, reviewer decision and affected-decision replay. Connect correction/disagreement capture to claim, source and decision IDs.

**Gate:** simulate the Flanders pending update and UK sponsor-removal cases without sending user communications; show the affected decision set and successor lineage.

### 6. Readiness and governed release

Derive route readiness from source-chain completion, freshness, rule coverage, test result, independent review, qualified-expert sign-off and incident status. Existing `full/explorer` labels must not masquerade as readiness.

**Gate:** expiring one required sign-off automatically demotes the route and changes output policy.

## Non-goals

- No broad career-suite expansion.
- No claims of increased interviews or successful immigration.
- No LLM-authored legal conclusions.
- No fuzzy sponsor badge without exact entity evidence.
- No destructive replacement of existing decision code before parity tests and migration plan.
- No “20-country launch” based on desk research alone.

## Required engineering output

For every slice, return schema/API changes; threat/privacy considerations; tests tied to catalogue IDs; migration/rollback; observability; unresolved assumptions; and the exact package claims used. If implementation reveals a contradiction, add it to the claim ledger rather than silently selecting a convenient interpretation.

## Founder acceptance question

At demo time, select any displayed conclusion and answer in under two minutes: what candidate fact, vacancy evidence, employer record, atomic claim, source version, rule version and output-policy decision produced it; what would change it; and how the product corrects it without rewriting history.

