# Technical and Governance Specification

**Status:** implementation specification; requires architecture review and migration design before build.

## System invariant

Every consequential recommendation must be reproducible from immutable candidate/vacancy facts and an
exact route-rule bundle. Every displayed reason must link to evidence. If evidence, rule currency or
output authority is insufficient, the system must abstain.

## Bounded contexts

| Context            | Owns                                                          | Must not own                                |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------- |
| Source operations  | Authority sources, revisions, retrievals, diffs and incidents | Candidate decisions                         |
| Policy compilation | Atomic route rules, effective dates and executable bundles    | LLM-generated thresholds                    |
| Candidate evidence | Facts, documents, source spans, confirmation and conflicts    | Immigration-rule truth                      |
| Vacancy evidence   | Captured vacancy facts, employer identity and provenance      | Sponsor certainty without register evidence |
| Decisioning        | Immutable evaluations, reasons, missing facts and replay      | Mutable “latest result” as sole record      |
| Claim compilation  | Application claims and supporting evidence links              | Unsupported generated assertions            |
| Review/governance  | Expert sign-offs, overrides, disagreements and expiry         | Silent edits to historical decisions        |
| Outcome learning   | Consent-scoped behaviour and outcomes                         | Causal claims unsupported by study design   |

## Minimum persistence model

### `authority_sources`

`id`, `jurisdiction`, `authority`, `canonical_url`, `source_class`, `language`, `route_ids[]`,
`criticality`, `check_cadence`, `owner`, `active`.

### `source_revisions`

Append-only: `id`, `source_id`, `retrieved_at`, `published_at`, `effective_from`, `effective_to`,
`content_hash`, `raw_object_ref`, `normalised_text_ref`, `parser_version`, `http_metadata`,
`supersedes_revision_id`, `review_state`.

Do not overwrite an old page snapshot. `effective_*` describes legal/operational applicability;
`retrieved_at` describes when AutoTime learned it. Both timelines are necessary for honest replay.

### `source_diffs`

`id`, `from_revision_id`, `to_revision_id`, `structural_diff`, `semantic_summary`, `severity`,
`affected_rule_ids[]`, `triage_state`, `reviewer`, `resolved_at`, `resolution`.

Critical changes freeze affected outputs until reviewed. An LLM may summarise a diff but cannot assign
the final legal meaning or silently publish a new rule bundle.

### `route_rules`

Stable identity: `id`, `jurisdiction`, `route_id`, `rule_key`, `value_type`, `unit`, `subject`,
`operator`, `dependency_rule_ids[]`.

### `route_rule_versions`

Append-only: `id`, `route_rule_id`, `value_json`, `valid_from`, `valid_to`, `known_from`, `known_to`,
`source_revision_ids[]`, `compiler_version`, `review_state`, `expert_signoff_id`.

Use typed values: money with currency/period/inclusion rules; durations; enumerations; occupation
identifiers; evidence predicates; and conditional expressions. Never encode a threshold only in prose.

### `evidence_facts`

Append-only assertions: `id`, `subject_type`, `subject_id`, `predicate`, `value_json`, `source_type`,
`source_object_id`, `source_span_id`, `extraction_method`, `confidence_band`, `confirmed_by`,
`confirmed_at`, `valid_from`, `valid_to`, `supersedes_fact_id`, `conflict_set_id`, `sensitivity`.

### `source_spans`

`id`, `document_revision_id`, `page`, `section`, `start_offset`, `end_offset`, `quoted_hash`,
`locator_version`. Stable anchors must detect when a later document revision invalidates a span.

### `employer_entities` and `employer_assertions`

Separate canonical entities from time-bound assertions. Store legal name, identifiers, aliases and
relationships in entities; store sponsor/register status, source revision, match method, validity and
confidence in assertions. Only exact or manually approved matches may become `verified`.

### `decision_records`

Append-only: `id`, `candidate_snapshot_id`, `vacancy_snapshot_id`, `employer_assertion_ids[]`,
`route_bundle_id`, `evaluated_at`, `effective_at`, `engine_version`, `result`, `reasons_json`,
`missing_fact_keys[]`, `conflict_ids[]`, `assumptions[]`, `output_policy_id`, `supersedes_decision_id`.

Results: `pass`, `fail`, `conditional`, `unknown`, `review_required`. “Eligible” is not a universal
boolean and must not erase route, evidence or authority limitations.

### `claim_evidence_links`

`claim_id`, `fact_id`, `source_span_id`, `support_type`, `review_state`, `reviewer`, `created_at`.
Support types: `direct`, `derived`, `context_only`, `contradicts`. Export is blocked if a material claim
lacks direct/approved derived support.

### `corrections` and `expert_signoffs`

Corrections preserve target, original value, proposed value, reason taxonomy, actor, evidence,
resolution and downstream decisions requiring replay. Sign-offs preserve reviewer identity and basis,
jurisdiction/route/rule-bundle scope, limitations, signature time, expiry and supersession.

