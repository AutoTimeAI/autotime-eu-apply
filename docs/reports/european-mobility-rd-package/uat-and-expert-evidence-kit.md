# UAT and Expert Evidence Kit

**Status:** ready-to-run instruments; no participant or expert evidence has been collected

## Part A — founder-led discovery session

### Screening record

Record participant code, target role, target country, nationality/work-right category, active
application horizon, number of relevant applications in prior six months, recruitment channel,
relationship exclusion, consent version and incentive.

### Interview script (45 minutes)

1. Show the most recent real cross-border vacancy you considered.
2. Walk through what you did from seeing it to applying, skipping or pausing.
3. Which facts did you need? Which were unavailable or contradictory?
4. Show the pages, notes, messages or tools you used.
5. What mistake were you most concerned about? What actually happened?
6. When did employer sponsorship enter your decision?
7. What did you reuse in the next application?
8. Have you paid for job-search or immigration help? Show what triggered the purchase where
   comfortable.
9. Without pitching features: what would make this decision materially easier?

For the first half, do not mention AutoTime's proposed solution. Separate observed artifacts from
participant opinion and founder interpretation.

## Part B — comprehension/reliance test

### Conditions

Randomise presentation order among official links, a concise official checklist and AutoTime's
evidence-linked record. Use scenarios from `de-nl-adversarial-benchmark.csv`, including at least one
correct positive, hard negative, missing fact, conflict, stale rule and deliberately flawed output.

### Questions after every scenario

1. What action does the output recommend?
2. Which three facts matter most?
3. What is known, unknown or conflicting?
4. What does the output **not** establish?
5. What would you verify next, and where?
6. How confident are you, from 0–100, that your action is appropriate?
7. Choose now: apply, skip, investigate, ask an expert, or cannot decide.

Do not help until the answer is locked. Then ask the participant to identify the evidence location.

### Scoring

- `recommendation_correct` (0/1)
- `decisive_facts` (0–3)
- `uncertainty_correct` (0–2)
- `limit_correct` (0/1)
- `next_step_resolves_gap` (0/1)
- `critical_flaw_detected` (0/1 where applicable)
- action versus expert label
- time to answer
- confidence calibration gap

Predefined pass: at least 85% recommendation comprehension, 80% critical-flaw detection and no
critical case where a majority over-relies. Report participant- and case-level denominators.

## Part C — behavioural comparison

Use real but de-identified/frozen vacancies. Each participant evaluates matched cases across the
three conditions, with condition order counterbalanced. Preserve the first action before allowing
revision. Reviewers blind to condition label classify whether the action was appropriate.

Primary outcome: critical inappropriate apply/skip rate. Secondary outcomes: useful investigation,
missing-fact discovery, entity-verification precision, time and confidence calibration. “Changed
decision” is not improvement without the expert reference.

## Part D — expert rule-pack packet

Provide each reviewer:

- reviewer brief and requested jurisdiction/route scope;
- exact rule-bundle JSON/hash and human-readable rules;
- source-revision manifest and exact locators;
- output taxonomy and prohibited wording;
- 40-case corpus, internal labels and isolated blind holdout;
- known contradictions and abstention behaviour;
- source-change, replay, incident and correction process;
- questions requiring interpretation rather than extraction.

### Reviewer response fields

For every atomic rule: correct/incorrect/incomplete/out-of-scope, rationale, source, applicability,
exceptions, date semantics, required facts and output wording. For every case: expected predicate
trace, route outcome, permitted user statement, criticality and confidence.

### Sign-off record

```text
reviewer identity and organisation:
qualification/regulator/authority basis and verification URL:
jurisdiction and route:
rule-bundle ID/hash:
source-revision manifest hash:
benchmark and holdout hash:
permitted output scope:
excluded matters and limitations:
unresolved disagreements:
signed at:
valid until / review trigger:
signature mechanism:
conflict-of-interest declaration:
```

A consultation, invoice, email comment or review of a narrative document is not sign-off unless the
exact version, scope and limitations are bound in this record.

## Part E — disagreement and correction handling

Keep both initial labels. A third qualified reviewer or documented legal-source escalation resolves
critical disagreement. Never choose the more commercially convenient answer. Record correction type,
severity, affected rules/decisions, containment, reviewer, resolution and user-notification decision.

## Part F — analysis integrity

Before sessions, freeze hypotheses, exclusions, metrics, cases and stopping rules. Store raw responses,
timestamps, condition order, deviations and analysis queries. Direct identifiers and recordings stay
outside the research repository with access and retention controls. Publish adverse findings and
dropouts; do not replace failed participants until the exclusion rule permits it.
