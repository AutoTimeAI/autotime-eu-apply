# Regulatory and Privacy Boundaries

## Executive boundary

AutoTime's highest-value output—applying mobility rules to a particular candidate and recommending action—is also its highest regulatory-risk output. Disclaimers do not neutralise product behaviour. Jurisdiction, audience, personalised facts, verbs, reliance and access to expert review must control what the system can say.

This document identifies product controls and legal questions. It is not a legal opinion.

## UK immigration advice

The UK Immigration Advice Authority defines immigration advice as advice given to an individual about relevant immigration matters where the adviser knows it relates to that individual. It regulates people providing immigration advice to the public, subject to other regulated professionals and exemptions.[^1][^2]

AutoTime's candidate-specific combination of nationality, job, sponsor, salary and route followed by “you qualify,” “you should apply,” or “choose this route” is therefore a material risk. A disclaimer saying “not legal advice” is unlikely to change the functional character of the interaction.

Until a written scoped opinion or authorised delivery arrangement exists, UK output should be limited to:

- exact official facts and source links;
- sponsor-register identity/status with timestamp and match quality;
- generic route requirements not applied to the individual;
- candidate-controlled checklists phrased as information to verify;
- referral to an appropriately regulated adviser.

Disable personalised route selection, definitive eligibility, prescriptive next steps and document/application assistance that falls inside the regulated boundary.

## EU/EEA national advice boundaries

There is no assumption that one EU-wide answer covers professional immigration-advice regulation. Before R3 for each market, counsel should answer:

1. What activities constitute reserved or regulated immigration/legal advice?
2. Does automated candidate-specific assessment fall within scope?
3. Does charging, marketing language or application assistance change the analysis?
4. What exemptions, registrations, insurance or local establishment requirements apply?
5. Can a regulated partner review or deliver the output, and under what supervision?
6. What records and complaints processes are required?
7. Which languages and consumer disclosures are mandatory?

Each answer becomes an effective-dated `OutputPolicy`, reviewed with the associated country pack.

## GDPR roles and lawful basis

Likely personal data includes identity/contact information, nationality, immigration/work-authorisation context, education, employment history, compensation, family facts, documents and inferred eligibility. Some evidence may reveal special-category data indirectly.

The DPIA must map purpose and lawful basis separately for:

- account and core service;
- document extraction and evidence storage;
- mobility assessment;
- product analytics;
- correction/outcome learning;
- model improvement/training;
- expert/partner disclosure;
- marketing and referrals.

Contract necessity for delivering a requested assessment does not automatically cover optional analytics, model training or partner marketing. Consent must not be bundled where it is the basis, and withdrawal must be operationally effective.

## Profiling and automated decisions

EDPB-endorsed guidance addresses automated individual decision-making and profiling, including transparency and safeguards under GDPR Article 22 where decisions are solely automated and have legal or similarly significant effects.[^3] AutoTime should not assert that Article 22 definitely applies or definitely does not without analysing the real workflow and effects.

Controls required regardless of the final classification:

- meaningful explanation of decisive facts/rules and consequences;
- accessible correction and contest routes;
- human review for uncertainty, conflict and consequential cases;
- prohibition on silent use of inferred sensitive attributes;
- logging of model/rule versions and human interventions;
- testing for systematic error across relevant groups;
- no automated submission or rejection of opportunities without explicit user control.

## EU AI Act scope

Annex III includes AI systems intended for recruitment or selection when used to place ads, analyse/filter applications or evaluate candidates.[^4] AutoTime is candidate-side and does not necessarily make employer recruitment decisions, so high-risk classification cannot be assumed from employment subject matter alone. The assessment must consider intended purpose, actual deployment, customers and integrations.

Risk increases materially if AutoTime sells scoring/filtering to employers or recruiters. Maintain a prohibited-expansion gate: no employer candidate ranking, filtering or automated selection without a fresh AI Act role/classification and conformity assessment.

Even if not high-risk, transparency, consumer-protection, data-protection and general AI governance duties may remain. Store intended-purpose statements and evaluate material feature changes.

## Consumer and marketing claims

Claims should be evidence-tiered:

| Claim                                 | Current status             | Required evidence                                               |
| ------------------------------------- | -------------------------- | --------------------------------------------------------------- |
| “Uses current official sources”       | Not yet earned system-wide | Source completeness, freshness SLO and incident history         |
| “Verifies sponsors”                   | Potentially narrow         | Exact authority register, entity-match precision and timestamps |
| “Helps avoid unsuitable applications” | Hypothesis                 | Pre/post behaviour plus expert appropriateness review           |
| “Improves application quality”        | Hypothesis                 | Defined rubric, blinded review and supported-claim metrics      |
| “Gets more interviews”                | Prohibited/unearned        | Robust comparison design and outcome completeness               |
| “Covers 20 countries”                 | Misleading today           | R3 country packs; otherwise say research coverage only          |

## Retention and deletion

Define classes rather than one retention period:

- raw CV/document artifacts;
- extracted evidence/facts;
- immutable decision records;
- correction/expert records;
- analytics events;
- payment/compliance records;
- backups and disaster-recovery copies.

Immutability does not mean indefinite personal-data retention. A deleted user may require decision records to be erased or irreversibly de-identified while non-personal rule/source history remains. The design must document cascade behaviour, backup expiry, legal holds and restoration without resurrecting deleted data.

## Partner and expert data sharing

Before sharing candidate evidence with an adviser or mobility provider:

- show recipient, purpose, jurisdiction and data categories;
- obtain the appropriate instruction/consent;
- minimise the packet to the scoped question;
- establish controller/processor or independent-controller roles;
- govern international transfers;
- log access, response and deletion/return obligations;
- preserve the expert answer and limitations as a signed record.

## Required external opinions

1. UK IAA scope memorandum based on actual screens and output examples.
2. Per-market advice/reserved-activity memo before R3.
3. GDPR DPIA and lawful-basis/retention review.
4. EU AI Act classification based on candidate-side intended purpose and any employer roadmap.
5. Consumer-claims review for trust, outcome and coverage statements.
6. Expert-network operating terms, professional credentials and liability allocation.

## Phase 2 update

The operational mapping is in [`regulatory-control-matrix.md`](regulatory-control-matrix.md). Two current changes matter:

- the EU AI Act applies generally from 2 August 2026 and Annex III expressly covers employer recruitment/selection systems; candidate-side intended purpose is a counsel-dependent inference, not an exemption;
- ICO UK automated-decision guidance is under revision after the Data (Use and Access) Act, so UK privacy analysis has a monitored winter-2026 dependency.

The architecture must also reconcile immutable audit history with erasure and storage limitation by separating integrity-preserving event metadata from erasable or anonymisable personal payloads.

## Sources

[^1]: Immigration Advice Authority, “[IAA adviser registration explained](https://www.gov.uk/government/publications/iaa-adviser-registration-explained/iaa-adviser-registration-explained),” updated 12 August 2026.

[^2]: Immigration Advice Authority, “[Immigration assistance: practice note](https://www.gov.uk/government/publications/immigration-assistance),” updated 20 August 2025.

[^3]: European Data Protection Board, “[Automated decision-making and profiling](https://www.edpb.europa.eu/documents/guideline/automated-decision-making-and-profiling_en),” endorsed 25 May 2018.

[^4]: European Union, “[Regulation (EU) 2024/1689—Artificial Intelligence Act](https://eur-lex.europa.eu/eli/reg/2024/1689/oj),” Annex III and Article 6.
