# Beta release QA — 15 August 2026

## Decision

**Conditional GO for controlled beta.** Core authenticated journeys, isolation controls, builds, and automated regression checks pass. Public launch remains blocked on the manual/legal items below.

## Production journeys exercised

- Disposable-user onboarding: mandatory identity, phone, location, target countries, work-authorisation evidence, LinkedIn profile, photo, and text-based PDF CV; completion persisted and unlocked the dashboard.
- Cross-user RLS: a second authenticated user could not read or insert another user's profile; shared job listings remained readable as intended.
- Aggregated jobs: production returned Greenhouse and Lever listings; search and tracking worked and the tracked job appeared in Saved jobs.
- ESCO questionnaire: answers persisted, adaptive follow-up questions were returned, ESCO skills were mapped, and explained job matches loaded.
- CV workspace: incomplete fields blocked export; complete contact, summary, skills, experience and education enabled PDF print/save and DOCX generation; AI tailoring stayed within supplied evidence; public GitHub enrichment remained preview-only.
- Job analysis: an evidence-poor listing returned Insufficient information and correctly blocked application preparation; a complete synthetic vacancy produced a saved analysis.
- Post-deployment boundary check: job analysis hydrated the disposable user's cloud CV/work-authorisation profile and displayed `Sponsorship required`; the jobs browser initially rendered 25 of 200 records with a working load-more control.
- Analytics: PostHog initialises only after explicit consent.

## Fixes made during QA

- Corrected privacy disclosures for Vercel transfer scope, Resend, job-feed providers, ESCO/outreach data, and consent-gated analytics.
- Added an explicit LinkedIn non-automation restriction to the terms.
- Replaced inaccurate login privacy wording and linked Privacy/Terms.
- Limited initial aggregated-job rendering to 25 records with count and load-more controls; corrected visible encoding artifacts.
- Limited ESCO results to the top two explained matches with an explicit expansion control; corrected questionnaire completion consistency and encoding artifacts.
- Hydrated job-analysis CV and work-authorisation evidence from the authenticated cloud onboarding profile while retaining the legacy local fallback and preserving explicitly saved mobility preferences.
- Relabelled the browser print workflow from Download PDF to Print / save PDF.

## Automated evidence

- `pnpm lint`: PASS.
- `pnpm test:unit`: PASS (extension, role pathways, readiness, application workflow, interviews, admin security, production hardening, country fit, cloud sync, Sentry privacy, and MVP coverage).
- `pnpm build:extension`: PASS.
- `pnpm build:web`: PASS with `NODE_OPTIONS=--max-old-space-size=4096`. The first attempt compiled and type-checked but its page-data worker exhausted the default Windows heap.

## Remaining launch blockers / manual gates

- User-content XSS/HTML/SQL-injection coverage is now automated and passed after adding backend CV/outreach bounds and defence-in-depth URL validation. See `docs/testing/user-content-injection-audit-2026-08-15.md`.
- Add the actual ICO registration reference to the privacy policy after registration; the current policy explicitly marks it as pending.
- Complete a real Chrome pre-publication extension pass on supported ATS pages and the one-time LinkedIn risk notice. Automated extension contracts pass, but this environment cannot install the unpacked extension into the user's normal Chrome profile.
- Validate one real alert email to an address controlled by the owner. QA did not send mail to third parties.
- Complete Stripe checkout/webhook verification in test mode or with a fully refundable owner-controlled transaction. QA did not initiate a real charge.

## Safety notes

No job application was submitted, no LinkedIn action was automated, no third-party message was sent, and no payment was initiated during this run.
