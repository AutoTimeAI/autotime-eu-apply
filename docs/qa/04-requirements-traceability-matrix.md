# Requirements Traceability Matrix

Top-level requirement areas this assessment tracks, each mapped to
its owning component(s), the test-ID prefix that will cover it in
`05-master-test-plan.md`/`test-cases.csv`, and current evidence
status. This is the index; the full per-case detail lives in
`test-cases.csv`/`test-cases.json` once Phase 2 completes.

| Req ID | Requirement | Component(s) | Test ID prefix | Current evidence | Status |
|---|---|---|---|---|---|
| REQ-AUTH-01 | Registration, login, logout, session lifecycle via Supabase Auth (OAuth only, no password) | `apps/web/lib/api-auth.ts`, `app/auth/callback/route.ts` | AUTH-### | `auth-error-messages.test.mjs`, `environment-boundaries.test.mjs` (39 focused tests incl. cookie/bearer auth paths) | Partially covered |
| REQ-AUTH-02 | Protected-route enforcement, no `middleware.ts` — per-route checks | Every `app/api/**/route.ts` calling `getRequestUser` | AUTH-### | Spot-checked this session (outreach, AI routes); not exhaustively catalogued | Gap — needs full route sweep |
| REQ-RLS-01 | Cross-user data isolation (jobs, applications, cover letters, outreach, interviews, profile, exports) enforced by Postgres RLS, not just app code | `supabase/migrations/*` (~20 files enable RLS), `job-workflow-repository.ts`, `interview-workflow-repository.ts`, `outreach/route.ts` | RLS-### | This session fixed and test-covered several ownership-verification gaps (job/application/interview upsert ownership checks in `production-hardening.test.mjs`) | Partially covered — code+API layer; no live production RLS exploit attempt yet |
| REQ-ADMIN-01 | Role-based admin access (Owner/Admin/Support/Analyst), fail-closed for non-admins | `admin_memberships` table, `apps/web/lib/admin-authorization.ts`, all `app/admin/*/page.tsx` | ADMIN-### | `admin-users-pagination.test.mjs`, `admin-foundation.test.mjs`, this session's PR #154/#164/#168 fixes (redirect preservation, page-level auth wrapper, feature-flag create-race lock) | Partially covered — role granularity unconfirmed, see open item in `03-test-data-and-fixture-plan.md` |
| REQ-AI-01 | Atomic AI-credit reserve/confirm/release/refund lifecycle, no double-charge | `feature-gate.ts`, `20260821160000_atomic_ai_call_reservation.sql`, all `ai/*` + `outreach` routes | AI-### | `production-hardening.test.mjs` (reserve-before-call, release-on-failure, finalize-before-DB-write ordering across all AI routes); PR #100 (this session's predecessor sprint) fixed a real billing-bypass race | Partially covered — no concurrency/replay test yet |
| REQ-AI-02 | Prompt-injection resistance, untrusted-content guard | `role-intelligence.ts`, `openai-server.ts` | AI-### | `role-intelligence-nvidia.test.mjs` (3 cases) | Partially covered — narrow scope, needs broader injection-payload set |
| REQ-AI-03 | Unsupported-claims / hallucination prevention | `job-application-workflow.ts` attestation gate | AI-### | `ai-quality-evaluation.test.mjs` (AI-004/AI-005) | Covered |
| REQ-PAY-01 | Stripe checkout/webhook idempotency, no duplicate fulfilment | `app/api/stripe/{checkout,webhook}/route.ts`, `20260821170000_stripe_webhook_idempotency.sql` | PAY-### | Migration exists; no structured test-case catalogue yet (G-11) | Gap |
| REQ-PRIV-01 | Export completeness/ownership | `app/api/account/export/route.ts` | PRIV-### | `account-export.test.mjs`; known gap logged in `docs/quality-assurance.md` (silent per-table error swallow, not currently active but latent) | Partially covered |
| REQ-PRIV-02 | Deletion scope/completion, including storage objects | `app/api/account/route.ts` | PRIV-### | `production-hardening.test.mjs` (profile-photo storage cleanup, PR #147) | Covered for the known case; no full-account deletion end-to-end trace |
| REQ-ING-01 | Cron authentication (constant-time secret compare), disabled-source graceful handling | `supabase/functions/{sync-eures,sync-job-sources,sync-job-alerts}` | ING-### | `job-aggregation.test.mjs` (constant-time compare check across all 3 functions, Personio XML cap, dedup-hash canonicalization from this session's PR #174) | Covered for auth+dedup; no live retry/partial-failure test |
| REQ-EXT-01 | Extension minimum permissions, message-origin validation, sync correctness | `apps/extension/*`, `manifest.json` | EXT-### | No dedicated per-file test suite (G-10); this session's PR #165/#166 fixed real bugs (stale-state clobber, phone-field substring bypass) with regression coverage in `production-hardening.test.mjs` | Gap — needs `run-tests.mjs` inspection |
| REQ-SEC-01 | OWASP Top 10 / API Top 10 coverage | Whole app | SEC-### | CodeQL (weekly+PR), ZAP passive baseline (weekly), dependency-review (PR) — all automated tier only; no manual pentest existed before this assessment | Gap — see `docs/security/penetration-test-plan.md` |
| REQ-A11Y-01 | WCAG-aligned accessibility on core journeys | Whole app | A11Y-### | axe wired into 11 Playwright specs | Partially covered — admin + extension widget untested |
| REQ-PERF-01 | Lighthouse budgets on public pages, controlled load behaviour | `/`, `/login`, dashboard | PERF-### | `lighthouserc.json` (public only), `k6/{smoke,load}.js` (public only) | Partially covered — no authenticated-dashboard Lighthouse history verified |
| REQ-REC-01 | Backup availability, restore/rollback demonstrated | Supabase project, Vercel deployment | REC-### | Narrative only in `docs/operations-runbook.md`; never demonstrated | Gap (G-06) |
| REQ-MON-01 | Sentry event redaction, alert routing | `sentry-privacy.ts`, `sentry-breadcrumbs.ts` | MON-### | `sentry-privacy.test.mjs` (9 cases incl. QA-secret-in-URL); alert-routing/Checkly deployment unverified | Partially covered |
| REQ-UAT-01 | End-to-end new-user journey (Scenario 1) | Whole app | UAT-### | `34-core-journeys.spec.ts` exists locally; production equivalent exists in `tests/e2e/production/` gated on `QA_SESSION_URL` | Partially covered — production run not yet executed this pass |

## Coverage summary (initial, pre-Phase-2)

- **Covered**: 2 of 17 requirement areas (REQ-AI-03, REQ-PRIV-02 for its known case)
- **Partially covered**: 11 of 17
- **Gap (no structured coverage yet)**: 4 of 17 (REQ-PAY-01, REQ-EXT-01, REQ-SEC-01, REQ-REC-01)

This matrix will be re-scored after Phase 2's `test-cases.csv` exists
and after Phase 3's execution evidence lands — "Partially covered"
here means real evidence exists but is not yet exhaustive, not that
it is fabricated or assumed.
