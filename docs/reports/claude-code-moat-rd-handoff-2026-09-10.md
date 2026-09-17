# AutoTime EU Apply: Claude Code Moat R&D Handoff

**Date:** 10 September 2026  
**Purpose:** commission an independent, repository-grounded R&D assessment from Claude Code and preserve both research deliverables for comparison and synthesis.  
**Product stage:** product-shaped MVP in controlled private beta.

## Founder research principle

> **Deepness provides clarity, and clarity makes me clever.**

Depth is a required quality standard for this assignment. The objective is not to produce a long
document for its own sake; it is to investigate deeply enough that the resulting clarity improves
founder judgment, company strategy, product design, technical architecture, risk management and
capital allocation.

Claude Code may take multiple hours when necessary. Do not shorten the investigation to meet an
arbitrary one- or two-hour window if important evidence, contradictions, repository paths, source
material, calculations or implementation consequences remain unresolved. Report uncertainty rather
than manufacturing completeness, but exhaust reasonable research routes before declaring a gap.

The final R&D package must provide the reliable deliverables needed to operate AutoTime as both:

1. a serious startup business capable of validating a market, earning revenue, managing risk and
   building defensibility; and
2. a production-grade IT product with explicit architecture, security, privacy, data, evaluation,
   operations, maintenance and release controls.

Research is complete only when its findings support concrete founder decisions. Document depth is
valuable when it exposes assumptions, dependencies, trade-offs, failure modes and evidence—not when
it repeats general advice.

## Instructions to Claude Code

Treat this document as a research brief, not as proof that its assumptions are correct. Inspect the
repository and foundation documents directly. Challenge findings when evidence supports a different
conclusion. Distinguish current implementation, proposed architecture, external facts, assumptions
and recommendations.

Do not implement production mobility conclusions or describe the product as providing legal advice.
Do not modify unrelated user work. Prefer official primary sources for jurisdictional facts and
record access/review dates. Clearly label anything that requires qualified legal or immigration
review.

## Governing foundation

Start with:

- `docs/AutoTime-EU-Apply-Core-Product-Investment-Strategy.pdf`
- `docs/product-core-investment-strategy.md`

The approved product pillars are:

1. **EU Fit:** determine whether a European role is genuinely worth pursuing.
2. **Evidence integrity:** ensure material claims are supported, reviewable and attributable.
3. **Application preparation:** produce truthful, vacancy-specific application materials for human
   review and user-controlled submission.

Supporting capabilities such as vacancy capture, profile management, tracking, billing,
observability and the browser extension are not independent value propositions.

## Existing Codex R&D deliverables

Review these, but perform an independent assessment:

1. `docs/reports/moat-rd-strategy-2026-09-10.md`
   - Competitive boundary and moat architecture.
   - Appropriate-reliance research.
   - Evaluation programme and scenario laboratory.
   - R&D portfolio, experiments and twelve-month sequence.

2. `docs/reports/startup-moat-rd-dossier-2026-09-10.md`
   - Founder-level company and beachhead thesis.
   - Fifteen-to-twenty-market expansion framework.
   - Country-corridor and regulatory analysis.
   - Technical architecture and repository gap map.
   - Source operations, proprietary data flywheel and R&D experiments.
   - Commercial model, unit economics, distribution and moat falsification.
   - Founder-led research protocol and 30/60/90-day plan.

These are Codex deliverables. Claude Code should create a separately named report rather than
overwriting either file.

## Current strategic conclusion to test

AutoTime's strongest potential position is:

> A governed cross-border application decision and evidence system for technology professionals,
> not another general AI resume, autofill or job-tracking suite.

The hypothesised compounding loop is:

```text
candidate evidence
  -> governed role decision
  -> supported application claims
  -> human approval and submission
  -> correction and outcome learning
```

The proposed moat is the combination of governed sources, reproducible decisions, evidence
provenance, claim integrity, expert review and longitudinal learning. It is not an LLM, prompt,
score, static country database or browser extension by itself.

## Ten-capability current-state summary

The repository contains useful foundations, but none of these capabilities is complete to a
production-grade moat standard.

