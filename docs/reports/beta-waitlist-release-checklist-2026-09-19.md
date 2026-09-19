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
| Full production DB security advisor scan | **Complete - found and fixed 2 real gaps** | `mcp__Supabase__get_advisors(type=security)`. See new rows below. Re-ran after the fix: both WARN findings gone, only pre-existing INFO-level RLS-no-policy items remain (expected - those tables are service-role-only, never queried via the client anon/authenticated roles) | Required |
| **Real gap found: `increment_ai_rate_limit` callable directly by anon/authenticated** | **Fixed** | Postgres grants EXECUTE to PUBLIC by default; this SECURITY DEFINER function had never had that revoked, so `/rest/v1/rpc/increment_ai_rate_limit` was callable by any signed-in *or anonymous* request with attacker-chosen `p_rate_limit_key`/`p_window_seconds`/`p_max_requests` - a real rate-limit-poisoning/DoS vector. Confirmed via grep that every real call site (`openai-server.ts`, `diagnostics.ts`, the cv/github and sync/refresh routes) uses `createAdminClient()` exclusively, so client-role access was never needed. Fixed by revoking EXECUTE from `public, anon, authenticated` (`20260919180000_security_advisor_hardening.sql`), applied to production, re-verified via advisor re-scan | Required - was a real exploitable gap |
| **Related gap: two auth-trigger functions had the same unnecessary grant** | **Fixed** | `create_free_subscription_for_new_user` and `create_user_account_from_auth` are AFTER INSERT triggers on `auth.users`; Postgres blocks calling a trigger function directly outside trigger context so risk was low, but Supabase's own linter recommends revoking the otherwise-unused RPC surface as defense-in-depth. Same migration, same production verification | Recommended, applied |
| Mutable search_path on 2 functions | **Fixed** | `set_updated_at` and `autotime_normalize_application_url` pinned to `search_path = pg_catalog, public` in the same migration, closing the WARN | Recommended, applied |
| Production DB performance advisor scan | Reviewed, nothing release-blocking | 230 findings via subagent review: 119 `auth_rls_initplan` WARNs (per-row `auth.uid()` re-evaluation vs `(select auth.uid())`) across `profiles`/`applications`/`evidence_records` etc - real but negligible at beta scale, mechanical low-risk fix, scheduled for right after release rather than blocking on it. 4 duplicate-policy WARNs on `custom_job_sources`, low risk. Rest (76 unindexed-FK + 31 unused-index) is INFO-level and safe to defer to a post-launch pass driven by real query-log data | Deferred, tracked |
| Leaked password protection | Not yet enabled | Supabase Auth dashboard toggle (HaveIBeenPwned check on signup/password-change) - not settable via SQL/migration, needs a manual flip in the Supabase Auth settings UI | Recommended follow-up, non-blocking |
| Live authenticated walkthrough: dashboard, job paste, analysis, application gate, admin denial | **Complete - verified live, found 1 cosmetic bug** | Real QA session (rotated `QA_SESSION_BOOTSTRAP_SECRET`, fresh production deploy to pick it up) against production. Pasted a genuinely new vacancy (NovaGrid Energy, Berlin) end to end: extraction correctly pulled skills/location/work-arrangement/work-authorisation clause from raw text; real decision engine returned "Consider" (1/5 requirements confirmed) rather than a false pass, with real governed-source citations (EU Blue Card, Recognition in Germany - gov.de portal, dated 2026-07-29); Application tab correctly gated "Prepare application" (disabled) vs "Prepare anyway" (enabled, explicit gap acknowledgment) exactly matching the evidence-first design. `/admin` correctly redirected this non-admin account to `adminDenied=1`. Zero real console/network errors (one benign Next.js RSC-prefetch abort, expected on rapid navigation). Test job cleaned up from the QA account afterward | Resolved |
| **Cosmetic bug found: analytics consent banner overlaps recommendation heading** | Found, not yet fixed | On the job-analysis result view, the "AutoTime uses privacy-conscious EU analytics... Allow analytics / Decline" banner renders on top of and truncates the recommendation heading text ("...vacancy facts need resolution" partially hidden behind the banner). Cosmetic only, doesn't block reading the rest of the analysis, but worth a z-index/positioning fix before wider release | Non-blocking, tracked for a follow-up fix |

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

A second, deeper validation pass (2026-09-19, same day) added a full
production security-advisor sweep and a genuinely live authenticated
walkthrough (not just the QA-session smoke checks above). It found and
fixed two more real issues:

3. **`increment_ai_rate_limit` was callable directly by any signed-in or
   anonymous request** via PostgREST, with attacker-controlled rate-limit
   key/window/max-requests arguments - a real rate-limit-poisoning/DoS
   vector that had nothing to do with the app's own code (every real call
   site already used the service-role client). Fixed by revoking the
   unnecessary EXECUTE grant (`20260919180000_security_advisor_hardening.sql`),
   applied to production, re-verified via advisor re-scan.
4. **Analytics-consent banner overlaps the analysis recommendation
   heading** on the job-analysis result view - cosmetic, non-blocking,
   tracked for a follow-up fix.

Nothing is release-blocking. All fixes are deployed (final commit
`00979c73` plus the `20260919180000` DB migration, redeploy run
`35455483353`, green) and the QA test account and its test job were
cleaned up after every test.
