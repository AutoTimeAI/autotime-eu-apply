# End-to-end tests

The Playwright suites exercise named user journeys across public pages,
onboarding, jobs, applications, interviews, mobility, career direction,
profiles, outreach, admin security, and production-safe diagnostics.

Shared setup lives in `e2e/helpers.ts`; tests should prefer supported UI or
mocked API boundaries over reaching into component internals. Visual evidence
tests record viewport-specific regressions, while production smoke coverage
must avoid creating sensitive or persistent real-user data.
