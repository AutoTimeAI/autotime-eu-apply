# Technical Moat Specification

## Product invariant

AutoTime may explain or recommend only what it can reconstruct from a versioned rule bundle and supported facts. Every consequential output must answer:

- Which candidate, vacancy and employer facts were used?
- Where did each fact come from?
- Which rule version was effective at the relevant time?
- What passed, failed, conflicted or remained unknown?
- Which source supports each reason?
- What changed since a previous decision?
- Is the output general information, a bounded product recommendation or expert-reviewed guidance?

## Bitemporal source and rule model

Mobility rules have at least two timelines: when a rule is legally/effectively applicable and when AutoTime learned or corrected it. Both must be preserved.

```text
SourceDocument
  id, authority_id, jurisdiction, language, canonical_url
  title, publication_date, retrieved_at, content_hash
  effective_from?, effective_to?, supersedes_id?
  source_tier, retrieval_method, licence_note, raw_artifact_ref

SourceSpan
  id, source_document_id, locator, exact_text_hash
  normalized_text, translated_text?, translation_method?

RuleBundle
  id, jurisdiction, route_id, version, valid_from, valid_to?
  recorded_at, status, reviewer_state, source_dependencies[]

AtomicRule
  id, bundle_id, rule_type, parameters, expression
  decisive, source_span_ids[], uncertainty, abstention_condition
```

`valid_from/valid_to` represent effective time. `recorded_at` and source retrieval records represent system knowledge time. Correcting a wrongly encoded historical rule creates a new recorded version; it does not mutate history.

## Evidence model

```text
CandidateFact
  id, subject_id, fact_type, value, unit?
  valid_from?, valid_to?, recorded_at
  confidence, confirmation_state, expires_at?
  source_evidence_ids[], supersedes_id?

EvidenceArtifact
  id, owner_id, artifact_type, storage_ref, content_hash
  issued_at?, issuer?, language, verification_state
  retention_class, consent_scope

EvidenceSpan
  id, artifact_id, locator, extracted_value
  extraction_method, model_version?, confidence
  human_confirmed_at?, confirmed_by?
```

Facts derived from CVs are not equivalent to verified facts. The UI must distinguish user-entered, document-extracted, user-confirmed and independently verified states.

## Vacancy and employer model

```text
VacancySnapshot
  id, source_url, captured_at, content_hash
  legal_employer_id?, advertised_employer_text
  title, description, location, remote_policy
  contract_type, duration, hours
  compensation_components[], occupation_candidates[]

EmployerEntity
  id, jurisdiction, legal_name, legal_identifier?
  trading_names[], parent_id?, status

AuthorityRegistration
  id, employer_id, authority, register_type
  registration_identifier?, status, valid_from?, valid_to?
  source_document_id, observed_at, match_method
  match_confidence, reviewer_state
```

Only `exact_identifier`, `exact_legal_name` or manually confirmed matches can produce `verified`. Fuzzy/domain/group matches produce `possible_match`. No result produces `unverified`, not `not_a_sponsor` unless authoritative absence can be established for the exact entity and snapshot.

## Decision contract

```text
DecisionRecord
  id, tenant_id, actor_id
  candidate_snapshot_id, vacancy_snapshot_id
  employer_registration_snapshot_id?
  jurisdiction, route_id, rule_bundle_id
  evaluated_at, effective_at, engine_version
  result: pass | fail | conditional | unknown | review_required
  reason_ids[], missing_fact_ids[], conflict_ids[]
  assumption_ids[], citation_span_ids[]
  output_policy_id, reliance_state
  supersedes_id?, immutable_hash
```

The record is append-only. Display labels may evolve, but the original evaluated result and source relationships do not.

## Decision compiler

The compiler should use deterministic operators for thresholds, dates, set membership and Boolean gates. Probabilistic models may extract candidate/vacancy facts or propose occupation mappings, but cannot silently resolve decisive ambiguity.

Execution stages:

1. Load snapshots and effective rule bundle.
2. Validate required fact types and provenance.
3. Resolve exact authority datasets and employer identity.
4. Evaluate atomic rules with three/five-valued logic, preserving unknown and conflict.
5. Aggregate gates into route-specific result—never a cross-route average.
6. Generate reasons from rule outputs and citations, not free-form model memory.
7. Apply jurisdiction output policy.
8. Persist immutable record and dependency edges.

## Compensation normalisation

Salary is a recurring source of false certainty. Store each component independently:

```text
amount, currency, period, guaranteed, payment_frequency
component_type: base | fixed_allowance | bonus | equity | pension | holiday_pay | benefit
gross_or_net, working_hours, source_span_id
```

