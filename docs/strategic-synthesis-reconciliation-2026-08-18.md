# AutoTime strategic synthesis - repository reconciliation

Verified against the repository on 18 August 2026. This document reconciles
`autotime-strategic-synthesis.md` with the product that exists now. The supplied
synthesis remains useful historical input, but it must not be used as current
product or marketing evidence without these corrections.

## Executive conclusion

AutoTime's strongest defensible position is the combination of evidence-backed
application support, explainable European mobility guidance, ESCO skill overlap,
and explicit human review. Absolute uniqueness, competitor success/failure rates,
and account-ban statistics are not sufficiently evidenced for public claims.

Distribution coverage is no longer undocumented. The shared registry and public
compatibility matrix classify 26 platforms separately for capture, autofill, and
native feeds, with dated evidence and a 30-day freshness rule. Platform recognition
must never be presented as successful autofill or feed ingestion.

## Corrections to the supplied synthesis

| Supplied conclusion | Current repository evidence | Disposition |
| --- | --- | --- |
| Autofill coverage is undocumented | `/compatibility` is generated from the typed 26-platform registry and exposes capability-specific, dated status. | Resolved |
| SmartRecruiters should be added | SmartRecruiters detection, fixtures, native feed ingestion, live verification, and public status exist. | Resolved |
| Teamtailor and Recruitee are missing | Both are recognized and fixture-tested for capture/autofill. Neither has a generally usable unauthenticated native feed in the current implementation. | Partial; do not imply native ingestion |
| Interview preparation is a static pack | The product has question-by-question practice, confidence capture, evidence-aware drafts, technical drills, and follow-up prompts. | Stale conclusion |
| There is no networking/referral feature | Human-sent outreach drafting, contact types, status, and follow-up tracking exist. Contact discovery/import is the remaining gap. | Stale/partial conclusion |
| Bulk apply is a product weakness | Silent or unattended submission conflicts with the product's evidence and consent controls. | Strategic non-goal |
| Batch-review-then-send is open whitespace | A review queue may be explored, but approval must remain per application and AutoTime must never submit a third-party form without an immediate user action. | Research candidate, not a launch commitment |
| AutoTime is "the only" EU work-permission check | The reviewed material supports differentiation, not an absolute market-wide uniqueness claim. | Do not publish |
| Competitor ban/fabrication percentages prove positioning | The supplied document gives no reproducible primary evidence for these precise figures. | Remove percentages and named allegations from public copy |

## Current capability position

| Capability | Current status | Remaining measurable gap |
| --- | --- | --- |
| Browser platform recognition | 26 named platforms | Keep every public record non-stale through weekly read-only checks |
| Capture and extraction | Fixture coverage for all registry platforms; live checks can be inconclusive when sites block access | Improve tenant/page samples without bypassing access controls |
| Autofill | Reported independently from capture; reviewed empty-field filling only | Expand representative application-form fixtures and real consented checks |
| Native feeds | Greenhouse, Lever, Ashby, Personio, and SmartRecruiters verified | Add providers only where lawful, stable public interfaces exist |
| Interview preparation | Interactive and evidence-aware | Voice/video simulation is optional, not required for launch |
| Outreach | Editable, tracked, human-sent | CSV/manual contact import and permitted contact acquisition |
| Mass submission | Intentionally absent | None; preserve the consent boundary |

## Prioritised roadmap

### Complete and maintain

1. Keep the 26-platform compatibility evidence current. Weekly checks may produce
   reviewable updates, but must not change public claims automatically.
2. Maintain separate public measures for capture, autofill, and native feeds.
3. Preserve LinkedIn as manual-only and label access blocks as inconclusive or
   unverified rather than broken.

### Next product work

1. Add CSV contact import to the existing outreach workspace with preview,
   duplicate detection, explicit consent, bounded fields, and user-scoped storage.
2. Instrument the role-import to review to application to interview funnel using
   consent-gated, non-identifying events. Measure completion, corrections, and
   abandonment; do not infer hiring success.
3. Evaluate a review queue only as a planning surface. Each application must retain
   its own evidence review, unsupported-claim checks, and explicit user-controlled
   submission.
4. Consider additional native feeds only after confirming a stable public or
   licensed API, provenance requirements, rate limits, and fixture/live evidence.

### Deferred

- Automated contact discovery or scraping.
- LinkedIn automation.
- Silent, scheduled, or bulk third-party form submission.
- Voice/video scoring presented as a hiring prediction.
- CV-derived relationship inference without explicit user-provided contact data.

## Approved positioning

Use:

> Evidence-backed application support for Europe, with explainable mobility
> guidance and a human review before anything is sent.

Use capability-specific distribution wording linked to `/compatibility`, for
example:

> See current, dated capture, autofill, and native-feed compatibility by platform.

Avoid "only", "guaranteed", "all ATSs", unexplained platform counts, precise
competitor failure rates, and named allegations. Competitor statements should be
dated, attributed to the vendor, and clearly described as vendor claims rather
than independent performance evidence.

## Evidence pointers

- Shared registry: `packages/shared/src/platform-coverage.ts`
- Public matrix: `apps/web/app/compatibility/page.tsx`
- Coverage verifier: `scripts/verify-platform-coverage.mjs`
- Verified competitive audit: `docs/competitive-feature-audit-verified-2026-08-18.md`
- Outreach implementation: `apps/web/components/OutreachWorkspace.tsx`
- Interview implementation: `apps/web/components/InterviewsWorkspace.tsx`

