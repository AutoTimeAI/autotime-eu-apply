# EU Apply CTO assessment

**Date:** 9 September 2026  
**Stage:** Private Beta v1  
**Scope:** Technology strategy, architecture, security, reliability, delivery, cost, compliance readiness, engineering organization, and launch governance.

**Verification status:** Rechecked against repository HEAD `1dbbc341` on 9 September 2026. The full `pnpm test:unit` suite passed, including extension, workflow, synchronization, production-hardening, environment-boundary, Sentry-privacy, AI-quality, and 95% automated-coverage gates. No fresh production UAT, penetration test, disaster-recovery exercise, or independent legal/security assessment was performed for this review.

## CTO verdict

EU Apply is technically credible for a controlled founder-led beta. It is not yet ready for an unrestricted public launch.

The system has unusually strong beta foundations for its stage: explicit trust boundaries, user-scoped storage, server-side AI, rate limiting, atomic credit accounting, a typed platform-coverage registry, privacy-aware observability, broad automated tests, and a documented release process. The core journey has been browser-tested. This is not a security certification and does not replace the outstanding live and independent verification gates.

The primary technology risk is now **operational complexity growing faster than validated usage**. The product depends on a web application, browser extension, Supabase, OpenAI, Stripe, Sentry, job feeds, ATS markup, official mobility sources, and multiple synchronization paths. Large orchestrator components and changing external sources increase the cost and blast radius of every feature.

My CTO decision would be:

> **Authorize controlled beta growth. Freeze major feature expansion. Require reliability, observability, data-governance, architecture decomposition, and real-user outcome evidence before public launch.**

## CTO responsibility assessment

### 1. Technology strategy

**Decision:** Build the platform around one differentiating capability: evidence-backed cross-border job decisions. Treat discovery, autofill, tracking, outreach, and interview preparation as supporting services.

The engineering roadmap currently reflects a broad career platform. That creates strategic risk because several surrounding capabilities are commodity features with mature competitors. Technical investment should concentrate on the parts that improve the defensibility of the decision layer:

- evidence provenance and correction;
- mobility-source governance and freshness;
- explainable blocker decisions;
- job-to-candidate normalization;
- continuity from decision to application outcome.

**CTO concern:** Architecture should follow the product wedge. A system organized around many screens and workflows will keep expanding horizontally. A system organized around `Candidate Evidence`, `Role`, `Mobility Assessment`, `Decision`, `Application Kit`, and `Outcome` can remain coherent.

### 2. Architecture and maintainability

**Current position:** Next.js web application, Chrome extension, shared TypeScript contracts, Supabase persistence/RLS, Python analytics, server-side AI, Stripe billing, and Sentry observability.

**Strengths**

- Shared schemas reduce web/extension contract drift.
- Server-side model access protects provider credentials and centralizes policy.
- Supabase RLS provides a strong per-user isolation baseline.
- The platform registry is typed and serves as a single source for compatibility claims.
- The explicit reserve/confirm/release credit lifecycle is a sound financial-control pattern.

**Material risks**

- `DashboardExperience.tsx` is approximately 10,666 lines. This is a critical maintainability hotspot, not ordinary cleanup.
- The extension side-panel entry remains approximately 1,512 lines and still owns orchestration, state, and persistence responsibilities.
- Local-first extension behavior plus optional account sync creates reconciliation and recovery complexity.
- Product logic can become duplicated across UI components, API routes, shared packages, database functions, and extension code.
- Historical documentation and current behavior have drifted, weakening architectural decision-making.

**Required action**

Define domain boundaries and enforce them:

1. `evidence` — candidate facts, provenance, confirmation, correction;
2. `roles` — normalized vacancy and source identity;
3. `mobility` — work-right inputs, sources, rules, assessment;
4. `decisions` — fit, blockers, confidence, next action;
5. `applications` — kit, review, submission state, tracking;
6. `interviews` — practice and outcome;
7. `platform` — auth, billing, telemetry, flags, jobs and integrations.

Extract state machines/use cases from large components before redesigning their presentation. Add architecture decision records for synchronization ownership, AI policy, job-source exceptions, and mobility-source lifecycle.

### 3. Security, privacy, and trust

**Current position:** Strong for beta, incomplete for scale.

Positive controls include RLS, background-only authenticated extension requests, session-scoped tokens, input validation, user-content protections, CSV formula neutralization, privacy redaction, explicit review, no auto-submit, and no LinkedIn/contact scraping.

