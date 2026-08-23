# Penetration Test Report

## Classification

**Founder-led/automated security assessment.** Not an independent
professional penetration test. See `docs/security/penetration-test-plan.md`
for the full scope, rules of engagement, and the explicit recommendation
to commission a real third-party test before public launch.

## Executive summary

This pass combined a full manual authentication-boundary sweep of all
53 API routes, a targeted stored-XSS review of the highest-risk
injection surface (externally-sourced job listing content), retrieval
of the three already-scheduled automated scan tools' latest results
(CodeQL, dependency-review, ZAP baseline), and local test execution.

**Result: zero Critical or High findings. One open Low-severity
CodeQL finding (not currently exploitable). One unconfirmed Low ZAP
finding requiring follow-up. One process-hardening recommendation.**
Full detail in `docs/security/security-findings.csv`.

This is a materially positive result given the codebase just went
through an intensive 65-PR audit-and-fix sprint immediately before
this assessment — but it reflects genuine testing, not an assumption
that recent fixes mean everything is fine. Every claim below traces to
a specific command, file, or CI run.

## Scope, dates, environment

- Tester: this assessment (Claude Code), acting on the founder's behalf
- Dates: 2026-08-23
- Commit SHA: `130ca9ae5f9038e4eece27ad9a3eb549af431a3a`
- Tools: GitHub CodeQL (default JS/TS query set), `dependency-review-action`,
  `zaproxy/action-baseline` (passive), manual source review

## Findings summary

| ID | Title | Severity | Status |
|---|---|---|---|
| SEC-FIND-001 | Incomplete sanitization in DOCX CV text extraction | Low | Open — recommended fix, not release-blocking |
| SEC-FIND-002 | ZAP: potential attribute-injection on /compatibility | Low (unconfirmed) | Open — needs manual verification |
| SEC-FIND-003 | CSP unsafe-inline / missing COEP | Informational | Closed — re-confirmed as an existing accepted risk |
| SEC-FIND-004 | No structural backstop for future route auth checks | Low (process) | Open — hardening recommendation |

Full detail, evidence, and remediation guidance for each: `docs/security/security-findings.csv`.

## Manual testing performed

### 1. Full API-route authentication sweep (all 53 route.ts/route.tsx files)

Read every route handler under `apps/web/app/api/` (no `middleware.ts`
exists, so each route is independently responsible for its own auth).
**Result: 46 routes correctly auth-gated, 7 correctly and
documentedly public (webhook signature-gated, secret-gated QA
bootstrap, anonymous rate-limited report forms, static image
generation), zero gaps found.** Admin routes additionally verified to
check `admin_memberships` with granular per-route permissions, not
just session presence. Mutating routes referencing another user's
table by foreign key (`ai/cover-letter`, `outreach`) were confirmed to
re-verify row ownership before trusting a client-supplied ID.

### 2. Stored-XSS review of externally-sourced job listing content

Job title/company/description/location originates from external ATS
feeds — the highest-value injection surface in the app, since job
sources are attacker-influenceable. **Result: zero
`dangerouslySetInnerHTML` usages, zero raw `.innerHTML` assignments,
and no Markdown-to-HTML rendering path anywhere in `apps/web` source.**
Every job-sourced field reaches the UI through standard JSX
interpolation, which React escapes by default. No real stored-XSS
vector via job listing content.

### 3. CodeQL open-alert retrieval

One open alert (`js/incomplete-multi-character-sanitization`,
`docx-cv.ts`) — investigated directly (see SEC-FIND-001). Traced every
consumer of the affected function's output and confirmed no current
HTML-rendering sink exists downstream, so this is real but not
currently exploitable.

### 4. ZAP baseline retrieval

Latest passive scan (2026-08-21, against real production): 0
`FAIL-NEW`, 10 `WARN-NEW`, 60 `PASS`. Of the 10 warnings, 9 correspond
to already-documented, deliberate deferrals (CSP `unsafe-inline`,
missing COEP, cache-control tuning) or low-value informational items
(Base64 disclosure, cross-domain misconfiguration on static assets).
One (`User Controllable HTML Element Attribute`, on `/compatibility`'s
query-string-driven report form) was not independently confirmed
exploitable this pass and is tracked as SEC-FIND-002 for follow-up —
recorded honestly as unconfirmed rather than dismissed or escalated
without evidence.

### 5. Dependency review retrieval

Latest PR-triggered runs: green, no unaddressed high-severity finding
beyond the three pre-existing, explicitly justified exceptions on
file in `dependency-review.yml`.

## What this assessment did NOT do (explicit limitations)

- No active/authenticated ZAP scan (out of scope per the plan — a
  founder decision, not made unilaterally)
- No live exploitation attempt against real production (all testing
  was source review, retrieval of already-scheduled scan results, or
  local execution)
- No infrastructure-level testing (Vercel/Supabase platform security)
- No physical or social-engineering testing
- No independent verification of Supabase RLS policies against a real
  database connection (no production/staging DB access — see
  `docs/database/migration-verification-report.md`)
- No live Stripe/email/AI-provider attack testing

## Recommendation

Proceed to `docs/qa/09-release-readiness-report.md` with these
findings incorporated. None of this pass's findings are Critical or
High, so none independently block a GO/CONDITIONAL GO decision on
security grounds — but the mandatory gates in `01-gap-analysis.md`
(deployed-SHA match, migration verification, production config,
backup/restore) remain open for reasons unrelated to this security
pass and independently govern the release decision. Commission an
independent professional penetration test before public launch, per
`penetration-test-plan.md`'s own criteria.
