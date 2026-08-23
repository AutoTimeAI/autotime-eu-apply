# Security Incident Response Plan

Extends `docs/operations-runbook.md`'s "Incident Response" section
(SEV1/2/3 levels, first-response steps) with the security-specific
detail the assessment brief asks for.

## Severity classification (reused from operations-runbook.md)

- **SEV1**: billing, auth, or data isolation issue — includes any
  confirmed or suspected cross-user data exposure.
- **SEV2**: core dashboard or extension workflow unavailable.
- **SEV3**: degraded AI, analytics, email, or non-critical feature.

## Containment

1. If a cross-user data exposure is confirmed or strongly suspected:
   consider disabling the affected feature/route via a feature flag
   (the codebase has `admin_feature_flags` infrastructure, verified
   this session in PR #164) rather than a full outage where possible.
2. If a credential/secret is confirmed leaked: rotate immediately per
   `docs/operations-runbook.md`'s Secret Rotation section, in the
   listed priority order.
3. Preserve evidence before remediating where safe to do so (see below).

## Investigation

1. Check Vercel deployment logs for the affected time window.
2. Check Sentry for related error events (redaction is verified
   working per `MON-001` — safe to review without exposing user data).
3. Check `operational_logs` table entries if DB access is available.
4. Identify the affected user(s) and scope precisely — do not assume
   scope without checking.

## Customer communication

**OWNER ACTION REQUIRED**: this assessment cannot decide notification
thresholds or wording. For a beta of this size, confirm:
- At what severity/scope does a beta user get individually notified?
- Is there a legal obligation to notify given the personal data
  involved (CV/profile content)? This is a legal-review item, not
  something this assessment can determine.

## Recovery

Follows `docs/operations/release-rollback-runbook.md` if a code/deploy
rollback is needed, or a targeted data fix if the issue is data-only
(with the reversibility/auditability principles from
`docs/operations-runbook.md`'s Production Support section).

## Evidence preservation

Before remediating (where safe): capture the relevant Sentry event
IDs, `operational_logs` rows, and a copy of the affected code at the
incident-time SHA. This assessment's own evidence-handling rules
apply here too — redact personal data before storing incident
evidence anywhere outside the production system itself.

## Post-incident review

Record: what happened, root cause, fix, and a new/updated test case
in `docs/qa/test-cases.csv` that would have caught it — every real
incident should leave behind a regression test, matching this
session's established pattern (every fix this session shipped with a
test that failed against the old code first).
