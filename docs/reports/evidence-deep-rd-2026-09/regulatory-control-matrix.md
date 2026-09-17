# Regulatory control matrix

**Audit date:** 11 September 2026  
**Status:** product-control analysis, not legal opinion.

| Product activity | Principal boundary | Required control now | External validation |
|---|---|---|---|
| Candidate enters nationality, education, salary and work history | GDPR/UK GDPR personal data; possible sensitive inference | Purpose map, lawful-basis record, minimisation, encryption, access/export/correction/deletion | DPIA and privacy counsel |
| Product recommends apply/skip to the same candidate | Profiling/automated decision analysis; consumer accuracy/claims | Explain inputs/logic/uncertainty, permit challenge, avoid coercive/default automation, log safe state | DPIA conclusion on significance and jurisdiction |
| Employer uses output to rank/filter candidates | EU AI Act Annex III recruitment/selection; employment discrimination and data law | Prohibited initial deployment boundary; contractual/use restriction; monitor misuse | AI Act classification/conformity counsel before any employer product |
| Product provides candidate-specific UK route conclusion | UK immigration-advice regulation | General information and factual sponsor verification only | Written IAA scope opinion and approved language |
| Product stores immutable decisions | GDPR accuracy, minimisation, erasure and storage limitation | Immutable event metadata with separable encrypted personal payload; correction lineage; deletion/anonymisation design | Retention schedule and deletion/recovery verification |
| Product reuses evidence across applications | Purpose compatibility, transparency and data accuracy | Candidate confirmation, versioning, expiry and provenance | DPIA and privacy notice review |
| Product shares a case with adviser/employer | Controller/processor roles, purpose and disclosure | Explicit scoped user action, recipient/audit log, least-data bundle, revocation where feasible | Contract/DPA and jurisdiction review |
| Product learns from corrections/outcomes | Purpose limitation, fairness, bias and research/statistical safeguards | Consent/lawful-basis separation, de-identification, missingness/bias audit | Privacy/statistical methodology review |

## AI Act intended-purpose boundary

The EU AI Act applies generally from 2 August 2026. Annex III explicitly includes AI intended for employer recruitment/selection, targeted job advertising, application filtering and candidate evaluation. AutoTime's candidate-controlled self-assessment is not automatically proven high-risk by that text. That is an inference requiring counsel, not a safe-harbour claim.

Product positioning, instructions, contracts, APIs and observed use all influence intended purpose and foreseeable misuse. Therefore the initial product must prohibit employer-side candidate ranking/filtering, avoid APIs designed for selection, and trigger classification review before any B2B recruitment feature. A mere “for candidates” label is insufficient if the actual workflow serves employers.

## Privacy architecture consequence

“Immutable decision” must not mean “undeletable personal data.” Store immutable event identifiers, rule/source versions and cryptographic integrity separately from candidate payloads. Candidate payloads should be erasable or irreversibly anonymisable according to the approved retention schedule while preserving non-identifying system accountability. Exact design requires counsel and destructive deletion/recovery tests.

## UK live-change control

The ICO says its automated-decision/profiling guidance is under review following the Data (Use and Access) Act, with final guidance expected in winter 2026. Treat this as a monitored legal-source dependency. Re-run the UK DPIA and update product language when final guidance publishes. Separately, the IAA boundary controls immigration advice; privacy compliance does not authorise regulated advice.

## Claims policy

Allowed before empirical validation: descriptions of mechanics that can be demonstrated, such as source-linked decisions, sponsor-register checks and saved evidence. Conditional wording must match readiness.

Not allowed without appropriate evidence: “guaranteed eligible,” “visa approved,” “legally compliant,” “more interviews,” “highest success rate,” or accuracy/outcome superiority. Competitor vendor outcome claims cannot be reused as category facts.
