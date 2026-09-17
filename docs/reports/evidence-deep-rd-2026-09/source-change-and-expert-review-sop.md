# Source change, expert review and sign-off SOP

## Purpose

Turn mobility guidance into a governed evidence operation. This SOP does not confer legal approval; it defines the controls required to obtain, record and enforce that approval.

The companion [evidence integrity threat model](evidence-integrity-threat-model.md) defines protected invariants, abuse/failure cases, severity, response objectives and recovery drills. This SOP is the release procedure that enforces those controls.

## Roles and separation

- **Researcher:** captures the source, dates, jurisdiction, population and proposed atomic claims.
- **Rule engineer:** implements claims without altering their legal meaning.
- **Independent reviewer:** checks citation fidelity, conditions, exclusions, boundaries and test cases.
- **Qualified expert:** approves marketed mobility guidance for the jurisdiction and specifies permitted language.
- **Release owner:** activates or quarantines a version; cannot self-approve a legal interpretation they authored.

## Change-detection workflow

1. Fetch each critical source on its monitoring cadence and store retrieval time, URL, HTTP metadata, content hash and immutable snapshot reference.
2. Compare normalized content with the active snapshot. Ignore only documented presentation noise.
3. Classify changes: `none`, `cosmetic`, `potentially_material`, `material`, `source_unavailable`.
4. For `potentially_material`, `material`, or repeated unavailability, quarantine affected rule bundles from new definitive outputs.
5. Extract proposed claim changes with old/new text location, effective date and affected rule/test identifiers.
6. Obtain independent review; obtain qualified-expert sign-off where interpretation or marketed guidance changes.
7. Run boundary, regression, adversarial and replay tests. Record failures and disposition.
8. Activate the successor bundle atomically. Never mutate the predecessor.
9. Identify prior decisions within the affected effective/retrieval interval; replay and notify under the correction policy where impact is material.

## Capture and comparison rules

- Preserve raw bytes before extraction. Store raw and normalized hashes; never rely on normalized text alone.
- Record redirect chains, source language, parser/normalizer versions, publication date and effective interval independently.
- Ignore presentation noise only through reviewed, versioned normalization rules with fixtures. A one-off manual exclusion is not a control.
- Treat canonical legislation, administrative guidance, mutable amounts/lists and registers as distinct dependencies even when one portal links them.
- A source redirect or replacement domain requires publisher-identity verification. Search results and AI summaries are discovery aids, never controlling evidence.
- If official sources conflict, record both claims and the precedence rationale. Until resolved, affected outputs fail to the safest supported state.
- Publication does not imply commencement; commencement does not imply applicability to every filed/accepted/issued cohort.

## Cadence

| Source type | Default check | Event trigger |
|---|---:|---|
| Mutable sponsor/employer register | Daily | User requests verification |
| Published salary/occupation list | Weekly in announced update window; monthly otherwise | Budget, index or law announcement |
| Statute/regulation | Weekly feed/check | Enactment or commencement notice |
| Operational portal/process page | Weekly | Form/API failure or authority notice |
| Stable explanatory guidance | Monthly | Contradiction or user report |

Cadence is a maximum interval, not a freshness guarantee. Each decision stores the exact source versions it used.

## Required sign-off record

```text
signoff_id:
jurisdiction:
route:
rule_bundle_version:
claim_ids:
reviewer_name_and_role:
qualification_or_authority_basis:
scope_reviewed:
permitted_output_language:
prohibited_output_language:
conditions_and_exclusions:
effective_from:
expires_or_review_by:
evidence_snapshot_ids:
test_run_id_and_result:
decision: approved | approved_with_conditions | rejected | withdrawn
signed_at:
signature_or_verifiable_attestation:
```

## Approval gates

Approval fails closed if any critical claim lacks an authoritative source/effective date; a contradiction is unresolved; test coverage omits a legal boundary; reviewer independence is absent; the permitted output language is unspecified; or the sign-off has expired. “Reviewed” without scope and version is not approval.

Activation additionally requires a semantic old/new diff, enumerated affected rules, passed boundary and replay tests, a rollback/safe-state plan, and a second-person release decision. Emergency quarantine may be performed by one authorised operator; restoration still requires ordinary approval.

## Source unavailability and substitutions

One failed fetch does not prove legal change. Record the failure and retry through an approved schedule. Repeated failure, an unexplained redirect, certificate failure, blocked automation, or loss of the canonical publication moves the source to `unavailable` and may quarantine dependent output. An official archive or successor portal may substitute only after identity, completeness and temporal coverage are reviewed. An unofficial mirror can preserve a research lead but cannot silently inherit the canonical source's authority class.

## Incident and correction

On a credible disagreement, preserve the user report and affected decision, stop propagating the disputed claim if severity warrants, triage within the documented SLA, and link any correction to the original decision. Report correction rate, time-to-triage, time-to-safe-state, affected-decision count and replay completion. Never erase the historical reasoning chain.

Severity and proposed response objectives are defined in the threat model. Every P0/P1 incident requires an immutable timeline, affected-version inventory, containment decision, reviewer/legal disposition, replay reconciliation and closure approval. Measure actual performance separately from targets.

## Access, retention and drills

Apply least privilege and MFA to source, rule, sign-off and release administration. Preserve tamper-evident approval and activation events. Rotate and revoke signing credentials independently of application secrets. Keep immutable legal/source provenance separate from candidate personal payloads so correction history does not defeat lawful deletion or minimisation.

Exercise silent-source-change, parser-boundary, credential-compromise, replay-restart, deletion and rollback scenarios at least quarterly before broad market release. A written SOP is not production evidence; release readiness requires drill artefacts and observed operating history.
