# Completed test cases

**Product:** AutoTime EU Apply  
**Date:** 9 September 2026  
**Environment:** Local Windows, Chromium, Webpack-backed Next.js server  
**Decision:** Local automated scope passed; production validation remains on hold.

## Final result

The row-level source of truth is the [127-case CSV catalogue](test-case-catalogue-2026-09-09.csv). The supporting and outstanding evidence set is indexed in the [test documentation register](test-document-register-2026-09-09.csv).

| Result | Count |
| --- | ---: |
| Passed | 103 |
| Production-guarded skips | 24 |
| Failed | 0 |
| Total accounted for | 127 |

The aggregate run completed in 31.2 minutes. Playwright shut down normally and released port 3000. The 24 skipped cases require real production integrations and are not represented as passed.

## Completed gates

| ID | Test | Result |
| --- | --- | --- |
| TC-01 | Typecheck across shared, extension and web projects | Pass |
| TC-02 | Workspace lint/validation | Pass |
| TC-03 | Unit, environment, billing and public-error boundary tests | Pass |
| TC-04 | Python compilation and reduced MVP runner | Pass |
| TC-05 | Browser smoke and teardown | Pass — 3/3 |
| TC-06 | Full configured Chromium inventory | Pass — 103 passed, 24 guarded skips, 0 failed |
| TC-07 | Diff whitespace integrity | Pass |

## Completed browser coverage

| Area | Verified behavior | Result |
| --- | --- | --- |
| Public entry | Homepage, CTA, login and local Sentry-page behavior | Pass |
| LinkedIn-shaped capture | Import within five seconds after readiness and retention after reload | Pass |
| Navigation | Desktop/mobile navigation, keyboard access and seven destinations | Pass |
| Profile persistence | Consent, conflicts, retry, deletion, offline and disabled states | Pass |
| Home | New-user, evidence, job, application and interview priorities | Pass |
| Jobs | Capture, facts, detail, analysis, decisions, mobile UI and redirects | Pass |
| Applications | Pipeline, filters, readiness, applied/rejected states and submission | Pass |
| Interviews | Creation, preparation, claim blocking, practice, readiness and outcomes | Pass |
| Career Direction | Evidence, ESCO pathways, preferences, lanes and scoped persistence | Pass |
| Mobility/countries | Sponsorship evidence, sources, country modes and data reuse | Pass |
| Profile UI | Readiness, prefilling, non-overwrite, edits and responsiveness | Pass |
| Onboarding/CV | Upload, CV builder, completion, tailoring and export gates | Pass |
| ESCO questionnaire | Multi-round evidence and explainable matches | Pass |
| Outreach | CSV review, consent and controlled prefilling | Pass |
| Authorization | Admin isolation, redirects and protected endpoint rejection | Pass |
| Accessibility automation | Keyboard, focus, tabs, target sizing and serious violations | Pass |
| Responsive/visual | Required viewports, overflow and visual baselines | Pass |
| Design contract | Primary hierarchy, shared blue and tab/stepper styles | Pass |
| Failure behavior | Offline, unavailable, failed-sync and fail-closed states | Pass |

## Defects repaired and retested

- Added a 2.5 GB free-space preflight and cleared only regenerable artifacts.
- Repaired Python runner import ordering.
- Added clean Windows Playwright shutdown and verified port release.
- Raised the test-server heap ceiling to 8 GB; the suite passed the old case-88 crash point.
- Replaced fixed timing assumptions with readiness, URL and hydration waits.
- Standardized a 30-second assertion budget within a two-minute case ceiling.
- Replaced login baselines that incorrectly captured fallback error UI.
- Added public-safe error mapping for reviewed 5xx routes.
- Required valid Stripe product configuration before billing is advertised.

## Not completed

- The 24 production-guarded browser cases
- Real Stripe payment and webhook validation
- Real Resend delivery and webhook validation
- Real Sentry ingestion, source maps and alert delivery
- Human toolbar-discoverability/extension usability observation and screen-reader testing
- Cross-browser coverage outside Chromium
- Load, stress, soak, penetration, disaster-recovery and rollback exercises

## Release conclusion

**Local automated testing:** Passed.  
**Production certification:** Conditional hold.

Provision the integrations, run the 24 guarded cases, and complete manual provider, extension and accessibility evidence before removing the hold.