The CTO must ensure that these product promises are enforced as invariants rather than conventions.

**Non-negotiable controls**

- Automated tests proving cross-user isolation for every user-owned table and storage path.
- A complete data inventory: field, purpose, legal basis, processor, region, retention, deletion behavior, and export behavior.
- Verified account deletion across database, storage, telemetry, derived AI artifacts, and queued work.
- Secret rotation and least-privilege review for Supabase, Stripe, OpenAI, Sentry, email, CI, and Vercel.
- Content and prompt-injection defenses at every job/CV/user-text boundary.
- Dependency, SAST, secret, and infrastructure scanning as blocking CI gates where signal quality permits.
- Incident classification, containment, notification, recovery, and evidence-retention procedures.
- A formal review before any voice, video, biometric-like inference, automated contact acquisition, or unattended submission work.

**Launch rule:** Marketing must not claim GDPR compliance based only on design language. The operational data map, retention behavior, deletion evidence, processor agreements, privacy notice, cookie/analytics behavior, and regulatory obligations must all agree.

### 4. Reliability and operations

The application has many external failure domains. “The build passes” is insufficient because a user can still receive stale mobility guidance, a broken job feed, incomplete extraction, a failed extension link, an exhausted AI allowance, or an unconfirmed payment.

Define service-level indicators before broadening beta. The values below are proposed starting objectives, not measured current performance or approved contractual SLOs. Before adoption, each needs a precise numerator, denominator, observation window, exclusions, data source, minimum sample size, and alert threshold:

| Area | Required indicator | Initial objective |
| --- | --- | ---: |
| Web journey | Successful core workflow sessions | ≥99% excluding valid user-input rejection |
| API | Availability for authenticated core APIs | ≥99.5% monthly during beta |
| AI | Successful, schema-valid completion after allowed retry | ≥98% |
| Billing | Correct reserve/confirm/release settlement | 100%; zero unexplained credit loss |
| Extension | Capture success on verified supported samples | ≥95% by supported platform |
| Autofill | Correct reviewed fill on verified fields | ≥98%; zero automatic submission |
| Job feeds | Listings within source freshness policy | ≥95% by active provider |
| Mobility | Decisions with visible source/date or explicit unknown | 100% |
| Data isolation | Confirmed cross-user exposure | Zero |
| Recovery | Restore drill against documented RPO/RTO | Passed before public launch |

Create operational dashboards for user-impacting failure rates, not only exceptions. Every alert should identify severity, user impact, owner, runbook, and escalation path.

### 5. Data and AI governance

AI is used in a consequential employment workflow. The system appropriately avoids claiming that it predicts hiring, but governance must cover more than disclaimers.

**Required AI controls**

- Version every prompt, schema, policy and model used for a user-visible decision.
- Store safe decision metadata sufficient to reproduce why a result was produced without unnecessarily retaining sensitive raw content.
- Distinguish extracted facts, user-confirmed facts, inference, official source evidence, and generated advice in both data and UI.
- Evaluate hallucination, unsupported claims, blocker misses, country/source errors, prompt injection and demographic proxy risks.
- Maintain golden evaluation sets by target country, work-right scenario, role family and evidence quality.
- Require human confirmation before an inferred fact becomes reusable evidence.
- Provide a correction and appeal path for every material recommendation.
- Define model/provider change gates, rollback triggers, and cost/quality comparison criteria.

**CTO position:** A numeric fit score should not be the primary artifact until calibration is demonstrated. The primary artifact should be a categorical decision, blockers, evidence, uncertainty, and action.

### 6. External integrations and job-source governance

The 38-platform registry is useful engineering discipline, but it also shows the limits of the ecosystem: only 10 entries have verified capture, 9 verified autofill, and 10 verified native feeds; many boards are partial, redirect elsewhere, require accounts, or block inspection.

**Policy**

- Never equate recognition with capture, capture with autofill, or autofill with submission.
- Each provider requires an owner, allowed-use basis, interface type, verification date, fixtures, live sample, rate limit, failure behavior, and removal plan.
- Undocumented endpoints require a recorded risk acceptance and an immediate disable mechanism.
- Stale or failing sources should degrade visibly and never silently power confident recommendations.
- Platform expansion is paused until current high-usage integrations have real completion/correction telemetry.

### 7. Delivery and quality engineering

