# Environment Strategy

AutoTime should run as one codebase with separate configuration per environment.
Do not keep a production-only setup while the product is still changing.

## Environments

Use three lanes:

| Lane | Purpose | Supabase | Stripe | URL |
|---|---|---|---|---|
| Local development | Daily build/test work | Dedicated dev project | Test mode | `http://127.0.0.1:3000` |
| Vercel Preview | Branch/PR verification | Dev or staging project | Test mode | Vercel preview URL |
| Vercel Production | Real customers and billing | Production project | Live mode | Production domain |

## Hard Rules

- Production data must live in a separate Supabase project from development.
- Production Stripe must use live keys and live price IDs only.
- Local and preview environments must use Stripe test mode only.
- `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `OPENAI_API_KEY`, and `RESEND_API_KEY` must only be stored as secrets.
- Never copy production secrets into `.env.local`.
- Apply Supabase migrations to dev first, then production after validation.
- Keep one application code path. Environment differences should come from env
  variables, provider dashboards, and database projects.

## Files

- `.env.example` lists the required variables without environment-specific
  assumptions.
- `.env.local.example` is the local development template.
- `.env.production.example` is the production secret checklist.

Real files such as `.env`, `.env.local`, and `.env.*.local` are ignored by Git.

## Supabase Setup

Use separate Supabase projects:

- `autotime-dev`
- `autotime-prod`

For each project:

1. Apply every migration in `supabase/migrations`.
2. Enable the OAuth providers you actually support.
3. Add auth redirect URLs for the matching app URL.
4. Keep the anon key public and the service-role key server-only.
5. Confirm RLS is enabled before enabling cloud sync for real users.

Production must include the billing lock migration:

```text
supabase/migrations/20260508100000_lock_billing_server_writes.sql
```

This keeps subscription and AI usage writes server-authoritative.

## Stripe Setup

Use Stripe test mode for local and preview:

- `pk_test_...`
- `sk_test_...`
- test `price_...` IDs
- local webhook secret from Stripe CLI or a test webhook endpoint

Use Stripe live mode for production:

- `pk_live_...`
- `sk_live_...`
- live `price_...` IDs
- production webhook secret from the live webhook endpoint

The production webhook endpoint should point to:

```text
https://autotime-eu-apply.vercel.app/api/stripe/webhook
```

Required events:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

## Release Flow

1. Develop locally with `.env.local`.
2. Run `SKIP_LIVE_SMOKE=1 pnpm test:mvp`.
3. Deploy to Vercel Preview with test-mode provider credentials.
4. Smoke-test the preview URL.
5. Apply migrations to production.
6. Deploy to Vercel Production with production credentials.
7. Run a live Stripe checkout with a real low-risk test purchase or Stripe live
   verification flow before opening billing to users.
