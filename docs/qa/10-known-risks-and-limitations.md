# Known Risks and Limitations

## Limitations of this assessment itself

1. **No production access of any kind** (Supabase, Vercel, Stripe
   dashboard, Checkly, Sentry). Every finding requiring live
   production state is BLOCKED, not failed — see
   `docs/qa/07-production-verification-checklist.md`.
2. **This local test environment has no Supabase configuration**,
   which caused 8 of 127 local Playwright specs to fail on the app's
   own configuration-error boundary rather than exercising real
   behaviour (`DEF-001`). Their true pass/fail status is genuinely
   unknown, not assumed either way.
3. **Local Lighthouse tooling crashed** on a Windows-specific
   temp-directory permission issue (`DEF-002`); scheduled Linux CI
   was used instead for real evidence, which is how `DEF-003` (the
   dashboard performance regression) was actually found.
4. **This is a single assessment pass in one session**, not a
   sustained QA program. 51 of 95 catalogued test cases remain
   unexecuted, each with a specific, documented reason — not silently
   dropped.
5. **No independent, professional penetration test** — self-classified
   throughout as founder-led/automated, per the assessment's own rules.
6. **Only one production QA test account exists**, limiting live
   cross-user isolation evidence to the code/API layer rather than a
   real two-account production run (code-layer evidence is real and
   substantial — 6 of 10 RLS cases pass with concrete evidence — but
   is not a full substitute).

## Product-level known risks (carried from `docs/release/risk-register.csv`)

The full register has 11 risks with owner/mitigation/target-date
fields; the highest-priority ones:

- **RISK-001/002/003**: deployed-SHA match, migration-applied status,
  and production config are all unverified — the three gates blocking
  a real release decision most directly.
- **RISK-007**: the dashboard performance regression (DEF-003) — real,
  reproducible, not yet root-caused, discovered by this assessment.
- **RISK-010**: backup/restore/rollback have never been demonstrated.
- **RISK-004**: no independent penetration test exists — accepted as
  proportionate for a small invite-only beta per the assessment's own
  criteria, not for anything beyond that.

## Pre-existing, previously documented risks (not new, re-confirmed this pass)

- CSP allows `unsafe-inline`; no COEP header — deliberate deferral from
  an earlier assessment (`docs/quality-assurance.md` #99), re-confirmed
  via this pass's ZAP retrieval, not newly discovered.
- `scripts/mvp-test-coverage.mjs`'s coverage percentage is
  hand-tuned constants, not derived from real test execution — a
  pre-existing, previously documented gap in the CI "gate" tooling
  itself, not re-litigated in depth this pass.
- Extension-facing documentation drift regarding a removed Chrome side
  panel — previously flagged and corrected in the docs; this pass
  independently re-confirmed the manifest has no `sidePanel`
  permission (EXT-007, PASS).
- `GET /api/account/export`'s silent per-table error-swallow — latent,
  not currently active, previously documented, not re-tested this pass
  (`PRIV-002` remains NOT RUN).

## What this assessment explicitly did NOT assess

- Legal review of privacy/terms documents (explicitly out of scope —
  these remain drafts per the assessment brief's own known concerns).
- Infrastructure-level security (Vercel/Supabase platform hardening).
- Real-money payment flows, real email delivery, real AI-provider
  charges beyond what's already mocked/code-verified.
- Browser compatibility beyond Chromium (no Firefox/WebKit/Safari/mobile-device access).
- Load/stress testing beyond the existing public-page-only k6 smoke script.
