# Source Operations and Incident Runbook

## Objective

Keep every served route conclusion bound to known source revisions and stop unsafe output quickly when
authority changes or becomes uncertain.

## Source lifecycle

```text
discover -> qualify authority -> capture revision -> extract claims
-> reconcile contradiction -> review -> bind to bundle
-> monitor -> detect diff -> classify -> replace/freeze/ignore
-> replay affected decisions -> notify/correct where required
```

## Intake

Capture publisher/competence, jurisdiction, route, canonical URL, language, retrieval/publication and
effective dates, class, content hash, lawful snapshot, exact locator, supported claims, supersession,
cadence, owner and gaps. Search results/snippets/vendor summaries cannot become rule evidence. A
page's update date does not prove every embedded value is current.

## Change detection

1. Fetch within publisher/terms constraints; store status, headers and hash.
2. Normalise navigation/template noise separately from substantive content.
3. Produce structural/semantic diff and affected-claim candidates.
4. Classify: non-material, editorial, parameter, rule, process/scope, unavailable or indeterminate.
5. A human confirms effective date, supersession and affected rules.
6. Critical uncertainty freezes positive outcomes for affected facts.
7. A replacement bundle passes evaluation and sign-off before promotion.

An LLM may detect/summarise candidate changes; it must not declare legal materiality or publish a
production bundle autonomously.

## Proposed service levels

| Event                                       | Initial response |                                        Containment |                              Resolution |
| ------------------------------------------- | ---------------: | -------------------------------------------------: | --------------------------------------: |
| Confirmed critical parameter/rule change    | 4 business hours |                                  Same business day | Signed replacement or unavailable route |
| Suspected contradiction affecting positives |   1 business day |                                     1 business day |      3 business days or extended freeze |
| Scheduled sponsor-register revision         | At scheduled run |                          1 business day on failure |                         2 business days |
| Source unavailable                          |  Automated alert | Dated evidence only if policy allows; else abstain |                         2 business days |
| Editorial change                            |  2 business days |                                               None |                       Next bundle cycle |

Staffing must validate these SLOs before they become promises.

## Incident triggers

- wrong threshold/effective date;
- superseded source without freeze;
- positive decision backed by stale, missing or vendor-only authority;
- false sponsor/entity verification;
- sign-off applied to another bundle;
- replay mismatch;
- parser silently drops an exception; or
- user/expert reports material harm or incorrect course of action.

## Incident procedure

1. Assign incident ID, severity, commander and timestamps.
2. Freeze the exact route/version/output class.
3. Preserve source, input, decision, logs and deployment evidence.
4. Query all affected decisions/users through lineage.
5. Independently reproduce and classify.
6. Correct with a new source/rule/correction record; never edit history.
7. Run critical corpus, replay and required sign-off.
8. Decide notification, refund, legal/expert escalation and reporting duties.
9. Publish internal findings and prevention controls.

Notification states what was affected, when, what changed, what not to rely on, the safe next action
and complaint/correction route. Avoid replacing one overconfident answer with another.

## Resilience

Each production route needs primary/backup source owners and qualified reviewers, monitoring schedule,
coverage plan and maximum tolerated unsigned interval. Expansion stops when continuity cannot meet the
SLO economically.

## Monthly review

Report freshness, failed fetches, material diffs, triage time, frozen-route time, replays,
corrections, false employer matches, reviewer availability, incident cost and users notified—by
route, not platform average.
