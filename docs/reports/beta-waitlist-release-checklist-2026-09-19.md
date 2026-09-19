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
| End-to-end live test: new pending user sees waitlist | **Complete - verified live** | Used the existing QA session-bootstrap endpoint (`/api/qa/session`, real Supabase session for `qa-test@autotimeai.com`, not the synthetic test-auth bypass) against real production. Set that account's `beta_access` to `pending`, visited `/dashboard`, landed on `/waitlist` (200, page text confirmed to contain the waitlist message). Screenshotted | Resolved |
| End-to-end live test: invite code unlocks access | **Complete - verified live** | From the same live session: submitted a wrong code → `400`, clear rejection message, no crash. Submitted the real code → `200`, `{"activated":true}`. Immediately revisited `/dashboard` → `200`, no redirect back to waitlist. Screenshotted the resulting dashboard, including the real "Beta" nav badge | Resolved |
| End-to-end live test: admin approve/suspend still works | **Complete - verified live, found and fixed a real bug** | Called `admin_change_beta_access` directly against the real (already-existing) `beta_access` row for the QA account - this **failed** with a genuine production error (`42702: column reference "user_id" is ambiguous`). See the new row below | Resolved (after fix) |
| **Real bug found: `admin_change_beta_access` broken for any existing row** | **Fixed** | The RPC's own `RETURNS TABLE(user_id uuid, status text, updated_at timestamptz)` creates implicit PL/pgSQL variables colliding with `beta_access`'s own column names, breaking `on conflict (user_id)` - which only fires when a row already exists. A brand-new user's first-ever grant (plain INSERT) never hit this, which is exactly why it went undetected until the admin-approve-an-existing-pending-user path was actually exercised live. **This meant the admin manual-approval fallback - the entire backstop for anyone without an invite code - was silently broken in production before this fix.** Fixed with `#variable_conflict use_column` (`20260919160000_fix_beta_access_variable_conflict.sql`), applied directly to production and re-verified live: both the approve and suspend branches now succeed against an existing row. New regression test added (`test:beta-waitlist-gate`, now 5/5) | Required - was release-blocking until found |
| Redirect-loop check | Complete (by code inspection + live checks above) | Traced the full path: `proxy.ts`'s onboarding redirect only touches `/dashboard/*` and is unaffected by beta status; a beta-pending user without a completed profile resolves in exactly 2 hops (`/dashboard` → `/dashboard/onboarding` → `/waitlist`), no loop possible | Required |
| Suspended-account bypass check | Complete (by code + test) | `redeem-invite` explicitly reads existing status first and refuses to touch a `suspended` row before ever reaching the upsert - a shared invite code can never be used to undo an admin-issued suspension | Required |
| "Beta" label visible | **Complete - verified live** | Confirmed in the live dashboard screenshot from the invite-code test above: renders correctly next to the brand name with good contrast | Resolved |
| Eyebrow text contrast on the auth/waitlist hero | **Found and fixed** | The initial live waitlist screenshot showed the "AutoTime EU Apply · Beta" eyebrow text nearly invisible against the dark navy `.auth-intro` background - a pre-existing bug also live on the real `/login` page (same shared markup), only surfaced now because this was the first time that section got screenshotted. Fixed by adding the same per-context eyebrow color override every other dark-background hero section in `globals.css` already had. Re-screenshotted post-fix and confirmed legible | Resolved |
| Chrome extension review | Separate track, in progress | Resubmitted after the keyword-spam rejection was fixed; Chrome Web Store review pending as of this checklist - unrelated to this web-app gate but tracked here since both are part of "the beta release" | Independent - does not block this web-app gate |

## Release Decision

**GO.** Every gate is now genuinely verified, not just theoretically sound
- including the three items that explicitly required a live human-style
pass, which were completed via the existing QA session-bootstrap
mechanism rather than a real human clicking through (same real-session
guarantees, none of the manual effort).

This pass caught two real bugs that static review and the automated test
suite had both missed:

1. **`admin_change_beta_access` was broken for every existing row** - the
   entire admin manual-approval fallback silently didn't work in
   production until this was found and fixed. This was release-blocking
   and is now resolved and re-verified live.
2. **Invisible eyebrow text** on the shared auth-shell dark background,
   also live on the real `/login` page beforehand. Cosmetic, now fixed.

Nothing is pending. All fixes are deployed (final commit `a8904810`,
run `35453348911`, green) and the QA test account was restored to its
normal `active` state after every test.
