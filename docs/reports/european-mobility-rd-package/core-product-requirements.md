# Core Product Requirements

## Product thesis

AutoTime helps non-EU technology professionals decide which Germany/Netherlands vacancies deserve
their application effort by showing current route evidence, employer assertions, candidate evidence
gaps and uncertainty in a reproducible record.

## Primary user

An actively applying software, data, cloud, security or technical-product professional who requires
or is unsure about work authorisation and evaluates multiple vacancies before an employer starts an
immigration case.

Secondary users—experts, coaches and mobility professionals—review structured evidence. Employers are
not a first-release buyer because candidate ranking/screening changes the product and regulatory
analysis.

## Core user job

> When I find a European tech vacancy, help me decide whether to apply, investigate a specific fact or
> skip, without pretending uncertain employer or immigration facts are known, and let me reuse
> verified evidence safely in the application.

## End-to-end experience

1. Capture vacancy source and identify destination and employing entity.
2. Reuse candidate facts with freshness and provenance.
3. Select plausible named routes; never collapse them to a country score.
4. Evaluate only signed/effective rules; return unknown for missing/conflicting facts.
5. Show product action separately from route-criteria status.
6. Explain facts, sources, dates, employer assertion and limitations.
7. Ask the smallest question that could change the action.
8. Save an immutable decision; allow correction and old/current replay.
9. Gate generated claims/application content to supported evidence.
10. Capture action/outcome only with clear purpose and consent.

## Functional requirements

### Vacancy and entity

- Preserve original text, URL, observation time and exact extracted spans.
- Resolve brand to legal entity without upgrading fuzzy matches.
- Display IND recognition only with entity/KVK, register revision and narrow meaning.
- Preserve vacancy sponsorship language separately from legal sponsor status.

### Candidate evidence

- Separate declarations, verified documents and system inference.
- Record qualification, experience, salary and work-right facts with provenance/freshness.
- Require confirmation before inference supports a material conclusion or claim.
- Surface conflicts; never choose the most favourable fact automatically.

### Route assessment

- Compare named routes, effective dates and conditional bands.
- Support deterministic, human-review and out-of-scope criteria.
- Refuse positive output when bundle/sign-off/source is invalid.
- Preserve rule trace and source claims.

### Decision, replay and correction

- Show one product action plus a separate route-criteria status.
- Explain evidence used/missing, limitations and next action.
- Reproduce as-decided output; explain current-bundle deltas.
- Append corrections and contain/replay critical defects.

### Application claim gate

- Link every material generated claim to candidate evidence.
- Block unsupported, conflicting, stale or orphaned claims.
- Require approval for work-right/sponsorship answers before extension autofill.
- Preserve the final approved answer and evidence version.

## Non-functional requirements

| Area          | Requirement                                                                       |
| ------------- | --------------------------------------------------------------------------------- |
| Determinism   | Same canonical input/bundle/evaluator/policy yields same decision hash            |
| Availability  | Authority failure closes safely according to source policy                        |
| Traceability  | Every material claim resolves to exact evidence/source revision                   |
| Security      | Least privilege; no secrets/sensitive content in telemetry; audited admin actions |
| Privacy       | Purpose-based retention; export/deletion cascade; vendor mapping                  |
| Accessibility | Decision/evidence/uncertainty keyboard and assistive-technology usable            |
| Localisation  | Preserve source language; no unreviewed legal translation                         |
| Operations    | Freeze/replay/rollback and reviewer/source continuity per route                   |

SLO numbers must come from capacity and user evidence, not invention.

## Explicit non-goals

- Predicting visa approval, interviews, offers or immigration outcomes.
- Filing applications or representing candidates.
- Employer ranking or automated rejection.
- Every permit, profession or special circumstance.
- Pan-European support claims.
- Autonomous expert sign-off or LLM legal interpretation.
- Maximising applications, generated words or country count.

## Success metrics

Primary: expert-appropriate action rate for qualified decisions. Guardrails: critical false-positive
rate, flawed-output detection, over-reliance, employer-match precision, unsupported claims, replay,
source incident time and complaints/harm. Business: payment conversion, repeat decisions, second
payment and fully loaded contribution.

## Release modes

| Mode                | Audience                | Output                                                   |
| ------------------- | ----------------------- | -------------------------------------------------------- |
| Research            | Team/reviewers          | Unsigned rules, diagnostic trace, no customer conclusion |
| Private evaluation  | Consented users/experts | Bounded output with limitations and monitoring           |
| Expert-signed       | Defined route/scope     | Signed bundle language only                              |
| Production-observed | Defined route/version   | Signed plus operational evidence                         |

Country discovery must not imply the same release mode for every route.

## Product acceptance

Private evaluation requires canonical architecture, rule packs, evidence links, entity precision,
immutable replay, correction containment, output policy, evaluation corpus, privacy/security review
and a production-like incident drill. Public claims also require real user, payment, expert,
regulatory and production evidence.
