# Remaining competitive gaps - verified implementation disposition

Verified against the repository and primary vendor documentation on 18 August 2026.
The supplied `autotime-remaining-gaps-implementation_1.md` is design input, not
an authoritative implementation specification.

## Implemented

- **Recruitee public feed:** added a read-only Careers Site API adapter, fixture
  normalisation test, platform constraint, and capability-specific coverage status.
  Recruitee documents this Careers Site API as unauthenticated.
- **Application final-review queue:** Ready applications with a current Apply
  recommendation and no readiness blockers appear in a selectable queue capped at
  20. Selection only opens each application for review. It does not fill external
  forms, submit, or mark an application Applied.
- **Timed typed interview practice:** each generated interview question supports a
  90- or 120-second typed practice session. Responses are saved with timestamps and
  remain practice evidence, without numeric scoring or hiring predictions.
- **CSV outreach contacts:** already implemented with preview, consent, validation,
  deduplication, user-scoped storage, and RLS.
- **Platform problem reporting:** already implemented through the compatibility page.

## Corrected or gated

### Teamtailor

The proposed unauthenticated `https://{slug}.teamtailor.com/api/v1/jobs` feed is
not supported by Teamtailor's official API documentation. The official endpoint is
`https://api.teamtailor.com/v1/jobs` and requires an API key in the Authorization
header plus a dated API-version header. AutoTime therefore retains Teamtailor as
tested browser capture/autofill only. Native ingestion requires an employer-provided
credential model, secret rotation, tenant consent, and a separate security review.

Primary documentation: https://docs.teamtailor.com/

### Batch apply wording

The supplied helper would call `transitionApplication(..., "Applied", ..., true)`
for several records without evidence that any third-party application was actually
submitted. That would corrupt funnel metrics and misrepresent user activity. The
implemented queue batches selection and prioritisation only; final review and the
existing explicit submission confirmation remain per application.

### Interview AI and speech

Typed timed practice is implemented first. AI practice feedback and browser speech
recognition remain deferred until retention, consent, accessibility, model-cost, and
unsupported-claim controls have a dedicated acceptance contract. The current feature
stores only user-entered text and makes no assessment prediction.

### Agency directory

No directory is shipped without vetted content. An empty schema or unverified seed
list would create a false trust signal. Engineering starts only after a product owner
provides a reviewed seed set with country, specialism, licensing source, verification
date, review owner, and expiry cadence. AutoTime will not transmit candidate data to
an agency; any future outreach remains user-reviewed and human-sent.

## Evidence

- Recruitee Careers Site API: https://docs.recruitee.com/reference/intro-to-careers-site-api
- Recruitee offers endpoint: https://docs.recruitee.com/reference/offers
- Teamtailor authentication: https://docs.teamtailor.com/
- Coverage registry: `packages/shared/src/platform-coverage.ts`
- Review queue: `apps/web/lib/job-application-workflow.ts`
- Timed practice: `apps/web/components/InterviewsWorkspace.tsx`
