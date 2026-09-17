# Regulatory, Advice and Data-Protection Boundaries

**Status:** issue-spotting research and counsel brief; not a legal opinion.

## Executive boundary

AutoTime's highest-value behaviour—applying official mobility rules to a person's facts—is also its
highest regulatory risk. Architecture must support different output permissions by jurisdiction and
product mode. A disclaimer cannot convert regulated advice into unregulated information or cure
unlawful personal-data processing.

## United Kingdom immigration advice

The Immigration Advice Authority regulates immigration advice and services and can prosecute illegal
provision or advertising. It describes its purpose as ensuring advice is provided only by suitably
qualified organisations and individuals.[^1] Its current practice note distinguishes information not
related to individual cases from assistance that applies immigration knowledge to personal
circumstances.[^2]

Until written counsel/IAA-compatible scope is obtained, UK output may reproduce and cite official
requirements, perform clearly described mechanical comparisons, identify missing inputs, verify exact
register matches, and direct users to official pages or regulated advisers. It must not prescribe a
route, declare an individual eligible, recommend fact presentation to secure status, prepare
representation, or imply regulated human review. These are conservative interim controls—not legal
conclusions that every permitted item is outside regulation.

### Counsel questions

1. Which planned outputs constitute immigration advice or services for UK-based and overseas users?
2. Does deterministic personalised comparison differ from an LLM-generated recommendation?
3. What changes if AutoTime charges, prepares documents, refers advisers or transmits an application?
4. Can a regulated partner review outputs, and what supervision, records and advertising are needed?
5. Which activities may unregulated product and support staff perform?

## EU AI Act

Annex III point 4 covers certain employment/recruitment uses. Point 7 covers migration, asylum and
border-control systems used by or on behalf of competent public authorities, including systems
assisting examination of visa/residence applications and evidence reliability.[^3] AutoTime is
currently candidate-side and not described as acting for a competent authority. That makes point 7
less obviously applicable, but does not justify declaring the product outside the Act.

Risk changes if AutoTime sells to employers/recruiters, ranks candidates for hiring, supplies public
authorities, automates application examination, or changes intended purpose. AI-literacy,
transparency, prohibited-practice and provider/deployer duties may apply even without Annex III
high-risk classification.

Counsel must classify each feature, intended purpose, actor and deployment—not “the platform” in the
abstract—and assess Annex III 4(a), 7(c), provider/deployer roles, territorial scope and dates.

## GDPR and UK GDPR

Mobility recommendations process identity, education, employment, nationality/location and sometimes
family or document data. GDPR applies independently of application submission. The EDPB endorses
guidance on profiling, automated decisions and DPIAs.[^4] ICO guidance states UK GDPR applies to
profiling and automated decisions generally, with additional rules for solely automated decisions
producing legal or similarly significant effects; the ICO notes that guidance is under review after
the Data (Use and Access) Act.[^5]

AutoTime advising a user is not automatically the same as an authority deciding status. Even where
Article 22 is not triggered, lawful basis, fairness, transparency, accuracy, minimisation, security,
retention and data-subject rights remain.

### DPIA questions

- What are the separate purposes and lawful bases for recommendations, account operation, analytics
  and model improvement?
- Which facts are necessary before offer versus after offer?
- Are nationality, family, disability/health or other sensitive inferences made?
- Does the system produce significant effects through reliance, exclusion or downstream sharing?
- Is human intervention meaningful, competent and timely?
- How do corrections propagate across decisions and generated documents?
- Which processors, regions and models receive raw documents or prompts?
- Can users access/export/delete data, and can backups reintroduce deleted records?
- How are consent and purpose restrictions enforced for outcome learning?

## Consumer and marketing claims

| Claim              | Minimum evidence before use                                                    |
| ------------------ | ------------------------------------------------------------------------------ |
| Current            | Critical-source checks meet an SLO and no unresolved critical diff exists      |
| Verified employer  | Exact authoritative register evidence or documented manual resolution          |
| Expert-reviewed    | Named qualified reviewer signed the exact bundle and scope is disclosed        |
| Eligible           | Permitted scope, complete supported facts, signed bundle and bounded wording   |
| Saves time         | Controlled baseline study with task definition and distribution                |
| Improves decisions | Expert-labelled comparative study with critical-error analysis                 |
| More interviews    | Credible outcome design addressing selection/confounding; currently prohibited |

## Employment and discrimination risk

Candidate-side recommendations can still narrow opportunities or encode biased assumptions. Do not
use nationality or proxies to infer talent, cultural fit or employer preference. Use sensitive data
only where legally necessary for a disclosed route rule and isolate it from generic fit scoring.
Measure error rates across relevant groups and investigate differential abstention or false negatives.

## Professional-review operating model

Review must be route-level, not a generic “lawyer approved” badge. Contracts should address
jurisdiction/competence, independence, confidentiality/privilege, liability, recordkeeping,
turnaround, change-trigger review, conflicts, use of the reviewer's name and whether advice is to
AutoTime or the end user.

## Regulatory change triggers

Reassess when AutoTime adds a route, changes information into recommendation, prepares/submits filing
materials, serves employers or authorities, ranks/rejects candidates, uses new sensitive data or
processors, changes learning/retention purposes, or receives a complaint, material disagreement or
harmful-reliance report.

## Evidence required before production

1. Feature-by-feature written regulatory scope memorandum.
2. Completed DPIA and data-flow/processor inventory.
3. Approved output-policy matrix enforced server-side.
4. Route-bundle expert sign-off and expiry.
5. User-facing limitations tested for comprehension.
6. Adviser partner due diligence and register verification.
7. Marketing-claim register with owner, study and expiry.
8. Incident, correction, notification and regulator-response playbooks.

## Sources

[^1]: Immigration Advice Authority, “[About us](https://www.gov.uk/government/organisations/immigration-advice-authority/about),” accessed 10 September 2026.

[^2]: Immigration Advice Authority, “[Immigration assistance: practice note](https://www.gov.uk/government/publications/immigration-assistance),” updated 20 August 2025.

[^3]: European Union, [Regulation (EU) 2024/1689 (Artificial Intelligence Act), consolidated text](https://eur-lex.europa.eu/eli/reg/2024/1689/2026-07-27/eng), Annex III points 4 and 7.

[^4]: European Data Protection Board, “[Automated decision-making and profiling](https://www.edpb.europa.eu/documents/guideline/automated-decision-making-and-profiling_en),” endorsed 25 May 2018.

[^5]: Information Commissioner's Office, “[Rights related to automated decision-making including profiling](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/rights-related-to-automated-decision-making-including-profiling/),” accessed 10 September 2026.
