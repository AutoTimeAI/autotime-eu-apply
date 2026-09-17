# Production Regulatory Control Matrix

**Status:** product-control specification; counsel and DPO review required  
**As-of date:** 10 September 2026

## Operating position

AutoTime should behave as though its recommendations can materially influence employment and
mobility decisions even where a particular high-risk classification is not established. The control
system should meet a higher trust standard before the legal classification question is finally
answered.

This document identifies controls and questions; it does not provide legal advice.

## Output taxonomy

| Output class                          | Example                                    | Default authority                             | Product rule                                      |
| ------------------------------------- | ------------------------------------------ | --------------------------------------------- | ------------------------------------------------- |
| General information                   | “The published 2026 threshold is…”         | Research-only allowed with current source     | No personal conclusion                            |
| Evidence observation                  | “The vacancy states no sponsorship”        | Allowed if exact source span shown            | Preserve wording/date                             |
| Mechanical comparison                 | “EUR X is below published parameter Y”     | Private evaluation after verified rule bundle | State assumptions and route                       |
| Personalised course-of-action opinion | “You should use route X/apply this way”    | Restricted pending jurisdiction opinion       | Route to authorised expert where required         |
| Application preparation/service       | Forms, representations, submissions        | Restricted                                    | Only under documented authorised arrangement      |
| Employer recruitment decision         | Ranking/filtering candidates for employers | Out of current scope                          | Separate AI/employment assessment before offering |

Disclaimers do not convert personalised advice into general information. Classification follows the
substance, inputs, output and user reliance.

## Control matrix

| Risk domain                    | Trigger to assess                                                                        | Required pre-release control                                                                    | Evidence owner     | Release consequence if open                      |
| ------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------ |
| Immigration-advice regulation  | Individual facts linked to route/course of action                                        | Written opinion per operating/target jurisdiction; authorised partner model if needed           | Counsel/founder    | Information-only output                          |
| UK IAA                         | UK business provides individual immigration advice/services in course of business        | Written scope opinion or IAA/approved-regulator structure and register verification             | UK counsel         | UK information-only                              |
| EU AI Act system scope         | AI system placed/used in EU under AutoTime name                                          | System inventory, provider/deployer role, intended-purpose and Article 50 assessment            | Product counsel    | No unlabeled interactive AI                      |
| EU AI Act high-risk            | Employment/recruitment use or competent-authority migration use; material feature change | Feature-by-feature Annex III classification and future-date plan                                | EU AI counsel      | Disable unapproved employer/public-authority use |
| Automated decisions/profiling  | Significant legal/similar effect or systematic extensive profiling                       | DPIA, meaningful human control, contestability and Article 22 analysis                          | DPO/counsel        | Private research only                            |
| Special-category/inferred data | Nationality, health, ethnicity/religion inference or document collection                 | Data minimisation, Article 9 basis where applicable, no unnecessary inference                   | DPO                | Do not collect/process                           |
| Fairness/discrimination        | Destination/occupation recommendations differ across protected/proxy groups              | Bias/error evaluation, protected-feature exclusion, counterfactual testing and human escalation | Product/risk       | No consequential automation                      |
| Consumer claims                | “Verified,” “eligible,” “better decisions,” “more interviews,” “Europe coverage”         | Claim-evidence register, substantiation owner, expiry and channel audit                         | Founder/marketing  | Prohibited wording                               |
| Data residency/transfers       | Vendors/subprocessors receive user or document data                                      | Transfer map, DPA/SCC/adequacy assessment and regional configuration                            | DPO/security       | Vendor blocked                                   |
| Retention/deletion             | Candidate facts, documents, decisions, recordings, analytics                             | Purpose-level schedule, deletion cascade and restoration/deletion conflict design               | DPO/engineering    | No production storage                            |
| Security                       | Identity documents, work rights and employment history                                   | Threat model, least privilege, encryption, audit, incident/DSAR playbooks                       | Security           | No sensitive-document launch                     |
| Expert relationship            | Reviewer signs rules or advises users                                                    | Qualification/authority verification, conflicts, scope, insurance and renewal                   | Operations/counsel | No expert-signed status                          |

## Current AI Act timing and design implication