The repository demonstrates substantial testing discipline. The current challenge is changing from feature-verification to production-risk verification.

**Required release pyramid**

1. Fast unit and policy tests on every change.
2. Contract tests for APIs, shared schemas, RLS and billing transitions.
3. Integration tests for persistence, sync, provider failure and retries.
4. Browser journeys for the highest-value user paths.
5. Live, read-only platform checks with dated evidence.
6. Manual exploratory and accessibility testing for every release candidate.
7. Post-deployment smoke and rollback verification.

Prioritize failure paths: interrupted onboarding, stale sessions, extension/web version mismatch, duplicate jobs, partial sync, AI timeout after credit reservation, Stripe webhook replay, account deletion, inaccessible CV parsing, ATS form mutations, and stale legal sources.

**Release governance:** Use feature flags for risky capabilities, progressive exposure for beta cohorts, migration compatibility windows, and documented rollback criteria. A green CI run is necessary but does not alone authorize release.

### 8. Cost and commercial sustainability

GBP 9/month and GBP 19/quarter are attractive prices, but pricing cannot be judged without contribution margin and support burden.

The CTO should report per active user and per completed application workflow:

- model input/output cost and retry cost;
- database, storage, egress and observability cost;
- email and billing fees;
- feed/source maintenance cost;
- founder/support minutes;
- free-to-paid conversion and credit-pack behavior;
- gross margin by plan and heavy-user percentile.

Set budget alerts, per-feature cost ceilings, concurrency/rate controls, provider timeout limits, and graceful degradation. Preserve atomic credits, but present user allowances as understandable outcomes where possible.

### 9. Team and engineering organization

Even if the founder is currently the team, ownership must be explicit.

| Area | Accountable role | Operating responsibility |
| --- | --- | --- |
| Product/market outcome | Founder/Product | Customer selection, UAT, value and pricing evidence |
| Architecture/platform | CTO/Tech lead | Boundaries, reliability, security, cost and technical roadmap |
| Mobility domain | Named domain owner/adviser | Source policy, jurisdiction coverage, review and escalation |
| Data/AI quality | AI owner | Evaluations, prompt/model versions, rollback and cost |
| Extension/integrations | Integration owner | Browser releases, ATS compatibility and source governance |
| Security/privacy | CTO plus independent reviewer | Risk register, incident response, DPIA/data map and verification |
| Release quality | Release owner | Evidence pack, go/no-go decision and rollback readiness |

Introduce lightweight engineering rituals: weekly risk review, fortnightly architecture/debt review, release checklist, incident review, and monthly cost/reliability review. Do not create heavyweight process before team size warrants it.

## CTO risk register

| Risk | Likelihood | Impact | Response | Launch effect |
| --- | --- | --- | --- | --- |
| Users do not trust or act on fit decisions | High | Critical | Founder-led UAT, correction capture, decision-quality evaluation | Blocks public launch |
| Cross-border guidance becomes stale/wrong | Medium | Critical | Source registry, freshness SLO, explicit unknown state, domain review | Blocks affected jurisdiction |
| Large components slow safe delivery | High | High | Domain extraction and characterization tests | Limits feature velocity |
| Extension/ATS regressions | High | High | Per-platform telemetry, fixtures, live checks, rapid disable | Disable affected capability |
| Data isolation/deletion defect | Low–medium | Critical | RLS tests, deletion verification, incident plan | Blocks launch/requires incident response |
| AI unsupported claims or missed blockers | Medium | Critical | Golden evals, provenance, confirmation, rollback | Blocks affected model/prompt |
| Sync conflicts or data loss | Medium | High | Ownership rules, idempotency, conflict tests, export/restore | Blocks cloud-sync promotion |
| Unit economics fail at current price | Medium | High | Cost attribution, caps, pricing experiments | Blocks unrestricted growth |
| Third-party interface/terms change | High | Medium–high | Source governance, flags, fallback/manual path | Degrade or remove integration |
| Scope expansion prevents core validation | High | High | Feature freeze and outcome-based roadmap | CTO rejects new feature work |

## 30/60/90-day technical plan

### First 30 days — control and evidence

- Freeze new product categories and platform-count expansion.
- Complete 3–5 founder-led UAT sessions and capture technical/product failures.
- Define production SLIs, alert ownership and severity levels.
- Complete data inventory, retention/deletion map and processor/secret review.
- Add end-to-end verification for AI credit rollback, account deletion and top ATS flows.
- Produce a decomposition plan for the dashboard and extension orchestrators.
- Establish per-feature AI cost reporting.

