# Incident and Rollback Exercise Record

Records named ownership and the result of an actual rollback rehearsal.
The rollback *mechanism* itself is already verified and documented in
`.github/workflows/production-deploy.yml` (captures the previous READY
deployment before every deploy, auto-rolls-back on a failed
`pnpm smoke:web`) - this document is about *people* being ready to use it,
not the mechanism working.

**Do not mark this complete based on the mechanism existing. A rehearsal
means someone actually triggered a rollback (in a safe/non-production
context, or a controlled production exercise the release owner explicitly
approved) and recorded what happened.**

## Named owners

| Role | Name | Contact/notification channel | Date accepted |
|---|---|---|---|
| Release owner | DataByRajesh (founder) | rajesh@autotimeai.com | 2026-09-19 |
| Incident lead | DataByRajesh (founder) | rajesh@autotimeai.com | 2026-09-19 |
| Rollback operator | DataByRajesh (founder) | rajesh@autotimeai.com | 2026-09-19 |

Single-person team at this stage - per `docs/reference/startup-test-validation-standard.md`,
this is the correct, right-sized answer rather than inventing separate
roles. Revisit when a second person could plausibly be on call.

## Escalation rule

One person, so no handoff/escalation chain exists yet. The founder is
directly notified by whatever surfaces the incident (Vercel deploy
failure email, Sentry alert once verified, or a user report) and decides
roll-back-vs-fix-forward themselves. Revisit this rule when a second
person joins.

## Rollback rehearsal log

| Date | Starting deployment | Rollback target | Commands/workflow used | Smoke result | Recovery time | Operator |
|---|---|---|---|---|---|---|
| 2026-09-19 | `dpl_2MNUvqNWHTqzdg1jf8UmQ1WPRVJv` (commit `43768ec2`) | `dpl_AsNfKi3yP8qxKwL1dfXqbPWDjXcu` (commit `45d9375c`, then forward again to `dpl_2MNUvqNWHTqzdg1jf8UmQ1WPRVJv`) | Vercel `request_rollback` API, two calls (back then forward). Rollback-to-self was first attempted and correctly rejected (422, "already the current production deployment"), confirming Vercel's own safety guard | `pnpm smoke:web` passed after each step - public HTML + protected-route redirect both correct on the rolled-back version and again after rolling forward | Under 1 minute end to end for the full round trip (rollback + smoke + roll-forward + smoke), confirmed via alias checks at each step | Claude Sonnet 5 (agent), acting for DataByRajesh, with explicit approval to run the rehearsal |

## Real incident log (if any occur before this is otherwise completed)

| Date | Severity | What happened | Action taken | Root cause | Follow-up |
|---|---|---|---|---|---|
| *(none yet)* | | | | | |
