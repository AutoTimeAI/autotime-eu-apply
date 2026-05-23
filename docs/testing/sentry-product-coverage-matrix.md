# Sentry Product Coverage Matrix

Last updated: 2026-05-24

Sentry is used for runtime debugging and production issue investigation, not
product analytics. Coverage is judged by whether a feature has safe breadcrumbs,
automatic or explicit error capture, privacy redaction, and test evidence.

| Feature | Breadcrumb coverage | Error capture coverage | Safe metadata only | Test evidence | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| job_import | `job_import_started` | Next/Sentry route capture plus app error boundaries | Yes | Sentry privacy test, E2E flow | Partial | Dashboard live spot-check still required. |
| eu_fit | `eu_fit_checked` | API route errors covered by Sentry server config | Yes | Sentry privacy test, E2E flow | Partial | Does not send full job description. |
| save_eu_fit_result | No dedicated breadcrumb verified | App runtime/error boundary coverage | Yes | E2E flow | Partial | Consider a safe `save_eu_fit_result` breadcrumb after beta if dashboard context is weak. |
| application_kit | `application_kit_generated` | API route errors covered by Sentry server config | Yes | Sentry privacy test, E2E flow | Partial | Must not send generated cover letter or recruiter message text. |
| waitlist_feedback | `waitlist_submitted` | App runtime/error boundary coverage | Yes | E2E flow | Partial | Must not send email address or free-text feedback to Sentry. |
| dashboard_state | No dedicated breadcrumb verified | App runtime/error boundary coverage | Yes | E2E flow | Partial | Useful production debugging may need one safe state-transition breadcrumb later. |
| profile_readiness | No dedicated breadcrumb verified | App runtime/error boundary coverage | Yes | Static/config review | Partial | Avoid sending CV/profile text. |
| cloud_sync | No dedicated breadcrumb verified | API/runtime errors covered by Sentry config | Yes | Previous E2E warning cleanup, build/E2E evidence | Partial | Local optional sync failures are graceful; live dashboard check pending. |
| route_load | Sentry router transition capture configured | Client runtime capture configured | Yes | Config inspection | Partial | Dashboard trace/source-map verification pending. |
| sentry_test | Test page/API breadcrumbs | Explicit test capture routes | Yes | Sentry privacy test, route protection E2E | Partial | Production dashboard spot-check still manual/pending. |

## Verdict

Product-level Sentry observability is strong enough for founder-led private beta
runtime monitoring, but not yet strong enough to call public launch ready. Public
launch needs a Sentry dashboard spot-check proving production event arrival,
breadcrumb attachment, source-map readability, error-only replay behaviour, and
no sensitive data leakage.