|   # | Capability                          | Current assessment               | What appears to exist                                                 | Principal gap                                                                                                |
| --: | ----------------------------------- | -------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
|   1 | Versioned mobility sources          | Missing                          | Official-source links and manual review indicators                    | No governed source, immutable revision, validity, licence, review or expiry model                            |
|   2 | Source-change detection             | Missing                          | Some scheduled ingestion infrastructure for job sources               | No official-rule hashing, semantic diff, impact mapping or safe downgrade workflow                           |
|   3 | Immutable decision records          | Partial                          | Job analysis history and decision-related domain helpers              | No snapshot binding exact candidate facts, vacancy facts, policy bundle and source revisions                 |
|   4 | Employer and sponsor verification   | Missing as a governed capability | Vacancy/company fields and basic sponsorship signals                  | No official-register ingestion, legal-entity resolution, verification state or revision history              |
|   5 | Candidate evidence provenance       | Partial                          | Evidence records, profile/CV inputs and evidence-ledger UI            | Mostly copied text and coarse statuses; no stable fact identity, source span, conflict or supersession chain |
|   6 | Claim-to-evidence links             | Missing                          | Application generation and unsupported-claim checks in workflow state | No persistent material-claim manifest or support edges tied to artifact positions                            |
|   7 | Decision replay                     | Missing                          | Tests for some decision logic and core-loop continuity                | Historical decisions cannot be reproduced from their original facts, policy and sources                      |
|   8 | Correction and disagreement capture | Partial                          | Profile editing and some override-like workflow behavior              | No structured correction taxonomy, decision disagreement record, before/after impact or learning pipeline    |
|   9 | Country readiness scores            | Missing                          | Capability-readiness concepts and country-fit behavior                | No calculated readiness from freshness, scenario coverage, reviewer agreement and incidents                  |
|  10 | Expert sign-off records             | Missing                          | Manual-review language and governance documentation                   | No reviewer credential/scope, scenario/rule approval, limitations, expiry or supersession record             |

Estimated status:

- Approximately **15-25% of the technical foundations** are present.
- Likely **under 10% of the complete governed moat system** is present.

These percentages are directional judgments, not code-coverage measurements. Claude Code should
validate or replace them with a more defensible method.

## Relevant repository foundations

Inspect at minimum:

- `apps/web/domains/eu-fit/decision-brief.ts`
- `apps/web/domains/eu-fit/types.ts`
- `apps/web/domains/evidence/evidence-records.ts`
- `apps/web/domains/core-loop/traceability.ts`
- `apps/web/domains/application-preparation/prepare-application-kit.ts`
- `apps/web/lib/capability-readiness.ts`
- `apps/web/lib/job-application-workflow.ts`
- `apps/web/lib/supabase/types.ts`
- `packages/shared/src/schemas.ts`
- `supabase/migrations/20260729120000_mobility_profiles_entry_gate.sql`
- `supabase/migrations/20260801191000_workflow_operational_events.sql`
- `supabase/migrations/20260812170000_work_authorisation_guidance.sql`
- `docs/reference/core-foundation-execution.md`
- `docs/reference/product-readiness-policy.md`
- `docs/reference/testing/outcome-quality-test-matrix.md`
- `docs/reports/acceptance-gate-audit-2026-09-10.md`

Search for additional implementations rather than assuming this list is exhaustive.

## Important risks and constraints

1. The product is broader than its validated demand. Career discovery, outreach and interview
   tooling may dilute the differentiated core.
2. Personalized mobility conclusions can approach regulated immigration-advice boundaries.
   Jurisdiction-specific counsel and qualified review remain necessary.
3. The EU AI Act treats certain employer-side recruitment systems as high-risk. AutoTime is
   candidate-side today; any employer ranking or screening expansion requires new analysis.
4. Candidate CV, nationality/work-right, employment and outcome information creates substantial
   privacy, security and governance obligations.
5. Rule values must not be recalled by an LLM or embedded only in prompts/UI copy.
6. A high skills score must never average away a hard eligibility blocker.
7. Source detection must not automatically publish legal/policy changes.
8. Employer brand names must not be treated as verified employing legal entities.
9. “More interviews” and similar outcome claims remain unearned.
10. UAT, willingness to pay, real production integrations and expert sign-off remain external
    validation blockers.

## Proposed dependency order to evaluate

### Phase 1: truth and temporal history

1. Versioned mobility sources.
2. Source-change detection.
3. Immutable decision records.
4. Decision replay.

### Phase 2: evidence and application integrity

