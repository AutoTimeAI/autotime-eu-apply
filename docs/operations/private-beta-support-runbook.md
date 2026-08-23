# Private Beta Support Runbook

This does not duplicate `docs/operations-runbook.md`'s "Production
Support" section (data-editing principles: auditable, reversible,
scoped to one account, recorded with timestamp/reason/result) — it
adds the beta-specific channel and process detail that document
doesn't cover.

## Support channel

**OWNER ACTION REQUIRED**: this assessment cannot invent where beta
users should report issues. Confirm and document:
- Support contact (email address / form / Slack Connect channel?)
- Expected response time for a beta user's report
- Whether support is founder-only or has other responders

## Security-reporting channel

**OWNER ACTION REQUIRED**: confirm a route for a beta user (or anyone)
to report a suspected security issue, separate from general support.
A dedicated `security@` address or a `SECURITY.md` file in the repo
are common minimal options. Not yet present in this repository — checked
via file search, no `SECURITY.md` exists at repo root.

## Escalation

Follows `docs/operations-runbook.md`'s severity levels (SEV1: billing/
auth/data-isolation; SEV2: core dashboard/extension unavailable; SEV3:
degraded AI/analytics/email/non-critical). For a beta of this scale,
**OWNER ACTION REQUIRED**: confirm whether SEV1 issues get any
different response than "founder investigates when they see it" —
e.g. is there any on-call expectation at all, or is best-effort
acceptable for an invite-only cohort?

## Known limitations to disclose to beta users

Per `docs/qa/10-known-risks-and-limitations.md`: no independent
penetration test, backup/restore not yet demonstrated (as of this
assessment), a known dashboard performance regression under
investigation (`DEF-003`). **OWNER ACTION REQUIRED**: decide how much
of this to proactively disclose in the beta invitation itself versus
handling reactively if raised.
