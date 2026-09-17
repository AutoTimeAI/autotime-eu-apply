# Engineering Execution Blueprint

**Scope:** convert the R&D package into a governed Germany–Netherlands private-evaluation slice  
**Constraint:** preserve existing user changes; do not add a third decision implementation

## Repository finding

The repository already contains valuable foundations:

- `packages/shared/src/international/*` provides the newer international assessment contract and
  country packs.
- `packages/shared/src/eu-fit/decision-policy.ts` and `packages/shared/src/fit-model.ts` implement an
  older/general country-fit decision path.
- `packages/shared/src/evidence/model.ts` already distinguishes verified, declared, inferred,
  conflicting, stale, missing and unknown evidence, and resolves claim support.
- `apps/web/platform/application-preparation/decision-adapter.ts` connects a mobility decision to
  application preparation.
- Existing evaluation and integrity scripts cover decision consistency, mobility migration and
  evidence integrity.

The engineering strategy is **consolidate, extend and wire**. The first ticket must confirm current
reachability because prior audit evidence can become stale as the repository changes.

## Target architecture

```text
candidate/vacancy/employer inputs
  -> canonical evidence facts and source spans
  -> route candidate selector
  -> signed, effective-date rule bundle evaluator
  -> immutable route assessment and trace
  -> product decision policy
  -> claim/content gate
  -> user explanation, correction and outcome events
```

Legal-route assessment and product-priority decision remain separate objects. A route assessment may
indicate encoded criteria while the product says skip because the vacancy refuses sponsorship; the
inverse is also possible when a promising job needs legal verification.

## Epic 0 — live-path map and decision convergence

**Deliverable:** a committed architecture decision record identifying every caller and one canonical
contract.

Tasks:

- Trace dashboard, job workflow, API and extension callers with tests, not filename inference.
- Record input/output differences between `fit-model`, `eu-fit/decision-policy` and
  `international/assessment`.
- Select the international assessment as the route-evidence boundary unless runtime evidence
  disproves that choice.
- Adapt legacy consumers; deprecate but do not delete until call telemetry and tests prove zero use.
- Add a CI dependency check preventing new direct imports of the deprecated engine.

Acceptance: one scenario produces the same canonical route trace across every live surface; no third
engine or UI-local decision rule exists.

## Epic 1 — source revisions and claim graph

Tables/collections:

- `source_definitions`: publisher, jurisdiction, authority class, canonical URL, cadence, owner.
- `source_revisions`: retrieval time, published/effective dates, language, content hash, parser
  version, lawful snapshot pointer, status.
- `source_diffs`: old/new revision, structural diff, materiality, reviewer, affected claims.
- `claims`: atomic proposition, jurisdiction, route and interpretation status.
- `claim_source_links`: claim, revision, support/contradict/supersede relation and exact locator.

Invariants: source revisions are immutable; claims reference exact revisions; a changed URL never
mutates historical support; vendor sources cannot satisfy legal authority policy.

Acceptance: ingest two IND register revisions and a threshold revision; classify a material change;
identify every affected bundle; preserve prior replay.

## Epic 2 — route bundles and deterministic evaluator

Implement the contract in `de-nl-rule-pack-specification.md` as schemas plus a pure evaluator. Rules
must be data/configuration with constrained operators, not arbitrary executable code from an admin
panel.

Required controls:

- effective-date selection and explicit timezone/date semantics;
- signed status and expiry gate;
- fact-path validation and unit normalisation;
- three-valued predicates (`true`, `false`, `unknown`) plus conflict/stale propagation;
- deterministic canonical JSON hashing;
- explanation templates linked to rule and source claims;
- unknown operator/version causes failure closed.

Acceptance: all 40 specification cases parse; internally labelled deterministic cases execute; same
input/bundle produces the same trace hash; unsigned/expired bundles cannot serve positive outcomes.

## Epic 3 — immutable decisions and replay

Persist:

- input snapshot and evidence IDs;
- rule bundle, evaluator and policy versions;
- rule-level results and source-claim IDs;
- route outcome, product action and permitted wording;
- canonical hash, creation actor/time and superseding correction links.

Provide `as_decided` replay using the stored bundle and `as_current` comparison using the latest
eligible bundle. The delta must identify rule, parameter/source and explanation changes.

Acceptance: 100% historical equality in the release corpus; corrections append; database policy
rejects update/delete of decision substance outside documented retention deletion.

## Epic 4 — employer entity and sponsor assertions

