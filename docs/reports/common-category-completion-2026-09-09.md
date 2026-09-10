# Common category completion pass

**Date:** 9 September 2026  
**Scope:** Safe local and read-only test categories  
**Production mutation:** None

## Newly completed baselines

- k6 smoke: 72/72 checks, 0% failures, p95 118.71 ms.
- k6 normal load: 480/480 checks, 0% failures, p95 200.72 ms at five VUs for one minute.
- k6 bounded stress: 700/700 checks, 0% failures, p95 588.75 ms at twenty VUs for thirty seconds.
- k6 short soak: 424/424 checks, 0% failures, p95 94.52 ms at two VUs for two minutes.
- Chromium smoke: 3/3 passed.
- WebKit compatibility and mobile-accessibility smoke: 2/2 passed in an isolated run.

## Repaired test defects

- Added opt-in Firefox and WebKit projects to the smoke configuration through `AUTOTIME_CROSS_BROWSER=true`; the default Chromium gate is unchanged.
- Isolated the login/dashboard smoke journey from a late homepage navigation.
- Replaced a racy Jobs browser navigation with the intended server-response assertion because an incomplete smoke profile legitimately redirects to onboarding.

## Environment-blocked evidence

- Firefox 150.0.2 could not initialize the headless SWGL framebuffer and timed out before reaching the application.
- A later combined WebKit run timed out while creating pages, although the two compatibility cases passed in its isolated run.
- Lighthouse built the production app and completed homepage audit collection, but Windows denied deletion of its temporary Chrome profile (`EPERM`) before LHCI could persist and assert the report. No Lighthouse category score is claimed.

## Still external or human

- Production load/capacity, long soak, disaster recovery and rollback exercises.
- Real Sentry, Stripe, Resend and authenticated production integration tests.
- Human NVDA/VoiceOver, usability, legal/compliance and formal UAT sign-off.
