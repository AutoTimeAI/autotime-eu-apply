# Core Pillars Build Strategy — CV to Landing the Interview

**Date:** 10 September 2026
**Question this answers:** given everything verified today (the moat R&D package, the capability
audit, the two live decision-engine bugs found and fixed), what is the single most important thing
to invest engineering time in next — across the whole candidate journey, not just the decision
engine — to make AutoTime's three pillars (EU Fit, evidence integrity, application preparation)
actually hard to copy?

**Answer, stated first:** the product has a real, verified moat *design* — one governed pipeline
where a decision, its evidence, and generated content are all linked and checked. But today, **that
governance only actually runs on one of the product's nine live AI-generation surfaces.** The other
eight — CV tailoring, cover letters, interview-answer coaching, technical-interview prep, profile
context, work-authorisation wording — call OpenAI directly and return the result with no claim
checking at all. This isn't a roadmap gap. It's a verified, present-tense inconsistency between what
the product's second pillar (evidence integrity) claims and what eight-ninths of its content
generation actually does. Closing it is the single highest-leverage next investment, ahead of
country expansion, ahead of new features, ahead of everything else in this document.

## The finding, verified directly

Every route under `apps/web/app/api/ai/` was checked for whether it runs generated content through
`assessDraftEligibility`/`assessClaimSupport` (the shared evidence-integrity gate that
`packages/shared/src/evidence/model.ts` defines and that `/api/ai/content` — the application-kit
route — actually uses) before returning it:

| Route | Caller | Evidence/claim checking? |
| --- | --- | --- |
| `/api/ai/content` | Browser extension, `JobApplicationWorkspace` | **Yes** — `prepareApplicationKit` → `assessDraftEligibility` |
| `/api/ai/analyse` | `DashboardExperience` (dead tab) | No |
| `/api/ai/cover-letter` | `CVWorkspace` | No |
| `/api/ai/cv-enrich` | `CVWorkspace` | No |
| `/api/ai/interview` | `DashboardExperience` (dead tab) | No |
| `/api/ai/interview-answer` | `DashboardExperience` (dead tab) | No |
| `/api/ai/profile-context` | `DashboardExperience`, `OnboardingWizard` | No |
| `/api/ai/tailor-cv` | `CVWorkspace` | No |
| `/api/ai/technical-interview` | `DashboardExperience` (dead tab) | No |
| `/api/ai/work-authorisation` | `DashboardExperience` (dead tab) | No |

Checked by grepping every route file for the actual gate function names, then confirming no
downstream check exists in the calling component either (`CVWorkspace.tsx`, `OnboardingWizard.tsx`
— zero matches for `assessClaimSupport`/`assessDraftEligibility`/`unsupportedClaims`). All eight
non-compliant routes still enforce rate-limiting and usage-reservation (`assertAiRouteRateLimit`,
`reserveAiCall`) — this is not a missing-infrastructure problem, the gate exists and is genuinely
easy to call; it's simply not called from anywhere except the one route.

**This is not new.** `/api/ai/content` (governed) and `/api/ai/interview` (ungoverned) were both
added the same day, 6 May 2026. The inconsistency has been present for over four months across
multiple feature releases, not something that crept in recently.

**Of the eight ungoverned routes, five are only reachable from `DashboardExperience`'s dead tabs**
(`analyse`, `interview`, `interview-answer`, `technical-interview`, `work-authorisation`, and half
of `profile-context`) — per this session's earlier reachability audit
(`docs/reference/technical-debt.md`), so they carry no live risk today. **Three are live and
reachable right now**: `cover-letter`, `cv-enrich`, and `tailor-cv`, all called from `CVWorkspace`
— the actual CV-tailoring page real users hit. A candidate's tailored CV, cover letter, and CV
enrichment suggestions currently ship with zero check that the AI didn't invent a skill, a metric,
or an experience the candidate never confirmed.

## The full journey, stage by stage, with real current state

