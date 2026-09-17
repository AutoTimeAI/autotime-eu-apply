# Pilot engineering gate — 17 September 2026

## Decision

The current local codebase passes its typecheck, full unit suite, and production web build. This is an **engineering checkpoint**, not evidence that LandWell is ready for unrestricted public launch or that development will never be needed again. The next default activity should be a bounded tech-candidate pilot, with code changes driven by observed failures rather than an open-ended feature backlog.

No deployment, commit, or push was made for this checkpoint.

## Changes made during this checkpoint

| Issue | Resolution | Verification |
| --- | --- | --- |
| The working copy of `vercel.json` had lost `git.deploymentEnabled: false`, allowing Git-triggered Vercel deployments despite the manual-release policy. | Restored the setting and added a regression assertion to `scripts/manual-production-deploy.test.mjs`. | `test:manual-production-deploy` passes. |
| Pilot observation records used a non-UUID string as a readiness snapshot ID. Reading those records could query a UUID column with the placeholder and return a server error. | Observation-only governance now stores `readinessSnapshotId: null`; the application decision type and recording test reflect this. The decision route already skips snapshot lookup for a non-string ID. | `test:decision-adapter-recording-flag`, typecheck, unit suite, and build pass. |

## Local verification

- `pnpm.cmd typecheck`: passed.
- `pnpm.cmd test:unit`: passed, including mobility governance, decision recording, deployment-policy, application-preparation, environment-boundary, and AI-quality tests.
- `pnpm.cmd build:web`: passed; Next.js reported an Edge Runtime deprecation warning, not a build failure. The sandboxed attempt failed before compilation because it could not read a pnpm dependency; the build passed with normal filesystem access.
- `pnpm.cmd test:real-vacancy-evaluation`: passed on two examples. Two examples do **not** establish tech-role quality or market fitness.

## Gates that this does not close

| Gate | Current evidence boundary | Required proof |
| --- | --- | --- |
| Tech-candidate usefulness and trust | Automated tests and two vacancy examples do not represent user outcomes. | Founder-led end-to-end sessions with at least 3–5 target candidates; record comprehension, disagreement, corrections, and changed application decisions. |
| Paid demand | Code and checkout configuration tests do not demonstrate willingness to pay. | Real offer/price tests and observed conversions or explicit refusals. |
| Live integrations | No live Stripe checkout/webhook, Resend delivery, or Sentry event/alert was verified in this checkpoint. | Timestamped production or test-mode receipts for each complete path. |
| Mobility advice governance | Code gates do not substitute for current source review or qualified jurisdiction sign-off. | Dated source coverage, expert review, rule activation evidence, and fail-closed checks for each marketed claim. |
| Compliance and data operations | This checkpoint did not verify ICO status, deletion cascades, retention, or backup recovery in production. | Owner/compliance evidence plus executed data-lifecycle and recovery checks. |
| Extension distribution | Unit tests do not prove installed-extension or Chrome Web Store behavior. | Manual installed-browser journey and store-policy review. |
| Production parity | Local build and tests do not prove the deployed version or its environment. | Manual, commit-pinned deployment followed by production smoke and monitored pilot journeys, when release is authorized. |

The older [public-launch checklist](../reference/testing/public-launch-gate-checklist.md) and [roadmap status](../reference/roadmap-execution-status.md) describe related open gates; their external statuses need fresh owner evidence before being marked complete. The [tech-system validation plan](../reference/landwell-tech-system-validation-plan.md) defines the pilot protocol.

## Operating rule

Freeze speculative feature expansion for the pilot. Classify each new finding as: **pilot blocker**, **measured user-value gap**, **governance/compliance gate**, or **later improvement**. Fix blockers; test value gaps against users; do not convert unobserved ideas into a zero-backlog completion claim.