5. Candidate evidence provenance.
6. Claim-to-evidence links.
7. Employer and sponsor verification.

### Phase 3: learning and governance

8. Correction and disagreement capture.
9. Country readiness scores.
10. Expert sign-off records.

Expert-sign-off data structures may need to be designed in Phase 1 even if the reviewer interface is
built later.

## Recommended first vertical slice to challenge

Evaluate whether the smallest architecture-proving slice should be:

> One Netherlands Highly Skilled Migrant scenario, one versioned official source, one employer
> verification, one candidate evidence set, one immutable decision, one replay test and one expert
> sign-off record.

The Netherlands is proposed because recognised-sponsor information and salary criteria are
comparatively structured. This does not constitute permission to provide personalized immigration
advice and should be challenged against regulatory, commercial and technical evidence.

## Claude Code R&D assignment

Produce an independent report at:

`docs/reports/claude-code-independent-moat-rd-2026-09-10.md`

The report should include:

1. **Executive verdict:** whether the ten capabilities form a credible moat and which assumptions
   are weakest.
2. **Repository audit:** file-level evidence for present, partial, missing or misleadingly named
   functionality.
3. **Architecture critique:** validate or replace the proposed evidence, source, policy, decision,
   claim, correction and sign-off model.
4. **Dependency analysis:** identify the minimum safe implementation sequence and circular
   dependencies.
5. **European research strategy:** recommend 15-20 priority markets and distinguish governed,
   information-only and unsupported coverage.
6. **Regulatory risk:** identify advice, AI, privacy and data-reuse questions requiring specialists;
   do not issue legal conclusions.
7. **Source-operations plan:** authoritative sources, licensing, update cadence, change detection,
   entity resolution, review and incident handling.
8. **Evaluation plan:** scenario ontology, critical error taxonomy, locked/blinded tests,
   appropriate reliance, expert agreement and release thresholds.
9. **Commercial challenge:** beachhead, pricing hypotheses, fully loaded corridor economics,
   distribution and willingness-to-pay experiments.
10. **Moat falsification:** specify evidence that would cause the company to narrow, reprice, pivot
    or abandon the thesis.
11. **Engineering backlog:** epics, dependencies, acceptance gates, migration approach and rough
    effort ranges; separate engineering-controlled work from external sign-off.
12. **Comparison section:** explicitly state where Claude agrees, disagrees or finds insufficient
    evidence in the Codex reports.
13. **Sources:** cite current primary official sources close to supported claims and distinguish
    source facts from inference.

### Required startup-business deliverables

The independent report must cover, at minimum:

- category definition, differentiated promise and defensible wedge;
- target customer, beachhead corridors and jobs-to-be-done;
- market-sizing method with assumptions, ranges and source limitations;
- competitor and substitute analysis, including public/self-service alternatives;
- willingness-to-pay, packaging and real-checkout experiments;
- acquisition channels, partnerships and distribution hypotheses;
- corridor-level unit economics, support burden and source-governance cost;
- business model, pricing sensitivities and plausible margin structure;
- key company risks, leading indicators and mitigations;
- regulatory operating model and required professional relationships;
- data/IP defensibility, source licensing and trade-secret boundaries;
- hiring/partner requirements and accountable decision rights;
- milestone-based funding allocation and explicit stop/pivot criteria;
- 30-, 60-, 90-day and 12- to 24-month execution horizons;
- investor-grade claims that are supported, unsupported or prohibited;
- evidence required before AutoTime can credibly be called a startup-level platform or moat.

### Required IT-product deliverables

The independent report must cover, at minimum:

- verified current-state architecture and capability inventory;
- target domain model and bounded-context responsibilities;
- source, revision, policy, evidence, decision, claim, correction, outcome and sign-off schemas;
- temporal/versioning strategy and immutable audit requirements;
- deterministic-versus-LLM responsibility boundaries;
- APIs, events, identifiers and cross-surface consistency contracts;
- source ingestion, validation, change detection and impact propagation;
- employer/legal-entity resolution and sponsor-verification states;
- decision replay, policy comparison, correction and recourse workflows;
- privacy classification, lawful-purpose separation, retention, export and deletion behavior;
- authorization, RLS, encryption, secrets and privileged-operation boundaries;
- threat model covering prompt injection, poisoned sources, forged evidence and insider error;
- evaluation corpus, mutation tests, locked tests, human studies and expert agreement;
- observability, incident response, rollback, recovery and operational service levels;
- data-quality, source-freshness and country-readiness calculations;
- migration sequence from current JSON/document-heavy persistence;
- build/buy/partner choices, cost drivers and vendor portability;
- engineering epics with dependencies, acceptance criteria and effort ranges;
- launch gates separating code completion from legal, expert, user and production verification.

