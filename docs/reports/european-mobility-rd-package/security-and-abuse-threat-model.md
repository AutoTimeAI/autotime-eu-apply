# Security and Abuse Threat Model

## Protected assets

Candidate identity/work-right facts, CV/qualification documents, decisions, payment links, expert
signatures, rule/source integrity, sponsor assertions, admin privileges and secrets. Incorrect
integrity can be as harmful as disclosure.

## Trust boundaries

Browser extension/job pages; web/API; auth; database/object storage; LLM/extraction providers;
source workers; admin/reviewer UI; Stripe/Resend/Sentry/analytics; expert/research evidence rooms.
Every boundary needs authentication, authorisation, minimisation, logging and a data contract.

## Principal threats

| Threat                   | Example                                    | Required control                                                 | Verification                    |
| ------------------------ | ------------------------------------------ | ---------------------------------------------------------------- | ------------------------------- |
| Prompt/content injection | Vacancy instructs model to ignore policy   | Treat content as data; constrained extraction; no tool authority | Adversarial corpus              |
| Cross-user access        | Changed ID reads another decision          | Server ownership/RLS                                             | Negative integration tests      |
| Privilege abuse          | Reviewer publishes own rule                | MFA; least privilege; author/publisher separation; audit         | Role escalation tests           |
| Rule tampering           | Threshold changes without lineage          | Hash revisions/bundles; signed promotion                         | Tamper/replay tests             |
| False expert             | Unqualified reviewer signs                 | Verify identity, regulator/qualification, expiry/conflicts       | Independent register evidence   |
| Entity poisoning         | Alias makes a brand look sponsored         | Identifier-first matching; reviewed aliases                      | Poison benchmark                |
| Sensitive logs           | CV/passport/token reaches Sentry           | Allowlisted telemetry and scrubbing                              | Controlled-event search         |
| Extension overreach      | Reads unrelated pages/fields               | Minimal permissions; explicit activation; redaction              | Clean-profile network review    |
| SSRF                     | Source URL targets internal network        | Admin allowlist; IP/redirect validation; egress controls         | Private/link-local tests        |
| Supply chain             | Parser dependency changes legal extraction | Lock/provenance/SBOM/review/sandbox/diff                         | Dependency/malicious-file tests |
| Webhook forgery          | Fake Stripe event grants access            | Signature, tolerance, idempotency, state machine                 | Forged/duplicate/order tests    |
| Account takeover         | Attacker exports mobility evidence         | Strong sessions; rate limits; step-up export/delete              | Revocation/abuse tests          |
| Provider retention       | Model vendor retains candidate data        | Contract/config review; minimise; regional controls              | Processor/request evidence      |
| Deletion resurrection    | Restore revives deleted profile            | Erasure ledger; post-restore deletion replay                     | Restoration drill               |
| Source outage            | Stale positive remains served              | Freshness circuit breaker and cached policy                      | Outage/freeze drill             |

## Abuse cases

- Recruiter repurposes the candidate tool for unapproved screening.
- User fabricates evidence to generate application claims.
- Adviser shares outputs beyond signed jurisdiction/version scope.
- Attacker floods corrections to freeze valid bundles.
- Research output is republished as an official determination.

Controls include intended-use enforcement, server policy, evidence status, reviewer scope, abuse
detection, correction triage and version metadata. Terms/disclaimers cannot replace controls.

## Security release gates

- Current data flow/threat model approved.
- RLS/ownership negatives cover every personal store.
- Admin/reviewer roles use MFA and separation of duties.
- Secrets are scoped/rotated and absent from repo/log/client.
- No unresolved critical/high findings from relevant security tests.
- Production payment/email/observability telemetry is redaction-audited.
- Store extension matches reviewed source/version/permissions.
- Export, deletion, restoration and incident exercises pass.
- Processor/transfer controls match production configuration.

Contain access/integrity incidents first, preserve evidence, identify affected users/decisions,
involve counsel/DPO, assess notifications, append corrections and publish prevention actions. A
mobility-rule integrity incident follows both security and source-operation runbooks.
