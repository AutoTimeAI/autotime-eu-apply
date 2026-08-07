# Environment Operations

AutoTime must treat configuration as an operational surface, not a project note.
Use this checklist before local smoke tests, preview checks and production deploys.

## Commands

- `pnpm env:doctor`: checks the current process environment.
- `pnpm env:doctor:local`: checks `apps/web/.env.local`.
- `pnpm env:doctor:production`: checks `.env.production` if you create one locally for a deployment dry run.

The doctor redacts values and fails on missing or placeholder-like values.

## Rules

1. Local development should use a dedicated Supabase development project.
2. Production secrets live in Vercel Production environment variables, not in committed files.
3. `AUTOTIME_TEST_AUTH_ENABLED` must never be true in production.
4. Admin access is not an env var: it's granted per-account via a row in
   the `admin_memberships` table. See `docs/admin-owner-bootstrap.md`.
5. Run `pnpm env:doctor:local` before local DB smoke tests.
6. Run `pnpm env:doctor` inside the deployed/runtime environment before trusting production checks.

## Required Production Variables

- `NEXT_PUBLIC_AUTOTIME_ENV`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `STRIPE_PRO_ANNUAL_PRICE_ID`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL`
