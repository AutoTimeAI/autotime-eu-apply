# Beta Waitlist Release Checklist

Last updated: 2026-09-19

Gates the first release of the beta-access waitlist feature (commit
`4e9307cd`): every signed-in, non-admin user whose `beta_access.status`
isn't `active` is redirected to `/waitlist` instead of the dashboard, with
a self-serve invite-code unlock. Follows the same gate format as
`public-launch-gate-checklist.md`.

| Gate | Status | Evidence | Release impact |
| --- | --- | --- | --- |
| Typecheck passes | Complete | `pnpm --filter web typecheck` clean, re-run 2026-09-19 | Required |
| Full unit suite passes | Complete | `pnpm test:unit` exit 0, re-run 2026-09-19 (includes the pre-existing suite plus the new `test:beta-waitlist-gate`) | Required |
| Beta-gate wiring test suite | Complete | New `scripts/beta-waitlist-gate.test.mjs`, 4/4 passing: gate bypass conditions (admin/test-auth), fail-closed lookup behaviour, suspended-account guard ordering in the redeem route, waitlist page not itself requiring beta-active status. Wired into `test:unit` as `test:beta-waitlist-gate` | Required |
| Migration applied | Complete | `20260919150000_beta_waitlist_grandfather.sql` applied directly to production; verified via query - all 6 existing users show `status: active`, 0 rows in any other status | Required |
| Production deploy | Complete | `4e9307cd` deployed via the manual production deployment workflow, run `35451115472`, green | Required |
| Live gate behaviour - dashboard | Complete | `GET /dashboard` unauthenticated returns `307` (redirect to login, unchanged prior behaviour preserved) | Required |
| Live gate behaviour - waitlist | Complete | `GET /waitlist` unauthenticated returns `307` (redirects to login rather than rendering for a signed-out visitor) | Required |
| Live gate behaviour - redeem route | Complete | `POST /api/beta/redeem-invite` unauthenticated returns `401`, not a crash or a same-origin bypass | Required |
| Existing users unaffected | Complete | All 6 pre-existing users grandfathered to `active` by the migration before the code deployed - confirmed via direct query, not just code review | Required |
| `BETA_INVITE_CODE` env var set | Complete | Automated attempt via the Vercel integration hit a real 403 (the connected token can't write production env vars); set manually by the founder as a Secret-type env var instead. Production redeployed afterward (`3eda6e0d`, run `35451863673`, green) specifically to guarantee the already-running instance picks up the new value rather than trusting an in-place refresh | Required |
| End-to-end human pass: new pending user sees waitlist | **Pending - needs a human** | Cannot be simulated without a real, non-grandfathered OAuth sign-in. Needs: sign in with a fresh Google/GitHub account, confirm landing on `/waitlist` (not `/dashboard`), confirm the waitlist message reads correctly with the real email address | Blocks confidence in the core user-facing flow |
| End-to-end human pass: invite code unlocks access | **Pending - needs a human**, and blocked on the env var above | Once `BETA_INVITE_CODE` is set: from the waitlist page, submit the correct code and confirm redirect to `/dashboard` with full access; submit an incorrect code and confirm a clear rejection message, not a crash | Blocks confidence in the self-serve path |
| End-to-end human pass: admin approve still works | **Pending - needs a human** | The existing admin beta-access route/RPC (`admin_change_beta_access`) needed no code changes, but hasn't been re-verified end-to-end against a *pending* (not just suspended) user since this gate went live - confirm an admin can flip a real pending user to `active` and that user then reaches `/dashboard` | Blocks confidence that admin-approval remains a working fallback to the invite code |
| Redirect-loop check | Complete (by code inspection + live checks above) | Traced the full path: `proxy.ts`'s onboarding redirect only touches `/dashboard/*` and is unaffected by beta status; a beta-pending user without a completed profile resolves in exactly 2 hops (`/dashboard` → `/dashboard/onboarding` → `/waitlist`), no loop possible | Required |
| Suspended-account bypass check | Complete (by code + test) | `redeem-invite` explicitly reads existing status first and refuses to touch a `suspended` row before ever reaching the upsert - a shared invite code can never be used to undo an admin-issued suspension | Required |
| "Beta" label visible | Complete (code), **visual pass pending** | Badge added next to the brand name in `DashboardShell`; not yet screenshotted/visually confirmed on a live authenticated session | Required for beta framing, not a functional blocker |
| Chrome extension review | Separate track, in progress | Resubmitted after the keyword-spam rejection was fixed; Chrome Web Store review pending as of this checklist - unrelated to this web-app gate but tracked here since both are part of "the beta release" | Independent - does not block this web-app gate |

## Release Decision

**Conditional GO.** The gate itself is live, tested, and verified safe by
every check that doesn't require a real human sign-in: nobody currently
using the product was locked out (grandfathering confirmed against real
data, not just code review), the gate fails closed rather than open on any
lookup error, a suspension can't be bypassed by the shared invite code, and
there's no redirect-loop risk.

`BETA_INVITE_CODE` is now set and the production instance redeployed to
guarantee it's picked up. What's actually missing before calling this beta
release fully verified is now down to three human passes, none of which
require further engineering:

1. Sign in with a genuinely new account and confirm landing on `/waitlist`
   (not `/dashboard`), with the message reading correctly.
2. From that waitlist page, redeem the real invite code and confirm
   redirect to `/dashboard` with full access; also try a wrong code and
   confirm a clear rejection, not a crash.
3. Confirm the admin manual-approval fallback (existing `beta_access`
   admin route) still flips a truly pending user to `active`.