Each route defines includable component types. Currency conversion must not be used where an authority requires salary in the destination currency unless the legal rule explicitly permits it. Missing working hours or variable compensation can force `conditional` or `unknown`.

## Source-change pipeline

```text
scheduled fetch -> immutable raw snapshot -> canonical extraction
-> structural and semantic diff -> dependency lookup
-> severity classification -> reviewer queue
-> new bundle or no-material-change decision
-> replay impacted decisions -> user/ops notification policy
```

Severity:

- `critical`: threshold, eligible occupation, sponsor status, core eligibility gate or regulatory boundary;
- `material`: documents, process, fees, duration or renewal condition;
- `editorial`: wording/navigation without rule effect;
- `unclassified`: fail closed until reviewed.

Critical or unclassified changes disable affected current conclusions unless an approved bundle remains demonstrably valid.

## Decision replay

Replay supports four questions:

1. Can the stored decision be reproduced exactly?
2. What would the same facts produce under today's rules?
3. Which source/rule change caused a different result?
4. Which active or saved candidate decisions are impacted?

Replay output is itself immutable and links old/new bundles, delta reasons and notification decisions.

## Correction and disagreement

```text
CorrectionCase
  id, target_type, target_id, submitted_by, submitted_at
  category, assertion, evidence_ids[], severity
  original_state_hash, resolution, resolved_by, resolved_at
  replacement_id?, affected_decision_ids[], notification_state

ExpertReview
  id, reviewer_id, jurisdiction, authorised_scope
  target_bundle_id, decision: approve | approve_with_limits | reject
  limitations, signed_at, expires_at, credential_reference
```

Disagreement is data. Preserve minority/conditional opinions and route them into tests; do not overwrite them with the latest reviewer comment.

## Country readiness calculation

Readiness is derived, not manually marketed:

| Dimension                                | Weight | Minimum for R3                       |
| ---------------------------------------- | -----: | ------------------------------------ |
| Primary-law/official source completeness |    20% | 90%, no missing decisive rule        |
| Freshness/change monitoring              |    15% | All critical sources inside SLO      |
| Atomic-rule and citation coverage        |    15% | 100% decisive reasons cited          |
| Golden/boundary/adversarial tests        |    20% | All critical tests pass              |
| Independent/expert review                |    15% | Signed with limitations and expiry   |
| Operational replay/incident readiness    |    10% | Successful replay and rollback drill |
| Permitted-output/regulatory review       |     5% | Output policy approved               |

A weighted score cannot override a failed hard gate. Missing expert review, unresolved critical source change or unreproducible decisions caps the market below R3.

## Evaluation corpus

Per production route, minimum initial corpus:

- 30 ordinary representative cases;
- 10 exact-threshold/date/contract boundaries;
- 10 adversarial or incomplete cases;
- 5 employer identity ambiguity cases where applicable;
- 5 historical replay cases;
- all known corrections and expert disagreements as regressions.

Report exact-match accuracy for deterministic rules, precision/recall for occupation/entity mappings, abstention rate, false-verification count, expert agreement, citation coverage and replay success separately. A single “AI accuracy” number is prohibited.

## Security and privacy controls

- Separate identity, evidence artifacts and analytical events where practical.
- Encrypt transport and storage; apply tenant-scoped authorisation at every evidence access.
- Log access to sensitive artifacts and expert review records.
- Define retention per artifact class and verify deletion cascades, backups and recovery behaviour.
- Do not train on candidate materials without separate informed permission and an enforceable data path.
- Minimise nationality, immigration history and family data to what a selected route actually needs.
- Complete a DPIA before production personalised recommendations.
- Assess GDPR profiling/Article 22 applicability based on real effects and product workflow, not a blanket assumption.

## Regulatory output policy

Output policy is a first-class dependency:

```text
jurisdiction, product_surface, audience, allowed_verbs
max_confidence_label, required_disclosures
human_review_trigger, regulated_partner_route
approved_by, valid_from, expires_at
```

For the UK, personalised immigration advice remains disabled until written regulated-scope analysis. General source-linked information and exact sponsor-register facts may remain possible subject to review. The software must not transform “information only” into advice by combining it with individual facts and prescriptive language.

## Implementation sequence

1. Canonical snapshots and IDs.
2. Source registry, hashes and atomic citations.
3. Candidate evidence graph.
4. Deterministic rule compiler with unknown/conflict states.
5. Immutable decision records.
6. Dutch sponsor entity resolution.
7. Replay and source-change dependency graph.
8. Correction, disagreement and expert sign-off.
9. Derived country readiness and operational dashboards.
10. Outcome learning after consent, completeness and bias review.

The first production proof is not UI completeness. It is one German and one Dutch decision that can be reproduced, challenged, corrected and replayed after a controlled source change without losing provenance.