### Days 31–60 — reduce blast radius

- Extract the first domain use cases/state machines from `DashboardExperience.tsx` without a visual rewrite.
- Separate extension state/persistence orchestration behind tested interfaces.
- Version AI prompts/models and establish country/scenario golden evaluations.
- Add source freshness dashboards and automatic safe degradation.
- Exercise backup restore, rollback and incident-response procedures.
- Implement progressive beta flags and version compatibility rules.

### Days 61–90 — earn the launch decision

- Expand beta only if activation, trust and workflow reliability meet defined thresholds.
- Resolve the highest correction and abandonment causes.
- Complete live billing, email, observability, extension-store and compliance evidence.
- Review gross margin and revise packaging or limits if needed.
- Commission an independent security/privacy review proportional to launch scope.
- Hold a formal public-launch go/no-go review using evidence, not completion percentage.

## Public-launch gates

I would not approve unrestricted launch until all of the following are true:

- At least five representative UAT sessions completed, with material findings resolved or accepted.
- Core journey success, user comprehension and return-use thresholds met.
- Zero known critical security, privacy, billing, data-loss or unsupported-claim defect.
- RLS/isolation, deletion, backup restore and incident response verified.
- AI evaluation gates pass for supported countries and declared scenarios.
- Every active mobility source has an owner and freshness policy.
- Top supported ATS flows have measured—not merely fixture—success.
- Sentry/operational alerts and runbooks are live and tested.
- Stripe and email behavior are verified in the target production environment.
- Extension distribution/update/rollback path is manually verified.
- Compliance and regulatory actions named in the readiness plan are complete.
- Unit economics support the planned acquisition and usage level.
- Product language accurately describes beta status, uncertainty and compatibility.

## What I would stop, start, and continue

### Stop

- Adding features to appear “all-in-one.”
- Treating platform count as the primary integration measure.
- Allowing large UI components to absorb more domain behavior.
- Using technical pass rates as a substitute for customer validation.
- Presenting “more interviews” as achieved before outcome evidence exists.

### Start

- Operating from a risk register, SLIs, error budgets and named owners.
- Measuring the complete role-to-outcome funnel with privacy-safe events.
- Versioning and evaluating every consequential AI decision path.
- Managing mobility and job sources as production data products.
- Decomposing by stable domains and explicit state transitions.
- Reporting unit cost and gross margin per workflow.

### Continue

- Evidence-first generation and explicit uncertainty.
- Human review and user-controlled submission.
- Capability-specific platform disclosures.
- RLS, input validation, privacy redaction and atomic credit controls.
- Automated quality gates plus manual/live evidence.
- Honest private-beta language until the evidence supports promotion.

## Final CTO comment

The engineering team has built more than a prototype. It has a credible security posture, disciplined product boundaries, deployable infrastructure, extensive workflows, and serious verification work. That deserves confidence—but not complacency.

The next CTO task is to convert engineering completeness into an operable, measurable and economically sustainable product. The company should ship less surface area, learn faster from the narrow core, and make trust observable. If EU Apply becomes the most reliable place for a cross-border candidate to decide **whether a role is viable and what they can truthfully prove**, the surrounding application tools will reinforce a real moat. If it competes on the number of screens, platforms or generated documents, it will inherit the cost structure of a broad suite without its incumbents' distribution.

**CTO status:** controlled-beta GO; public-launch NO-GO pending the gates above.

## Evidence reviewed

For the canonical module tree, configuration ownership, log/evidence organization, repository-hygiene findings and physical line counts, see [`repository-structure-and-codebase-inventory-2026-09-09.md`](repository-structure-and-codebase-inventory-2026-09-09.md).

- [`product-engineering-review-2026-09-09.md`](product-engineering-review-2026-09-09.md)
- [`README.md`](../../README.md)
- [`product-readiness-policy.md`](../reference/product-readiness-policy.md)
- [`release-readiness.md`](../reference/release-readiness.md)
- [`technical-debt.md`](../reference/technical-debt.md)
- [`private-beta-v1-readiness-report.md`](../reference/testing/private-beta-v1-readiness-report.md)
- [`platform-coverage.ts`](../../packages/shared/src/platform-coverage.ts)
- Current architecture, security, AI, billing, extension, source-coverage, and test implementation.
