# Expert Review Operating Model

## Purpose

Use qualified professionals to validate exact route rules, difficult cases and permitted outputs
without turning “expert-backed” into an unverifiable marketing label or making every routine decision
economically dependent on ad hoc consultation.

## Reviewer qualification

For each jurisdiction and service scope, record:

- identity and employing/regulated organisation;
- profession, regulator/register and current authorisation status;
- jurisdiction, route and work-level competence;
- languages and ability to review controlling legal text;
- professional indemnity/contract position where applicable;
- conflicts, competitor/employer relationships and data access;
- verification source, reviewer and date;
- expiry and change-trigger re-verification.

Being experienced in relocation, HR or another country is not automatically sufficient. Counsel must
approve the qualification standard and whether the delivery arrangement itself is authorised.

## Separation of duties

- Researcher drafts sources/rules.
- Independent internal reviewer checks extraction and contradictions.
- Jurisdiction expert reviews law/application and cases.
- Release owner verifies hashes, scope, tests and expiry.
- No person authors and solely approves a critical production bundle.

Early-stage individuals may hold multiple roles, but the same-rule independent approval must remain.

## Review products

| Product             | Scope                                                             | Completion evidence                       |
| ------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| Source-chain review | Authority, effective date, supersession and omitted instruments   | Claim-level review record                 |
| Atomic-rule review  | Predicate, applicability, exceptions, facts and wording           | Exact bundle/hash annotations             |
| Case labelling      | Rule trace, outcome, permitted output and severity                | Signed corpus/holdout labels              |
| Release sign-off    | Exact bundle, sources, corpus, output scope and limits            | Hash-bound signed record                  |
| Change review       | Material diff, effective date, affected decisions and replacement | New version/sign-off or freeze            |
| User escalation     | Particular case within authorised service scope                   | Case record separate from bundle sign-off |

Do not confuse a rule-pack sign-off with advice to an individual or vice versa.

## Agreement and adjudication

For the first release, two independent reviewers should label critical holdout cases where feasible.
Report raw agreement and disagreement by rule/severity. Preserve initial labels. A third qualified
reviewer or primary-source/legal escalation adjudicates critical disagreement; unresolved cases force
abstention or scope exclusion.

Consensus obtained after showing AutoTime's preferred answer is not blind agreement evidence.

## Service and quality measures

- median and upper-quartile review minutes by case/rule/change;
- critical/minor correction count and type;
- first-pass completeness of AutoTime packet;
- inter-reviewer agreement;
- turnaround and missed SLO;
- percentage of changes requiring new sign-off;
- cost per released route and per delivered reviewed decision;
- expert escalation rate;
- incidents attributable to rule interpretation.

The compounding thesis requires review time or correction burden to fall on comparable cases without
raising critical error. Lower spend caused by reviewing fewer hard cases is not improvement.

## Commercial/contract controls

Define deliverable, jurisdiction, service/advice scope, response time, rate/fee, ownership/licence of
structured labels, confidentiality, privacy/security, conflicts, reliance/limitations, insurance,
record retention, incident cooperation, termination and ongoing duty to report authority changes.
Counsel must draft/review the actual agreement.

Avoid exclusivity before reviewer quality and demand are proven. Build redundancy so one expert's
absence or commercial conflict cannot leave a marketed route unsigned.

## Capacity model

```text
required reviewer hours/month
= planned new-rule review
+ expected source changes × review minutes/change
+ production cases × escalation rate × minutes/escalation
+ incidents/rechecks
+ quality calibration/adjudication
```

Price and expansion decisions must use actual upper-quartile time and loaded cost, not the fastest
reviewer demonstration.

## Stop conditions

Pause a route when authorisation cannot be verified, sign-off expires, qualified redundancy is absent,
critical disagreement remains, change SLO cannot be met, expert cost destroys contribution, or the
reviewer will not bind approval to exact sources/rules/cases/output language.