### Required deliverable quality

For every major recommendation, include:

1. the decision or problem it addresses;
2. repository and/or external evidence;
3. assumptions and confidence;
4. credible alternatives considered;
5. benefits, costs and failure modes;
6. dependencies and accountable owner;
7. measurable acceptance or falsification criteria;
8. what should happen now, later or not at all.

Where a dependable conclusion cannot be reached, produce a structured research gap containing the
missing evidence, safest interim product behavior, person qualified to resolve it, estimated effort
and decision deadline. An unresolved gap must not disappear into generic caveats.

## Required evidence standard

- Use official government/EU/regulator sources for current mobility and legal facts.
- Use official product pages for competitor capabilities and prices.
- Use primary research papers for decision-science claims.
- Record the research date.
- Do not describe marketing statements as independently proven outcomes.
- Label all estimates and assumptions.
- Do not call a country production-ready from desk research alone.
- Do not infer customer demand from feature completeness.
- Preserve negative findings and contradictions.

## Questions Claude must answer

1. Are any of the ten capabilities more complete than Codex assessed?
2. Which capability is unnecessary or premature?
3. Is bitemporal policy warranted now, or can a simpler append-only revision model meet the first
   two-country requirement?
4. Should expert sign-off attach to sources, rules, scenarios, releases, or all four?
5. Can a candidate-side product provide useful personalization without crossing regulated-advice
   boundaries?
6. Is Germany/Netherlands the best beachhead, or does repository/product context support another
   corridor?
7. What is the minimum dataset that can improve decisions without accumulating excessive personal
   information?
8. What baseline should AutoTime beat: official checklist, expert concierge review, competitor
   workflow, or a combination?
9. Which critical errors must block release regardless of aggregate accuracy?
10. What observed evidence would make this a venture-scale company rather than a useful tool?

## Deliverable comparison rubric

Score both Codex and Claude Code reports from 0-5 on:

| Dimension                                      | Weight |
| ---------------------------------------------- | -----: |
| Repository evidence and current-state accuracy |    20% |
| Primary-source quality and currency            |    15% |
| Product and market insight                     |    15% |
| Technical architecture and migration realism   |    15% |
| Regulatory and privacy risk discipline         |    10% |
| Evaluation and falsifiability                  |    10% |
| Commercial and unit-economic rigor             |    10% |
| Actionability and prioritization               |     5% |

Do not select one report simply because it is longer. Prefer claims that are supported, testable and
linked to a concrete decision.

## Expected synthesis after Claude completes

Retain all three documents:

1. Codex moat R&D strategy.
2. Codex startup moat R&D dossier.
3. Claude Code independent moat R&D report.

Then create a fourth synthesis document that:

- reconciles repository findings;
- records agreements and disagreements;
- chooses or rejects each of the ten capabilities;
- freezes the first-country vertical slice;
- defines the first migration and evaluation gates;
- separates engineering commitments from founder, legal, expert and user-validation actions.

The synthesis—not either individual research report—should become the proposed execution decision.

## Completion standard

Do not declare the assignment complete merely because every heading has text. Before completion,
confirm that:

- all material conclusions are traceable to evidence or explicitly labelled assumptions;
- current repository claims cite inspected files or tests;
- time-sensitive external claims use current sources and review dates;
- disagreements and contradictory sources are preserved and resolved where possible;
- legal and professional conclusions are routed to qualified reviewers;
- business recommendations include behavioral or payment validation;
- technical proposals include migration, security, privacy, testing and operational consequences;
- proposed metrics have denominators, observation windows and exclusions;
- risks include leading indicators, owners and response actions;
- roadmap items have dependencies, gates and stop conditions;
- the report says what AutoTime should deliberately refuse to build or claim;
- a founder can use the document to make specific investment decisions without guessing what the
  author meant.

If these conditions require more research time, take that time. Reliability, clarity and decision
usefulness take precedence over speed.
