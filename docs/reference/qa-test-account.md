# QA Test Account

A dedicated, non-admin account for browser-based and AI-agent testing of the
live product, isolated from real user accounts and real founder credentials.

- Email: `qa-test@autotimeai.com`
- Role: normal user (not in `admin_memberships` - cannot access `/admin`)
- Marked as a test account via `auth.users.app_metadata.is_test_account = true`
  (service-role only; the user can never set or clear this themselves)
- Lives in the **production** Supabase project, same one the live URL uses
- Has **no password** - there is nothing to leak, guess, or rotate as a password

## How login works

The app only supports GitHub/Google OAuth - there is no password login form.
Instead of adding one, a locked-down server route mints a real session for
this one account:

```
GET https://autotime-eu-apply.vercel.app/api/qa/session?secret=<QA_SESSION_BOOTSTRAP_SECRET>
```

- The route checks the `secret` query param (or `x-qa-bootstrap-secret` header)
  against the `QA_SESSION_BOOTSTRAP_SECRET` env var using a timing-safe
  comparison. Any mismatch or missing config returns a plain 404.
- On success it looks up `QA_TEST_ACCOUNT_USER_ID`, re-confirms
  `app_metadata.is_test_account === true` on that exact user, generates a
  one-time Supabase magic-link token server-side, verifies it immediately
  or the same request (`apps/web/app/api/qa/session/route.ts`), and sets the
  normal Supabase session cookies - then redirects to `/dashboard`.
- Nothing is ever exposed to the browser except the final session cookies a
  logged-in user would normally have. The service-role key never leaves the
  server.
- Every use writes a best-effort row to `operational_logs`
  (`area: "qa"`, `code: "qa.session.bootstrap.used"`) for audit purposes.

Give an AI testing agent the URL above (with the real secret filled in) and
tell it to open that URL first; it will land on the dashboard already signed
in as the QA account.

## One-time setup

1. Generate a strong random secret (do this locally, do not paste it into any
   chat, ticket, or commit):
   ```
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```
2. Run the seed script against the **production** Supabase project, using the
   production `SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` from your own secret manager (never commit
   them, never paste them into a chat):
   ```
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-qa-test-account.mjs --yes
   ```
   Without `--yes` it only prints what it would do. The script is idempotent:
   re-running it resets this one account's seeded rows to a known state and
   never touches any other user's data.
3. Copy the `QA_TEST_ACCOUNT_USER_ID` the script prints, and set both of these
   in Vercel (Production environment):
   ```
   QA_SESSION_BOOTSTRAP_SECRET=<the secret from step 1>
   QA_TEST_ACCOUNT_USER_ID=<the id the script printed>
   ```
4. Redeploy (or wait for the next deploy) so the new env vars take effect.

## Resetting or rotating

- **Reset the seeded data** (applications, evidence, interview prep, etc.)
  back to the known baseline at any time by re-running step 2 above. It only
  ever deletes/inserts rows scoped to the QA account's own `user_id`.
- **Rotate access** by generating a new secret (step 1) and updating
  `QA_SESSION_BOOTSTRAP_SECRET` in Vercel. There is no password to reset -
  invalidating the old secret is equivalent to a password rotation, and it
  takes effect immediately with no user-facing change.
- **Revoke access entirely** by deleting `QA_SESSION_BOOTSTRAP_SECRET` from
  Vercel (the route 404s with no config) or by deleting the
  `qa-test@autotimeai.com` user from Supabase Auth (cascades and removes all
  seeded rows).

## What is safe to do with this account

- Browse the dashboard, profile, career direction/role pathways, jobs and job
  analysis, applications pipeline, interview preparation, and
  country/international-applicant features freely - all seeded data is fake.
- Edit the seeded profile, applications, and settings through the UI to
  explore empty/incomplete/blocked/completed states beyond what's pre-seeded
  (re-run the seed script to reset).
- Trigger AI drafting features (cover letter, CV tailoring, interview prep,
  outreach drafts). These make real, metered OpenAI calls billed to the
  production key, same as when the founder tests manually. If you want these
  hard-blocked for this account instead, say so and a guard can be added
  alongside the existing Stripe-checkout block below.

## What is blocked for this account

- **Billing/Stripe checkout**: `POST /api/stripe/checkout` returns 403 for
  this account (`apps/web/app/api/stripe/checkout/route.ts`). No real Stripe
  customer or charge can ever be created from it. The account's `pro` plan is
  a seeded database row, not a real subscription.
- **Real transactional email**: the welcome email that normally fires on
  first login is skipped for this account
  (`apps/web/app/auth/callback/route.ts`). It is not reachable through this
  account's normal login path anyway, since the session-bootstrap route
  never runs the first-login flow.
- **Real job submissions**: not applicable - the product does not
  auto-submit applications for any account; "applying" is always a manual
  step the user takes outside the product.
- **Admin access**: the account has no `admin_memberships` row, so `/admin`
  and every `/api/admin/*` route return 401/403 for it, identically to any
  other non-admin user.

## Data isolation

No new isolation mechanism was added or needed. Every table this account can
read or write already enforces `auth.uid() = user_id` Row Level Security,
identically for every authenticated user - the test-account flag does not
grant or bypass any RLS policy. `scripts/verify-qa-test-account.mjs` checks
this concretely: it confirms the account can read its own seeded profile row
and cannot read an arbitrary other `user_id`'s row.
