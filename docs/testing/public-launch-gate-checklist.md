# Public Launch Gate Checklist

Last updated: 2026-05-24

This checklist decides whether AutoTime EU Apply can move beyond founder-led
private beta. Passing internal technical checks is not enough for public launch.

| Gate | Status | Evidence | Launch impact |
| --- | --- | --- | --- |
| Build passes | Complete | Previous `pnpm build` passed after Windows EPERM rerun | Required |
| Web build passes | Complete | Previous `pnpm build:web` passed after Windows EPERM rerun | Required |
| Browser E2E passes | Complete | `pnpm test:e2e` passed 9/9 | Required |
| Sentry privacy tests pass | Complete | `pnpm test:web:sentry-privacy` passed | Required |
| Production smoke passes | Complete | `pnpm smoke:web` passed on 2026-05-24 | Required |
| Sentry live dashboard spot-check passes | Pending Manual Evidence | Sentry dashboard/insights are accessible, but live production event verification remains pending until an actual AutoTime EU Apply issue is opened and checked for environment, breadcrumbs, replay, stack trace, and sensitive data. `/api/sentry-test` is currently re-protected with live HTTP 404 evidence. | Blocks public launch |
| UAT completed with 3-5 users | Pending | No real UAT log/signoff yet | Blocks public launch |
| Outcome usefulness/trust validated | Pending | No real-user outcome summary yet | Blocks public launch |
| Compliance disclaimers verified | Complete for beta | Existing app copy/docs | Required |
| No critical bugs open | Partial | Internal test suite passes; UAT pending | Blocks if UAT finds critical bugs |
| No sensitive data leakage | Complete for beta | Privacy redaction test passed | Required |
| Feedback loop working | Ready, not completed | UAT docs/templates exist | Required |
| Product copy updated | Complete for beta | Private beta/public launch disclaimers present | Required |
| Beta limitations clear | Complete for beta | Private Beta v1 wording present | Required |
| No false promises | Complete for beta | No job/interview/visa/sponsorship guarantee wording present | Required |
| Launch decision recorded | Pending | Must be updated after UAT and Sentry live check | Required |

## Launch Decision

Current status: Not Ready for public launch.

Private Beta v1 remains founder-led early-user ready with browser E2E and
production smoke verified. Full beta validation remains pending until Sentry
live dashboard verification, founder-led UAT, and outcome usefulness/trust
validation are completed with real evidence.
