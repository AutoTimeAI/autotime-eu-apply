# Verified System Architecture

Companion to `README.md#product-architecture` (the existing brief
overview). This document exists because no dedicated architecture
record existed before this assessment (`docs/product-information-architecture.md`
covers product/UX information architecture, not system architecture).

Every item below is labelled with its verification status:

- **Verified** — confirmed by reading the actual source/config in this repo.
- **Inferred** — a reasonable conclusion from naming/structure, not directly confirmed.
- **Planned/aspirational** — referenced in docs but not confirmed to exist in code.
- **Disabled** — exists in code but intentionally not active.
- **Externally configured** — depends on a provider dashboard this assessment has no access to.
- **Unverified production component** — code exists; whether it's actually deployed/active in production is unconfirmed.

## Components

| Component | Description | Status |
|---|---|---|
| `apps/web` | Next.js 16.3.1 application — dashboard, marketing pages, all API routes | Verified |
| `apps/extension` | Browser extension, built with WXT, manifest v3 | Verified |
| `apps/analytics` | Python FastAPI service (`main.py`, `pyproject.toml`; deps: fastapi, pydantic), routed under `/analytics` via `vercel.json`'s `experimentalServices` | Verified to exist; runtime behaviour not inspected in this pass |
| `packages/shared` | Shared workspace package | Verified to exist; contents not inventoried in this pass |
| Supabase Postgres + Auth | Primary datastore and identity provider | Verified via 40 migration files and `lib/api-auth.ts`/`lib/supabase/*` usage |
| Supabase Edge Functions | `sync-eures`, `sync-job-alerts`, `sync-job-sources` (Deno) | Verified |
| OpenAI (or compatible) | AI generation provider | Verified via `lib/openai-server.ts`; specific provider/model not re-confirmed this pass |
| Stripe | Billing | Verified via `lib/stripe.ts` + 3 API routes |
| Resend | Transactional email | Verified via `lib/email.ts` |
| Sentry | Error monitoring, with a custom redaction pipeline | Verified via `lib/sentry-privacy.ts`, `lib/sentry-breadcrumbs.ts`, and this session's PR #169 (diagnostics logger reuse) |
| PostHog | Product analytics | Verified via `lib/analytics.ts`; whether it's actually enabled in production is unverified from here |
| Checkly | Uptime/synthetic monitoring | `checkly.config.ts` + `__checks__/` exist in the repo; **deployment status is unverified** — this is a known, previously-documented risk (Checkly may be configured but not deployed) |
| Vercel | Deployment platform | Inferred from `vercel.json` and the production URL; no dashboard access this pass |
| GitHub Actions | CI/CD, 16 workflow files | Verified (see `docs/qa/00-current-test-inventory.md` §6 for the security-relevant subset) |

## API surface (apps/web/app/api)

52 `route.ts` files across 17 top-level directories: `account/`,
`admin/`, `ai/`, `analytics/`, `compatibility/`, `cv/`, `diagnostics/`,
`esco/`, `og/`, `operations/`, `outreach/`, `profile/`, `qa/`,
`role-pathways/`, `sentry-test/`, `stripe/`, `sync/`. Auth is
per-route via `apps/web/lib/api-auth.ts`'s `getCookieUser` /
`getBearerUser` / `getRequestUser` — **there is no `middleware.ts`**
anywhere under `apps/web`, so route-level auth enforcement cannot be
assumed to be uniform; it must be (and partly has been, this session)
verified route-by-route. This is recorded as an explicit attack-surface
item, not assumed safe by convention.

## Data layer

- 40 files under `supabase/migrations/`, spanning 2026-05-06 through
  2026-08-23. ~20 of them enable Row Level Security (`enable row level
  security` / `row level security` appears in that many files).
- Notable recent migrations (this session's fix sprint): AI-credit
  atomicity (`20260821160000_atomic_ai_call_reservation.sql`), Stripe
  webhook idempotency (`20260821170000_stripe_webhook_idempotency.sql`),
  job-workflow soft-delete (`20260822120000_job_workflow_soft_delete.sql`),
  admin feature-flag create-race lock (`20260823100000_admin_feature_flag_create_lock.sql`).
- Full migration inventory with production-applied status is tracked
  separately in `docs/database/migration-register.csv` — **production
  application status is unverified** (this assessment has no
  production database access).

## AI-credit lifecycle (architecturally significant, high release risk)

`lib/feature-gate.ts` implements reserve → confirm/finalize →
release/refund, backed by `20260821160000_atomic_ai_call_reservation.sql`.
Every route under `app/api/ai/*` plus `outreach/route.ts` follows the
pattern: reserve before the provider call, release only if the
provider call itself fails, finalize (charge) before any subsequent
DB write — verified in `production-hardening.test.mjs` across
multiple routes, including a fix landed this session (PR #167:
outreach previously refunded credits on a post-success DB failure,
which would have double-serviced a paid-for generation).

## Admin authorization model

Database-driven via an `admin_memberships` table, not an env variable
or hardcoded email list (verified from the architecture agent's
findings and this session's PR #154/#164/#168 fixes). Every admin
page must route through `requireAdminPageAccess` — a wrapper
enforced by `production-hardening.test.mjs`'s
"every admin page catches its own authorization failure" test, added
this session, which asserts no admin page calls the lower-level
`requireAdminPrincipal` directly (a pattern that previously let an
authorization failure escape to the generic error boundary instead of
redirecting).

## Extension architecture

WXT-based, manifest v3. Permissions: `activeTab`, `scripting`,
`storage`, plus host permissions for Stepstone, Indeed, EURES,
EuroTechJobs, Xing, Welcome to the Jungle, and the production app
domain (also listed in `externally_connectable`). The
`apps/extension/sidepanel/` directory still exists with substantial
React code, but is **confirmed not a live Chrome side panel** — no
`sidePanel` permission or `side_panel` manifest key exists in the
built `.output/chrome-mv3/manifest.json`. This was flagged as
doc-drift in an earlier QA pass (`docs/quality-assurance.md`
#106/#108) and is now accurately documented there; the directory name
itself remains legacy/misleading and is noted here for anyone
navigating the code fresh.

## What this document does not cover

- Runtime behaviour of `apps/analytics` (not inspected this pass).
- `packages/shared`'s actual contents (not inventoried this pass).
- Real production topology (Vercel regions, Supabase project tier,
  connection pooling) — none of this is visible from a source-code
  checkout; flagged for founder input if release-relevant.

See `docs/security/data-flow-and-trust-boundaries.md` for the
trust-boundary view of this same architecture, and
`docs/security/attack-surface-register.csv` for the enumerated
attack surface derived from it.