| Stage | What exists today (verified) | Governed? | Commodity or moat |
| --- | --- | --- | --- |
| **0. Profile & evidence** | `evidenceStatusSchema` (verified/user_declared/inferred/unknown/missing/conflicting/stale), live, per-fact | Yes | Moat foundation — this is genuinely well-built |
| **1. Country/role fit decision** | `analyseJob` + `assessInternationalJob`, live, evidence-linked, now with honest unverified-salary disclosure (today's fix) | Yes | **The strongest moat candidate in the product** |
| **2. CV tailoring & cover letter** | `/api/ai/tailor-cv`, `/api/ai/cover-letter`, `/api/ai/cv-enrich` — live, AI-generated, **zero claim checking** | **No** | Currently commodity-grade, despite being adjacent to the moat's own evidence graph |
| **3. Application kit** | `/api/ai/content` via `prepareApplicationKit` — live (this session's own new feature), evidence-linked | Yes | Correctly built |
| **4. Interview prep questions** | `generateInterviewQuestions` — **deterministic, template-based, not an LLM call at all**, evidence-linked to `job.analysisHistory` | Yes (by construction) | Quietly one of the best-designed pieces in the product |
| **5. Interview answer coaching** | `/api/ai/interview-answer`, `/api/ai/technical-interview` — only reachable from the dead tab today | No | Not currently a live risk, but would need the same gate before ever being wired live |
| **6. Outcome & learning loop** | `outcome_records`, `assessCoreLoopTrace` (wired live today), no structured correction taxonomy yet | Partial | The rank-1 moat candidate from `docs/moat-analysis.md` — still mostly unbuilt |

The pattern across all six stages: **wherever the product forces a decision through a shared,
typed model first (the fit decision, the application kit, the deterministic interview questions),
evidence integrity holds.** Wherever a stage was built by calling OpenAI directly for a plausible
result (CV tailoring, cover letters), it doesn't. That's not a coincidence of which stages are
harder to govern — cover letters and CV bullets are *exactly* the kind of free-text content the
evidence-integrity pillar exists to constrain. It's a consequence of building nine separate
generation surfaces over four months instead of one.

## Why this is the moat question, not just a quality bug

`docs/moat-analysis.md`'s rank-2 candidate (governed mobility data) and rank-3 (evidence graph) both
depend on the same premise: that AutoTime's generated content can be trusted *because* it's
constrained by real evidence, unlike a generic AI tool that will confidently invent a bullet point.
Today, that's true for one surface and false for three live ones. A candidate reviewing their
AI-tailored CV has exactly the same unsupported-claim risk today as they would using any generic
resume tool — the very category `docs/reports/moat-rd-strategy-2026-09-10.md` explicitly says
AutoTime should differentiate from, not resemble. **A competitor doesn't need to copy AutoTime's
architecture to match this — AutoTime needs to finish its own.**

## The concrete next investment, prioritized

1. **Unify CV/cover-letter generation onto the governed pipeline (`prepareApplicationKit` /
   `assessDraftEligibility`).** This is the single highest-leverage fix: three live routes, one
   already-built gate, no new infrastructure required — the same pattern this session used twice
   today (wire what exists, don't build new). Scope: `tailor-cv`, `cover-letter`, `cv-enrich` route
   through the same claim-checking `/api/ai/content` already does before `CVWorkspace` ever shows
   the result to a user.
2. **Extend the frozen NL/DE evaluation-scenario work (`docs/reports/nl-de-decision-engine-deep-dive-2026-09-10.md`)
   to cover CV/cover-letter claim-checking specifically**, not just the decision engine — the same
   lesson applies: one real scenario (a CV bullet claiming a skill absent from any confirmed
   evidence) will find defects faster than describing the need to test for them.
3. **Only then, extend country coverage** using the already-researched Wave 2 markets (France,
   Sweden, Denmark, Finland — `docs/reports/claude-code-independent-moat-rd-2026-09-10.md` Section
   5) — reusing the honest-disclosure pattern from today's salary fix and the route-scoped
   threshold lesson from the France/Sweden dual-route finding, so new countries don't quietly
   reintroduce either gap.
4. **Start the outcome-loop instrumentation** (rank-1 moat) once the evidence-integrity gap is
   closed — an outcome pipeline built on top of ungoverned content generation would be measuring
   the wrong thing (whether candidates got interviews from AI-generated content that was never
   checked for honesty), undermining the very trust signal it's meant to build.
5. **Country-fit-for-passion matching** (matching a candidate's stated role/domain interest against
   realistic country-corridor viability, not just eligibility) is a genuine, differentiated feature
   idea — but it's a UX layer on top of the fit-decision engine that already exists
   (`analyseJob`/`assessInternationalJob` already compute per-country viability; the missing piece
   is a *ranking/comparison* view across multiple target countries at once, not a new decision
   engine). Sequence this after item 1, since it's new scope that should sit on top of a trustworthy
   evidence pipeline, not alongside a known gap in one.

## What not to build yet

Consistent with every R&D report produced today (`docs/reports/moat-rd-synthesis-2026-09-10.md`
Section 3, `docs/reports/startup-moat-rd-dossier-2026-09-10.md`'s investment portfolio table):
broader career-discovery features, more ATS integrations without reliability evidence, autonomous
submission, a general interview-coaching product, or additional country coverage beyond the
research-backed waves. None of these compound the moat; the evidence-integrity gap above actively
works against it.

## Verification standard for the next change set

Whichever of the above gets built next should meet the same bar this session's own fixes did:
a real proof (an actual unsupported claim reaching a real user, not a hypothetical), a conservative
fix (extend the existing gate, don't invent a new one), a regression test, and — since this touches
what candidates actually submit to employers — a live check that the fix doesn't silently degrade
CV/cover-letter quality for the common case where the AI's draft *was* honest. This is real,
user-facing generated content; the same rigor that caught the salary-disclosure and
sponsorship-detection bugs today should be non-negotiable here too, not relaxed because "it's just
a CV."
