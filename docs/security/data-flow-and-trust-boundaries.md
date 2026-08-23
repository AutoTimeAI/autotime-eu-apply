# Data Flow and Trust Boundaries

Derived from `docs/architecture/verified-system-architecture.md`.
Describes where trust changes hands, which is where security testing
in `docs/security/penetration-test-plan.md` concentrates.

## Trust boundaries

### 1. Browser extension ↔ third-party job sites (untrusted → semi-trusted)

The extension's content script (`entrypoints/autotime.content.ts`)
reads DOM content from Stepstone/Indeed/EURES/EuroTechJobs/Xing/WTTJ
pages the extension has host permission for. This is **untrusted
input** — a malicious or malformed page could feed the extraction
logic adversarial content. This session's PR #166 fixed a real
substring-bypass bug in phone-field detection at exactly this
boundary. `EXT-###` cases target this boundary specifically (malformed
DOM, unsupported sites).

### 2. Extension ↔ web dashboard (semi-trusted → trusted, via `externally_connectable`)

The extension messages the production app domain directly
(`externally_connectable` in the manifest). Message origin and
payload validation at this boundary is the extension's
responsibility — `EXT-###` cases include message-origin and
payload-validation checks per the assessment brief §7.8.

### 3. Browser ↔ Next.js API routes (untrusted → trusted, no shared middleware)

Every one of the 52 `app/api/*/route.ts` files is independently
responsible for its own authentication and authorization, since there
is no `middleware.ts`. This is the single highest-value place to
concentrate `AUTH-###`/`SEC-###` review — an inconsistency in even one
route is a real vulnerability, not a false positive, precisely
because there's no shared enforcement layer to fall back on. This
session's PR #172 (open redirect via tab-character URL-parser bypass
on login) and PR #154 (admin login redirect-target discarding) both
originated at exactly this kind of per-route inconsistency.

### 4. API routes ↔ Supabase (trusted app → trusted data layer, RLS-enforced)

Most reads/writes go through the service-role client
(`createAdminClient()`), which **bypasses RLS by design** — meaning
row-level ownership checks that would normally be enforced by
Postgres must instead be enforced explicitly in application code
before every service-role query. This is architecturally the
**highest-risk trust boundary in the system**: a missed ownership
check here is a direct cross-user data leak, not a defense-in-depth
gap. This session fixed several real instances of exactly this
(job/application/interview upsert ownership verification,
`outreach/route.ts`'s job-ownership check, PR #173's unchecked-write
error handling) — each with regression coverage in
`production-hardening.test.mjs`. `RLS-###` cases in
`05-master-test-plan.md` enumerate every service-role query site that
still needs this same audit.

### 5. API routes ↔ OpenAI (trusted app → external, cost-bearing, prompt-injection surface)

User-controlled text (job descriptions, CV content, profile fields)
flows into AI prompts. `role-intelligence-nvidia.test.mjs` confirms
an "untrusted-content guard" is sent and that injected instructions
stay in the user-message channel rather than the system channel — but
this is a mitigation, not a guarantee; `AI-###` prompt-injection cases
in Scenario 8 test it adversarially, not just structurally.

### 6. Cron/GitHub Actions ↔ Supabase Edge Functions (external trigger → data write)

`sync-eures`, `sync-job-sources`, `sync-job-alerts` are triggered by
GitHub Actions cron with a shared secret compared in constant time
(verified in `job-aggregation.test.mjs`). A leaked or guessable cron
secret would let an attacker trigger unlimited ingestion writes —
`ING-###` cases include missing/invalid-auth negative tests.

### 7. Stripe ↔ webhook endpoint (external, untrusted until signature-verified)

`app/api/stripe/webhook/route.ts` must verify Stripe's signature
before trusting any payload; idempotency is additionally enforced via
`20260821170000_stripe_webhook_idempotency.sql`. `PAY-###` cases
include invalid-signature, replay, and out-of-order event scenarios
(all test-mode).

### 8. Admin routes ↔ normal users (privilege boundary within the same app)

`admin_memberships` gates `/admin/*` and `/api/admin/*`. This
session's fixes (PR #154, #164, #168) closed real gaps in this
boundary (redirect-target discarding, feature-flag create-race,
readiness-badge vacuous-truth bug). `ADMIN-###` cases verify
fail-closed behaviour for every role combination the founder confirms
is actually implemented (see the open item in
`docs/qa/03-test-data-and-fixture-plan.md`).

## Data classification crossing these boundaries

| Data | Sensitivity | Boundaries crossed |
|---|---|---|
| CV/profile content | Personal, potentially special-category (employment history, sometimes health/disability context in accommodations) | Browser → API → OpenAI (3rd party) → Postgres |
| Email addresses | Personal | Browser → API → Postgres, Resend (3rd party) |
| Session cookies / QA bootstrap secret | Credential-equivalent | Must never appear in Sentry events, breadcrumbs, or logs — verified fixed this session (PR #169, extending the existing `sentry-privacy.ts` redaction to `diagnostics.ts`) |
| Stripe customer/payment metadata | Financial | API → Stripe (3rd party); app never stores card data directly (Stripe-hosted checkout assumed — to be confirmed in `PAY-###`) |
| Job listing content | Public (scraped from public job boards) | Edge functions → Postgres; lowest sensitivity, still subject to injection/XSS handling on render |

## Explicit non-goals of this document

This is a trust-boundary map for testing prioritisation, not a formal
threat model with STRIDE/DREAD scoring. `docs/security/attack-surface-register.csv`
enumerates the concrete testable surface derived from the boundaries
above.
