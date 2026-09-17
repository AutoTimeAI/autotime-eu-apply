# Evidence integrity threat model

**Status:** Phase 2 design control; implementation and production proof pending  
**Scope:** Mobility sources, extracted claims, rule bundles, decisions, corrections and expert approvals

## Security objective

AutoTime must be able to prove which evidence and rules produced a recommendation, detect when that evidence may no longer be safe, prevent unreviewed changes from reaching definitive output, and recover without rewriting history. This is an integrity and availability problem as well as a conventional security problem.

## Protected invariants

1. A decision references immutable versions of candidate facts, vacancy facts, employer identity, source snapshots, claims and rules.
2. An active rule bundle cannot change in place.
3. Publication, retrieval, commencement, expiry and supersession dates remain distinct.
4. Every material interpretation has a scoped reviewer decision and permitted output language.
5. A changed, unavailable or contradictory critical source can force `review_required` or `unknown` without requiring a code release.
6. Corrections link to affected historical decisions; they do not erase them.
7. Immutable legal provenance contains no unnecessary candidate personal data.

## Threat and failure register

| Threat or failure | Consequence | Preventive control | Detection | Containment and recovery |
|---|---|---|---|---|
| Authority silently edits a page | Current output relies on superseded text | Scheduled snapshots and content-addressed storage | Normalized and raw hash change | Quarantine dependent claims; review; successor bundle; replay |
| Publication date is mistaken for commencement | Wrong rule applied to transition cohort | Separate temporal fields and interval validation | Boundary tests around both dates | Fail closed; correct interval; replay affected decisions |
| Consolidated law hides historical wording | Historical replay becomes false | Preserve point-in-time instrument and consolidation metadata | Snapshot comparison and replay audit | Restore cited historic snapshot; mark provenance gap |
| Translation or locale differs materially | Conditions are omitted or distorted | Canonical-language source plus translation metadata | Cross-language reviewer comparison | Prefer canonical text; return review state where meaning differs |
| Template/navigation change creates noise | Alert fatigue conceals real changes | Versioned normalization rules with fixture tests | Raw-v-normalized diff telemetry | Disable faulty normalizer and reprocess raw snapshots |
| Source disappears, redirects or blocks automation | Freshness cannot be proved | Multiple official locators and last-known snapshot | HTTP/TLS/redirect and cadence alerts | Mark unavailable; use approved official substitute or reduce output confidence |
| Search snippet or unofficial mirror is promoted | Weak evidence becomes controlling | Source-class policy and canonical-domain allowlist | Approval gate checks publisher/source class | Quarantine; replace with canonical source; preserve mirror only as lead |
| Two official sources conflict | False certainty | Explicit precedence and contradiction fields | Cross-source assertion tests and user reports | Show conflict; obtain expert resolution; never average or silently select |
| Parser extracts wrong value or unit | Boundary decision is wrong | Typed extraction, units, locale and dual review for critical amounts | Golden/boundary tests and visual source comparison | Disable affected claim; fix parser; replay |
| Compromised researcher or administrator | Fraudulent evidence or approval | Least privilege, MFA, separation of duties and signed events | Anomalous activation/sign-off audit | Revoke access/key; quarantine releases since compromise; independent re-review |
| Expert approval is stale or over-broad | Marketing exceeds reviewed scope | Expiry, jurisdiction/route/scope and permitted-language fields | Pre-release and runtime sign-off checks | Fail closed; renew or narrow output |
| Cache serves old bundle after activation | Users receive inconsistent decisions | Version-pinned decisions and atomic activation | Version mismatch telemetry | Purge cache; pin predecessor/successor explicitly; replay |
| Replay job is partial or duplicated | Impact population is unknown | Idempotent jobs, checkpoints and decision inventory | Reconciliation counts | Resume from checkpoint; publish coverage and residual count |
| Candidate PII is copied into immutable evidence | Deletion rights become difficult to execute | Separate evidence metadata from encrypted personal payloads | Schema and retention scans | Delete/crypto-shred personal payload; retain non-personal audit linkage where lawful |

## Evidence lifecycle

`discovered -> captured -> parsed -> independently reviewed -> expert approved -> active`

Exceptional states are `quarantined`, `stale`, `superseded`, `withdrawn` and `unavailable`. Only `active` versions may support definitive recommendations. `Superseded` versions remain available for historical replay. A replacement never overwrites its predecessor.

## Snapshot envelope

Each capture should store source ID and canonical locator; retrieval timestamp; HTTP status, redirect chain and relevant headers; publisher and jurisdiction; media type and language; raw-byte hash; normalized-content hash; immutable object reference; parser and normalizer versions; publication/effective/expiry dates when known; predecessor/successor links; and capture identity.

Hashing detects change but does not prove publisher authenticity. TLS validation, official-domain verification, signed government publications where available, access-controlled storage and tamper-evident audit events remain separate controls.

## Severity and response objectives

These are proposed operating targets, not evidence that the team currently meets them.

| Severity | Example | Safe-state target | Impact inventory target | Release authority |
|---|---|---:|---:|---|
| P0 | Known incorrect definitive recommendation or compromised evidence/approval path | Immediately on confirmation; automated where possible, operational target 15 minutes | 1 hour | Incident commander plus legal/product owner |
| P1 | Material source change, unresolved official conflict or wrong critical amount with possible exposure | 1 hour | 4 hours | Release owner plus independent reviewer |
| P2 | Non-critical explanation defect or repeated source unavailability with safe fallback | 1 business day | 2 business days | Release owner |
| P3 | Cosmetic/no-decision-impact change | Normal release cycle | Not required beyond traceability | Rule engineer/reviewer |

User or regulator notification timing must follow applicable law and the approved incident policy; this document does not invent a universal 24-hour rule.

## Release and rollback gates

A successor can activate only after source identity and dates are verified; semantic diff is classified; affected claims/rules are enumerated; independent review passes; qualified sign-off exists where required; boundary/regression/adversarial tests pass; replay impact is estimated; rollback is available; and one person cannot both author the interpretation and grant final approval.

Rollback selects a known version or moves outputs to a safe non-definitive state. It must never reactivate a version known to be legally wrong merely because it is operationally stable.

## Validation drills

Run and record at least quarterly before broad release:

- silent salary-threshold change with a future commencement date;
- canonical page unavailable while an unofficial mirror remains reachable;
- parser decimal/locale failure at an exact threshold;
- compromised reviewer credential and approval revocation;
- replay interruption and idempotent restart;
- candidate deletion request spanning evidence links and analytics;
- rollback where both predecessor and successor are unsafe.

Track source-check success, time from source change to detection, time to safe state, unreviewed activation attempts, stale-sign-off blocks, replay coverage, correction rate, false-alert burden and drill recovery results. Production claims about reliability require observed records, not this specification.

## Residual risks requiring external evidence

- jurisdiction experts must validate legal precedence, interpretation and marketed language;
- security specialists must assess key management, access controls and storage immutability;
- privacy counsel must approve the personal-data/immutable-audit boundary and retention basis;
- production exercises must establish actual detection, rollback, replay and recovery performance;
- target users must show that provenance and correction improve comprehension and trust.