## Deterministic and probabilistic boundary

| Task                                  | Permitted mechanism          | Required safeguard                                                   |
| ------------------------------------- | ---------------------------- | -------------------------------------------------------------------- |
| Salary arithmetic and date boundaries | Deterministic code           | Unit, currency, pay period and effective-date tests                  |
| Route rule evaluation                 | Deterministic compiled rules | Bundle ID and complete trace                                         |
| Occupation mapping                    | Classifier/LLM may propose   | Confidence, alternatives, duties evidence and human review threshold |
| Document fact extraction              | Parser/LLM may propose       | Source span, schema validation and confirmation for decisive facts   |
| Source-diff summary                   | LLM assistance               | Human severity/legal-meaning approval                                |
| Application drafting                  | LLM                          | Claim-evidence enforcement and user approval                         |
| Final personalised recommendation     | Policy-controlled template   | Jurisdiction output authority and abstention                         |

Models never recall current legal values from weights. Retrieval without a stored revision is also
insufficient because it cannot support replay.

## Output policy

`output_policies` bind jurisdiction, route, user location, regulatory posture and reviewer state to
allowed verbs and UI components. Example levels:

- **Information:** “The published threshold for this route is…”
- **Mechanical comparison:** “The stated base salary is above the stored threshold, assuming…”
- **Bounded recommendation:** only where professional scope permits and the exact bundle is signed.
- **Mandatory escalation:** conflicts, unverified employer, ambiguous route, regulated profession,
  stale critical source or unresolved source diff.

Disclaimers do not upgrade permission. The backend must reject prohibited output forms.

## Source-change pipeline

1. Scheduler selects due sources by criticality/cadence.
2. Retriever records HTTP metadata and immutable raw content.
3. Normaliser produces stable text/structure and hash.
4. Diff engine classifies cosmetic, structural and semantic changes.
5. Dependency resolver lists affected routes/rules/decisions.
6. Critical unresolved changes set affected bundle to `frozen`.
7. Researcher proposes typed rule revisions with citations.
8. Second reviewer and, where required, expert approve.
9. Compiler creates a new immutable bundle.
10. Replay compares affected historical/golden cases and emits deltas.
11. Release policy promotes or rejects; users with material saved decisions receive an appropriate
    correction/update event.

## Replay contract

Replay modes:

- **Historical reproducibility:** old facts + old bundle must equal stored result exactly.
- **Policy delta:** old facts + new bundle isolates changes caused by policy.
- **Evidence delta:** new facts + old bundle isolates changes caused by evidence.
- **Current reassessment:** new facts + new bundle produces a new record; never mutates the old one.

Every delta identifies changed rules/facts, previous/new result, severity and user-visible explanation.

## Readiness computation

Do not implement a vanity percentage. A route can be promoted only when all mandatory gates are true:

```text
critical_sources_current
AND no_unresolved_critical_diff
AND primary_rule_chain_complete
AND golden_and_adversarial_cases_pass
AND deterministic_trace_complete
AND output_policy_approved
AND expert_signoff_current
AND incident_and_rollback_runbook_tested
```

Optional score components can rank research priority, but cannot override a failed mandatory gate.

## Security and privacy controls

- Data minimisation per decision; do not collect passport scans for early vacancy screening unless
  strictly needed.
- Separate sensitive documents from derived facts and apply tenant/user isolation.
- Encrypt in transit and at rest; rotate secrets; prohibit sensitive values in logs and analytics.
- Purpose/consent records for outcome learning; withdrawal stops future learning use.
- Retention classes for raw documents, derived facts, decisions, audit records and deleted accounts.
- Tested deletion cascades and documented lawful/audit exceptions.
- Recovery tests must prove both restoration and post-deletion non-resurrection.
- Threat-model prompt injection in vacancies/documents, malicious files, cross-tenant access, source
  poisoning, register impersonation, reviewer-account compromise and replay tampering.

## Migration sequence

1. Confirm live callers and current schemas; do not build on unreachable dashboard code.
2. Add source/revision and bundle identifiers with nullable dual-write.
3. Populate Germany/Netherlands source revisions and two canonical routes.
4. Shadow-evaluate stored decisions; compare without changing UI.
5. Backfill only where evidence can be reconstructed; label non-reconstructable history.
6. Enable replay and governance review.
7. Switch reads behind a release flag after error gates pass.
8. Remove/deprecate parallel dead implementations only after caller and data audits.

## Engineering acceptance gates

- Zero false-green outcomes in release corpus.
- Zero exported unsupported material claims.
- 100% historical replay equality for unchanged engine dependencies.
- 100% decisive reasons cite stored source revisions and evidence facts.
- No `verified` employer result from fuzzy matching alone.
- Critical source failure or unresolved diff produces fail-closed behaviour.
- Cross-tenant, deletion, retention and recovery tests pass in production-like infrastructure.
- Live route trace proves the capability is called; file existence and unit tests alone do not count.