The European Commission states that the AI Act became generally applicable and Article 50
transparency requirements began applying on 2 August 2026; it also reports that Annex III high-risk
rules apply from 2 December 2027 following the 2026 AI Omnibus changes.[^1][^2] AutoTime should not
use the later high-risk date as permission to defer architecture. Traceability, dataset governance,
human oversight, accuracy, robustness and post-market evidence are substantially cheaper to design
before launch than retrofit.

Annex III categories require exact intended-purpose analysis. A candidate-side tool is not
automatically an employer recruitment system, and the migration/asylum category in the original Act
contains competent-public-authority qualifiers for relevant uses. Any employer-facing ranking,
screening or public-authority offering is a material scope change and requires reassessment.

## UK immigration-advice boundary

The IAA practice note distinguishes general published information from an opinion on a course of
action based on an individual's circumstances; unregulated provision of regulated advice/services
can be a criminal offence.[^3] Therefore:

- Keep UK outputs at general information, evidence observation and official-source navigation until
  counsel approves a precise boundary.
- Do not rely on “not legal advice” copy to authorise personalised route recommendations.
- If using an adviser, verify the organisation/person and permitted level on the official register,
  bind the reviewer identity to each reviewed output and design complaints/escalation.
- Reassess the UK nexus based on business location, delivery model and user location; do not assume
  destination alone determines scope.

## DPIA decision

Complete a DPIA before private beta. The ICO identifies systematic and extensive profiling with
legal or similarly significant effects as an automatic DPIA category and recommends a DPIA when in
doubt about likely high risk.[^4] AutoTime's combination of career facts, mobility position,
recommendations and behavioural/outcome tracking warrants a documented assessment even if the final
Article 35 trigger analysis concludes a narrower use is not automatically covered.

The DPIA evidence pack must include:

- purposes, user journey, system/data-flow and provider inventory;
- necessity/proportionality and less-invasive alternatives;
- data categories, sources, inferred facts, recipients, locations and retention;
- foreseeable harms: lost opportunity, unlawful work assumptions, discrimination, disclosure,
  manipulation/over-reliance and stale rules;
- likelihood/severity before and after controls;
- user research, error evaluation, human review, correction and appeal;
- residual-risk approval and regulator consultation decision where required;
- review triggers for new countries, routes, employer buyers, models and data reuse.

## Production evidence room

Maintain signed/versioned records for system inventory, intended purpose, model/vendor cards, DPIA,
legal opinions, AI-literacy training, risk register, evaluation corpus/results, source/bundle lineage,
expert authority, incidents/corrections, security tests, DSAR/deletion/recovery drills, marketing
claims and release approvals.

## Mandatory counsel questions

1. At what point does a personal mechanical comparison become regulated immigration advice in each
   first-wave jurisdiction and under the UK operating nexus?
2. Can AutoTime provide the product directly under an authorised expert's supervision, and what
   entity/process requirements apply?
3. Is AutoTime provider or deployer for each AI component and user workflow?
4. Does any current intended purpose fall within Annex III, and what feature change would cross the
   boundary?
5. What Article 50 notices/marking apply to interactive guidance and generated application text?
6. What GDPR/UK GDPR bases, Article 9 conditions and Article 22 safeguards apply to each purpose?
7. What records must be retained for legal defence versus erased after a user request, and for how
   long?
8. Which marketing formulations are adequately substantiated before and after UAT?

## Sources

[^1]: European Commission, [AI Act regulatory framework](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai), updated 3 August 2026.

[^2]: European Commission, [Enforcement framework of the AI Act](https://digital-strategy.ec.europa.eu/en/policies/enforcement-ai-act), updated 24 August 2026.

[^3]: Immigration Advice Authority, [Immigration Assistance practice note](https://assets.publishing.service.gov.uk/media/68a5a2378e2cb87576994d1e/IAA_Immigration_Assistance_practice_note_August_2025.pdf), August 2025; and [About the IAA](https://www.gov.uk/government/organisations/immigration-advice-authority/about), accessed 10 September 2026.

[^4]: Information Commissioner's Office, [When do we need to do a DPIA?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/when-do-we-need-to-do-a-dpia/), accessed 10 September 2026.
