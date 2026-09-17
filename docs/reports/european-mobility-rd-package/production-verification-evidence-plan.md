# Production Verification Evidence Plan

**Purpose:** define what counts as real production verification  
**Safety:** use authorised test users, low-value transactions and non-sensitive synthetic records

## General rule

A configured SDK, passing unit test or successful local mock is not production verification. Each
service requires a timestamped run against the production integration, evidence from both AutoTime and
the provider, failure-path evidence and a named reviewer. Secrets never enter screenshots, logs or the
repository.

## Stripe

Evidence set:

1. Production price/product IDs mapped to the intended offer and environment.
2. A real low-value checkout completed by an authorised non-customer test identity where lawful.
3. Provider event ID, checkout/payment ID and AutoTime order/customer mapping.
4. Signature-verified webhook receipt, idempotent processing and replay attempt.
5. Duplicate/out-of-order event test proving no duplicate entitlement.
6. Decline/cancel path and one real refund with entitlement/accounting reconciliation.
7. Tax/receipt/privacy presentation reviewed for operating markets.
8. Redacted evidence record signed by founder/engineer.

Pass only when payment, webhook, entitlement, refund and ledger reconcile. Test-mode evidence remains
useful but separate.

## Resend/email

Evidence set:

1. Production sending domain and required DNS authentication status.
2. Real transactional message delivered to at least two external mailbox providers.
3. Provider message IDs matched to AutoTime event/request IDs.
4. Render/link/accessibility review on desktop and mobile.
5. Bounce and complaint webhook paths tested with provider-supported mechanisms.
6. Retry/idempotency prevents duplicate sensitive messages.
7. Logs contain no full document/CV or unnecessary personal content.

Pass only when delivery and event reconciliation are observed outside the sending account.

## Sentry/observability

Evidence set:

1. A controlled, uniquely tagged production error reaches the intended project/environment.
2. Source map/release/commit attribution identifies the responsible code.
3. Alert reaches the on-call destination and acknowledgement is timestamped.
4. Sensitive candidate, token, cookie, document and payment data is absent after scrubbing review.
5. A route-rule/source incident emits operational telemetry without leaking candidate evidence.
6. Resolution and regression linkage are recorded.

Pass only when event, alert, redaction and response are independently visible.

## Installed extension and Chrome Web Store

Evidence set:

1. Store-listed package/version, permissions and privacy disclosures match the reviewed build.
2. Install from the store into a clean Chrome profile; do not rely on unpacked development install.
3. Sign-in/session handoff, side panel, supported-site detection and save/sync flow work.
4. Test at least the declared ATS/site matrix using authorised test pages/accounts.
5. Verify denied permission, offline, expired session and unsupported-site behaviours.
6. Inspect extension service-worker/page console and network for errors/data leakage.
7. Update from prior store version and uninstall/reinstall preserve/delete data as documented.
8. Capture version IDs, timestamps, screenshots and redacted console evidence.

Pass only for the exact store version and declared surface matrix tested.

## Retention, deletion and recovery

Use a synthetic production account with linked mobility profile, evidence, vacancy, decision,
generated content, analytics and payment reference. Verify export, expiry jobs, account deletion,
derived-data cascade, vendor deletion/retention actions, backup treatment and restoration behaviour.
Recovery must not silently resurrect deleted personal data into active systems.

Record expected versus observed rows/objects by datastore and provider. Any legally retained finance or
security record must have documented basis, minimisation and access.

## Release evidence record

For each run capture system, environment, version/commit, test identity, start/end time, steps,
provider IDs, expected result, observed result, redacted artifacts, anomalies, incident link, reviewer
and expiry/retest trigger. Store secrets nowhere in the record.

## Retest triggers

Repeat affected verification on credentials/domain change, SDK/provider major change, webhook/schema
change, extension permission/store package change, retention-model migration, incident, or material
deployment architecture change. A previous production pass does not certify later versions.