Model organisation, legal entity, identifiers, aliases and relationships separately from dated
sponsor assertions. Import IND organisation/KVK pairs as a versioned assertion set.

Match tiers:

- `exact_identifier` — eligible for confirmed register display;
- `exact_normalised_legal_name` — review required until identifier confirmed;
- `candidate_alias`/`group_relationship` — never automatically verified;
- `ambiguous`/`no_match` — explicit unknown.

Acceptance: labelled benchmark includes subsidiaries, recruiters, rebrands, punctuation, duplicate
names and negative cases; no fuzzy match renders “verified”; register date is visible.

## Epic 5 — evidence provenance and claim gate

Extend the existing evidence model rather than duplicating it:

- add immutable evidence revisions and exact vacancy/document spans;
- distinguish subject, assertion, observation and verification;
- record extraction model/parser version and confidence;
- require user confirmation for inferred candidate facts;
- block stale/conflicting/orphaned support for material claims;
- cascade deletion through derived facts while retaining only legally justified audit material.

Acceptance: every generated material application claim has at least one usable supporting fact;
conflicts override supports; deletion/recovery tests cover candidate, vacancy, decision and derived
content.

## Epic 6 — corrections and expert sign-off

Correction categories: source extraction, rule interpretation, candidate fact, vacancy fact, entity
match, decision policy, explanation, regulatory scope and outcome label. Store reporter, evidence,
severity, resolution and affected-version query.

Sign-off binds reviewer identity/qualification record, jurisdiction, route, rule-bundle hash,
source-revision set, benchmark hash, permitted output wording, limitations, signature time and expiry.

Acceptance: a material correction can freeze affected bundles and find/replay affected decisions;
sign-off cannot transfer to a changed hash.

## Epic 7 — trust UX and output policy

Display separate blocks for:

- application priority;
- encoded route-criteria status;
- evidence used/missing/conflicting/stale;
- employer assertion and its narrow meaning;
- official sources with effective/review dates;
- what AutoTime cannot confirm;
- next verification action and correction link.

Server-side policy selects allowed phrases by market release state, route outcome, evidence status and
regulatory mode. UI components cannot strengthen language.

Acceptance: snapshot/accessibility tests cover every status; deliberately incomplete cases cannot be
made positive by client manipulation; comprehension study materials are event-instrumented.

## Epic 8 — commercial and research telemetry

Use pseudonymous IDs and versioned consent. Minimum events:

- assessment started/completed/abstained;
- evidence/reason/source expanded;
- correction submitted;
- user decision confirmed/changed;
- applied/skipped/escalated;
- checkout started/completed/refunded;
- repeat vacancy decision;
- expert/source/support minutes and variable cost.

Keep outcome reporting separate from model optimisation until purpose, consent and bias review permit
reuse. Do not send candidate documents, raw CV text or sensitive facts to analytics/Sentry.

Acceptance: event dictionary, lawful-purpose mapping, retention, deletion and reconciliation to
Stripe receipts all pass in a production-like environment.

## Epic 9 — operational gates

- source-fetch health and semantic-diff queue;
- stale/expired bundle circuit breaker;
- reviewer rota and escalation SLO;
- decision/error dashboards by route/version;
- signed deployment manifest;
- incident, rollback and correction notification playbooks;
- backup restoration and deletion-cascade drills.

Acceptance: a simulated threshold change freezes the affected positive path, creates review work,
publishes a signed replacement, replays affected decisions and records notification decisions.

## Migration sequence

1. Add append-only tables and policies without changing current responses.
2. Dual-write canonical snapshots behind an internal feature flag.
3. Shadow-evaluate DE/NL cases and compare with the existing engine.
4. Resolve divergence; do not average or silently choose results.
5. Expose research-only traces internally.
6. Complete expert, regulatory, UAT and operational gates.
7. Canary private-evaluation users; retain immediate rollback.
8. Retire legacy writes only after reconciliation and recovery proof.

## Pull-request evidence template

Each PR must state: invariant changed; live callers; migrations and rollback; source/rule versions;
tests added; privacy/security effect; output-language effect; failure-closed behaviour; and which
external gate remains. “Tests pass” without the relevant scenario IDs is insufficient.

## Definition of done

The vertical slice is technically complete when the two rule packs are replayable and signed, all
critical benchmark cases pass, employer matching is precision-gated, explanations are fully sourced,
corrections freeze/replay affected decisions, and production-like monitoring/recovery works. Public
release still requires founder-led user evidence, real commercial validation and regulatory approval.
