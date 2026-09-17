# Decision Evaluation and Release Protocol

## Safety objective

Optimise for useful selective decisioning, not maximum coverage. The most serious error is a
confident positive conclusion when a deterministic route requirement fails or material evidence is
unknown. Abstention is expected; reducing it is valuable only when critical errors do not increase.

## Evaluation units

- **Predicate:** one atomic rule result with evidence/source links.
- **Route assessment:** all predicate results for one versioned route.
- **Product action:** apply, investigate, skip or insufficient evidence after vacancy/employer policy.
- **Explanation:** claims and limitations shown to the user.
- **Case:** frozen inputs, evidence, bundle and expected outputs.

Report every level. A correct action can conceal a wrong route reason and is not fully correct.

## Corpus partitions

| Partition            | Purpose                                      | Access                             |
| -------------------- | -------------------------------------------- | ---------------------------------- |
| Development          | Build rules and fix defects                  | Engineers/researchers              |
| Regression           | Preserve fixed behaviours                    | CI and reviewers                   |
| Blind expert holdout | Estimate unseen-boundary performance         | Custodian; hidden from development |
| Production shadow    | Detect real-distribution/extraction failures | Restricted operations              |
| Incident corpus      | Preserve serious failures/corrections        | Mandatory regression inclusion     |

Never expose a holdout case to development without replacing it and versioning the benchmark.

## Case sampling

Easy positives must not dominate. Per route, target at least 20% boundary/date cases, 20% missing or
conflicting evidence, 15% occupation/qualification ambiguity, 15% compensation cases, 15%
employer/entity cases, 10% route-confusion cases and 5% source-change/replay cases. Stratify by
outcome. Label synthetic versus de-identified expert-case origin.

## Metrics

```text
critical false-positive rate
= cases returning criteria_indicated when expert label is
  criteria_not_indicated, verification_required or route_not_evaluated
  / all expert-labelled non-positive cases
```

Report confidence interval and numerator/denominator. The release-corpus target is zero observed
critical false positives; that does not imply true risk is zero.

Report coverage, accuracy among answered cases, risk–coverage curve and reason accuracy. Compare
versions at matched coverage. Also report:

- material explanation claims with valid supporting links;
- conflict/stale/orphan detection recall;
- source-authority and effective-date correctness;
- immutable replay equality and current-delta completeness;
- confirmed employer-match precision by match tier;
- model calibration and separate human comprehension/reliance.

Confirmed employer-match precision is primary; recall is secondary because false “verified” is worse
than unknown.

## Severity

| Severity | Definition                                        | Example                                      | Response                    |
| -------- | ------------------------------------------------- | -------------------------------------------- | --------------------------- |
| Critical | Materially unsafe/false positive action           | Wrong threshold pass; false verified sponsor | Freeze, incident and replay |
| High     | Material uncertainty/route distinction omitted    | HSM/Blue Card conflation                     | Fix before release          |
| Medium   | Correct action, incomplete non-decisive rationale | Missing source locator                       | Scheduled correction        |
| Low      | Presentation issue without decision effect        | Date formatting                              | Normal backlog              |

## Release gates

For the exact bundle/build:

- zero observed critical failures across development, regression and blind holdout;
- 100% deterministic as-decided replay;
- 100% material claims linked to usable evidence;
- unsigned, expired or critical-stale bundles cannot return positive route outcomes;
- no fuzzy employer match can render verified;
- all high errors resolved or removed from scope;
- expert sign-off binds bundle and corpus hashes;
- output-policy snapshots contain no prohibited wording; and
- production-like source-change/rollback drill passes.

## Change acceptance

A source/rule, evaluator, extraction model, entity matcher, explanation template or output-policy
change creates a new evaluation candidate. Run affected regression plus the full critical corpus.
Compare case-level deltas; aggregate improvement cannot excuse a new critical regression. Preserve the
former release for rollback.

## Production monitoring

Monitor abstention, corrections, source age, ambiguous entities, unsupported claims, route/version use
and escalation. Interviews are not automatic correctness labels. Any reported mobility/employer harm
triggers human triage and an affected-decision query.

## Release report

Publish build/bundle/source/corpus hashes; corpus composition; metrics and denominators; all
critical/high errors; exclusions; reviewer disagreement; changes; known limitations; sign-offs; and
rollback ID. A dashboard screenshot is not a release report.
