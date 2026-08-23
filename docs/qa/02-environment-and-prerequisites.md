# Environment and Prerequisites

This does not replace `docs/environment-strategy.md` (the canonical
three-lane design: local / Vercel Preview / Vercel Production, each
with its own Supabase project and Stripe mode) or `docs/qa-test-account.md`
(the production QA-session bootstrap mechanism). It records what this
assessment can and cannot verify about those lanes from this seat, and
what is required before each test tier can run.

## Environments in scope for this assessment

| Lane | Can this assessment reach it? | How |
|---|---|---|
| Local development | Yes | Repo checkout, `pnpm install`, local `.env.local` if the founder provides one; otherwise mocked/test-mode paths only. |
| Vercel Preview | No | No preview deployment URL or credentials provided. |
| Vercel Production | Read-only, partial | Public pages reachable directly; authenticated journeys only via the QA bootstrap mechanism if `QA_SESSION_URL` is supplied; no dashboard/database access. |

## What is verified vs assumed about the environment split

- **Verified from the repo**: `.env.example`, `.env.local.example`,
  `.env.production.example` all exist and are structurally separated
  (see the architecture agent's category breakdown in
  `docs/architecture/verified-system-architecture.md`); the billing
  lock migration (`20260508100000_lock_billing_server_writes.sql`)
  and `docs/environment-strategy.md`'s hard rules exist in the repo.
- **Not verified from this seat**: whether a real `autotime-dev`
  Supabase project actually exists and is distinct from `autotime-prod`;
  whether production actually runs Stripe live keys vs test keys;
  whether every migration listed in `supabase/migrations/` has
  actually been applied to the production project. These require
  either founder-provided access or founder-run verification queries
  — tracked as G-04/G-05 in `01-gap-analysis.md`.

## Test accounts

| Account | Purpose | Isolation | Source |
|---|---|---|---|
| QA test account (`qa-test@autotimeai.com`) | Authenticated production smoke, browser-based/AI-agent testing | Normal user, no `admin_memberships` row, no password (magic-link bootstrap only), Stripe checkout hard-blocked (403), welcome email skipped | `docs/qa-test-account.md` |
| Local fixture auth (`AUTOTIME_TEST_AUTH_ENABLED`) | Local Playwright suite (26 specs under `tests/e2e/`) | Mocked, no real Supabase session | Existing test infra |

**Gap identified here (new, not in the original inventory)**: §7.3 of
the assessment brief requires **at least two isolated test users** for
cross-user data-isolation testing (User A attempting to access User
B's resources). Only **one** production QA account exists today. Two
isolated test users *do* exist in the local-fixture Playwright/unit
layer (several `production-hardening.test.mjs` and route-level tests
already construct two distinct `user_id`s to assert RLS/ownership
checks fail closed — see `RLS-###`/`AUTH-###` cases in
`05-master-test-plan.md`), so isolation is exercisable at the
code/API level without production access. A second production QA
account is a founder decision (create one via
`scripts/create-qa-test-account.mjs`, or accept that
cross-user-isolation evidence for this beta comes from the
code/API/local-fixture layer only, not a live production run).

## Prerequisites by test tier

| Tier | Requires | Status |
|---|---|---|
| Unit/integration/API (`pnpm test:unit`) | Node 24, pnpm 10.33.0, no external secrets (all mocked) | Ready — already run, `fail 0`. |
| Local Playwright (`test:e2e:core`, `test:e2e`) | `AUTOTIME_TEST_AUTH_ENABLED` local fixture auth, local dev server | Ready. |
| Production Playwright (`test:e2e:production`) | `QA_SESSION_URL` env var (contains the bootstrap secret) | **Blocked** unless the founder supplies it into this session's environment; specs skip cleanly, not fail, when absent. |
| Lighthouse (public) | Local build (`pnpm build:web`) | Ready. |
| Lighthouse (dashboard) | `QA_SESSION_URL` | Same as production Playwright. |
| k6 smoke/load | None (public pages only) | Ready, safe by construction. |
| k6 production | `workflow_dispatch` + typed confirmation | Not run without separate explicit authorisation. |
| ZAP baseline | None (already scheduled in CI) | Latest scheduled run's results retrieved via `gh run view`, not re-triggered. |
| Real Stripe/email/AI-charge tests | Founder authorisation per item | Not run without explicit go-ahead (§9 of the discovery response). |
| Production DB/migration verification | Supabase read access or founder-run queries | Blocked (G-04). |

## Commands this assessment will run (safe tier only)

Recorded live in `docs/qa/command-execution-register.csv` as each is
executed, per the assessment's evidence-management rules:

```
pnpm install
pnpm --filter web typecheck
pnpm --filter extension typecheck
pnpm test:unit
pnpm test:e2e:core
pnpm build:web
pnpm test:lighthouse
node k6 smoke (if a k6 binary is available; else documented as a gap)
gh run list / gh run view   (retrieve latest CodeQL/dependency-review/ZAP results)
```

Commands **not** run without explicit founder confirmation:
`test:e2e:production`, `test:lighthouse:dashboard`, `k6-manual.yml`
dispatch, any real Stripe/Resend/OpenAI live call, any Supabase
production write.
