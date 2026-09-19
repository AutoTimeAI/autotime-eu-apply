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
| Release owner | *(pending)* | | |
| Incident lead | *(pending)* | | |
| Rollback operator | *(pending)* | | |

## Escalation rule

*(pending - define who gets notified, how fast, and who has authority to
decide "roll back" vs. "fix forward" for a live incident)*

## Rollback rehearsal log

| Date | Starting deployment | Rollback target | Commands/workflow used | Smoke result | Recovery time | Operator |
|---|---|---|---|---|---|---|
| *(none run yet)* | | | | | | |

## Real incident log (if any occur before this is otherwise completed)

| Date | Severity | What happened | Action taken | Root cause | Follow-up |
|---|---|---|---|---|---|
| *(none yet)* | | | | | |
