# Repository structure and codebase inventory

**Measured:** 9 September 2026 at repository HEAD `1dbbc341`  
**Purpose:** Explain the module layout, configuration, generated evidence and logs in a startup-to-production form, and provide reproducible physical line counts.

## Executive finding

The repository has a valid monorepo shape, but the boundary between product source, deployment configuration, test infrastructure, generated evidence, historical reports and local scratch state is not immediately clear.

The production system contains **74,660 physical source lines**. The wider engineering codebase contains **99,218 physical lines** when tests, migrations, scripts and configuration are included. Documentation adds another **12,057 lines**.

The main structural concern is concentration rather than total size: the web application represents 78% of production source, and a few very large files create significant ownership and regression risk.

## Canonical repository map

```text
AutoTime-EU-Apply/
├── apps/
│   ├── web/                 Next.js product, API routes, emails and web tests
│   ├── extension/           Chrome/WXT extension, capture, autofill and local state
│   └── analytics/           Python/FastAPI evidence and outcome analytics
├── packages/
│   └── shared/              Cross-application schemas, types and domain logic
├── supabase/
│   ├── migrations/          Ordered database schema and security changes
│   ├── functions/           Scheduled/background Edge Functions
│   ├── cron/                Scheduled-operation definitions
│   ├── preflight/           Deployment safety checks
│   └── seeds/               Controlled seed data
├── tests/
│   ├── e2e/                 Playwright journey, production and visual tests
│   ├── fixtures/            Cross-system test fixtures
│   └── smoke/               Focused smoke checks
├── scripts/                 Release, validation, security and maintenance automation
├── k6/                      Load/performance checks
├── config/                  Shared operational configuration
├── .github/workflows/       CI, scheduled verification and release automation
├── docs/
│   ├── reference/           Living product and engineering specifications
│   ├── reports/             Point-in-time reviews and generated run evidence
│   ├── demo-video/          Demo artifacts
│   └── release-video/       Release communication assets
├── screenshots/             Manual and visual QA evidence
├── test-evidence/           Independent/manual verification artifacts
├── package.json             Workspace commands and dependency policy
├── pnpm-workspace.yaml      Monorepo membership
├── tsconfig.base.json       Shared TypeScript baseline
├── vercel.json              Hosting and scheduled-function configuration
└── README.md                Product, architecture and development entry point
```

## Runtime module ownership

| Module | Responsibility | Runtime/deployment | Data boundary | Primary operational risk |
| --- | --- | --- | --- | --- |
| `apps/web` | Public pages, authenticated product, API routes, AI orchestration, billing and admin | Vercel/Next.js | Supabase via authenticated/server clients; external AI/payment/email providers | Large coupled UI/controller files and broad external dependency surface |
| `apps/extension` | Page detection, job capture, reviewed autofill, local storage and account bridge | Chrome MV3/WXT | Browser-local/session storage plus authenticated web sync | ATS DOM drift, browser permissions, version skew and sync conflicts |
| `apps/analytics` | Evidence/outcome analytics API | Python/FastAPI service | Protected internal API boundary | Small module but separate deployment, secret and monitoring burden |
| `packages/shared` | Schemas, types, fit/workflow rules and platform coverage | Bundled into consumers | No independent persistence | Shared changes can affect web and extension simultaneously |
| `supabase/functions` | Scheduled feed/alert synchronization | Supabase Edge Functions | Service-role database access | Provider failure, source freshness, retries and idempotency |
| `supabase/migrations` | Schema, RLS, RPCs and data constraints | Ordered database deployment | Authoritative persistent model | Irreversible/data-impacting changes and environment drift |

## Web module structure

| Path | Role | CTO comment |
| --- | --- | --- |
| `apps/web/app` | App Router pages, layouts, public/legal pages and API routes | Route ownership is clear, but API policy must remain outside presentation code. |
| `apps/web/components` | Product workflows and reusable presentation | Contains the largest concentration of state and orchestration; split by domain. |
| `apps/web/lib` | Domain policy, persistence, provider clients, security and helpers | This should become the main use-case/domain layer rather than a generic utility bucket. |
| `apps/web/emails` | Transactional email templates | Keep versioned with triggering use cases and live-send verification. |
| `apps/web/tests` | Focused web and security tests | Valuable, but naming should distinguish unit, contract and integration scopes. |
| `apps/web/public` | Static assets and demos | Large/binary artifacts should be governed separately from application logic. |
| `apps/web/private-downloads` | Non-public download artifacts | Document retention, authorization and deployment behavior explicitly. |

Recommended domain decomposition:

```text
apps/web/
├── app/                     Routing and request adapters only
├── domains/
│   ├── evidence/
│   ├── roles/
│   ├── mobility/
│   ├── decisions/
│   ├── applications/
│   ├── interviews/
│   └── outreach/
├── platform/
│   ├── auth/
│   ├── billing/
│   ├── ai/
│   ├── telemetry/
│   └── persistence/
├── components/              Shared visual components only
├── emails/
└── tests/
```

Migration should be incremental. Add characterization tests, extract domain use cases/state transitions, and then move presentation. Do not perform a single wholesale folder rewrite.

## Extension module structure

| Path | Role | CTO comment |
| --- | --- | --- |
| `entrypoints` | WXT background and browser entry points | Keep thin and event-driven. |
| `contents` | In-page capture/autofill behavior | Security-sensitive boundary operating on untrusted pages. |
| `sidepanel` | User workflow, state and actions | Still too orchestration-heavy; extract state and persistence handlers. |
| `lib` | Storage, mapping, sync and domain helpers | Prefer typed ports shared by background/content/panel contexts. |
| `tests` | Fixture and executable extension tests | Add measured redirect-to-destination ATS journeys. |
| `assets`, `public`, `styles` | Packaged visual/static resources | Ensure build output contains only intended assets. |

## Configuration inventory

### Root and workspace

| File/path | Purpose | Production rule |
| --- | --- | --- |
| `package.json` | Canonical commands, pinned package manager and dependency overrides | Changes require CI and security review. |
| `pnpm-workspace.yaml` | Workspace membership | Only deployable/shared packages belong here. |
| `pnpm-lock.yaml` | Reproducible dependency graph | Commit; exclude from line-count metrics. |
| `.nvmrc` and `engines` | Node runtime contract | CI, local and Vercel runtimes must agree. |
| `tsconfig.base.json` | Shared compiler baseline | Package configs should extend rather than duplicate it. |
| `.env*.example` | Environment contract without secrets | Validate through environment-doctor tooling; never commit live values. |
| `.gitignore`, `.vercelignore` | Source/deployment exclusion policy | Must cover local logs, caches, preview trees, test output and secrets. |

### Application and deployment

| File/path | Purpose | Production rule |
| --- | --- | --- |
| `apps/web/next.config.ts` | Next.js/Sentry/security/build behavior | Security headers and Sentry upload behavior need release verification. |
| `apps/web/sentry.*.config.ts` | Server and edge telemetry | Redaction and environment tagging are mandatory. |
| `apps/extension/wxt.config.ts` | Manifest, permissions and extension build | Permission expansion requires threat review and manual Chrome verification. |
| `apps/analytics/pyproject.toml` | Python service dependencies/test configuration | Pin/runtime policy must match its deployment target. |
| `vercel.json` | Hosting schedules/routes | Changes require environment and rollback review. |
| `checkly.config.ts` | Synthetic monitoring | Checks must map to user-critical journeys. |
| `playwright*.config.ts` | Browser, design and smoke test modes | Keep environment targeting and credentials separated. |
| `lighthouserc.json` | Performance/accessibility budgets | Treat agreed thresholds as release signals. |
| `config/monitoring` | Monitoring definitions | Assign alert owner and runbook to every production alert. |
| `.github/workflows` | CI, scheduled validation and releases | Pin actions, restrict secrets and keep deployment approvals explicit. |

### Configuration finding

Configuration is distributed appropriately for a monorepo, but there is no concise environment-to-config ownership matrix. Add a generated or maintained table for `local`, `test`, `preview`, `staging` and `production`, covering runtime versions, Supabase project, Stripe mode, OpenAI policy, Sentry environment, email sender, feature flags, cron state and extension API origin.

## Logs, reports and evidence

### Current locations

| Location | Content | Classification |
| --- | --- | --- |
| `docs/reports/release-runs` | Generated release-check results | Retained CI/release evidence |
| `docs/reports/automation-runs` | Automation and smoke reports | Retained test evidence |
| `docs/reports/founder-validation-runs` | Manual founder validation records | Retained product/release evidence |
| `docs/reports/testing` | Point-in-time test and security reviews | Retained audit documentation |
| `test-evidence` | Independent/manual evidence | Controlled verification artifacts |
| `screenshots` | Visual QA evidence | Large test artifacts with retention cost |
| `playwright-report`, `test-results` | Local/generated test output | Ephemeral; should be ignored and produced by CI artifacts |
| `debug.log` | Root local debug output | Incorrect location; ephemeral and potentially sensitive |
| Sentry | Runtime errors/replays/telemetry | Production operational telemetry subject to redaction/retention |
| Supabase operational tables | Workflow/admin/AI/billing events | Production records with RLS/service-role and retention requirements |

### Recommended production organization

```text
docs/
├── reference/               Living, authoritative policies/specifications
└── reports/
    ├── product/             Human product/CTO assessments
    ├── security/            Dated security reviews and evidence
    ├── releases/<version>/  Immutable release decision and checks
    └── validation/<date>/   UAT/manual validation summaries

artifacts/                   Ignored locally; uploaded by CI with expiry
├── test-results/
├── playwright/
├── lighthouse/
├── screenshots/
└── logs/
```

Runtime logs should never be committed as ordinary files. They should use structured events with timestamp, environment, release, service, severity, correlation/request ID and a bounded error code. Candidate CV text, job descriptions, answers, email, phone, tokens, cookies and authorization headers must be redacted or excluded.

Define retention separately:

- CI test artifacts: short expiry, normally 14–30 days unless attached to a release decision;
- release evidence: immutable for the chosen audit period;
- application logs: shortest period compatible with support/security needs;
- Sentry replay: error-only and short retention;
- business/audit events: documented purpose and deletion behavior;
- screenshots/UAT: explicit consent and removal date when personal data appears.

### Immediate hygiene findings

The current working directory contains local/untracked preview and remediation copies, a quarantined `node_modules` tree, and generated output. These are not part of the tracked source count, but they make navigation, search and accidental tooling scope unsafe:

- `.preview-92503acd/`
- `.preview-f0e19697/`
- `.remediation-config/`
- `.remediation-private-beta/`
- `node_modules.quarantine-20260826/`
- root `debug.log`
- local `.pnpm-store/`, `.tmp/`, Playwright and result directories

Do not delete them without confirming ownership and retention needs. First classify each as active worktree, retained evidence or disposable cache; then move active worktrees outside the product tree and place ephemeral outputs under one ignored artifact root.

## Codebase line count

### Measurement method

Counts are physical lines, including blanks and comments—not logical statements or complexity points. The inventory used `git ls-files` so local preview/remediation copies and untracked files were excluded. It counted text extensions used for source/configuration and excluded `pnpm-lock.yaml`, dependencies, generated builds, screenshots, video, PDFs and other binaries.

Tests were classified before application paths so `apps/*/tests` are not counted as production source. SQL migrations are reported separately. Markdown is documentation, not source code.

### Lines by responsibility

| Category | Files | Physical lines |
| --- | ---: | ---: |
| Production source | 358 | 74,660 |
| Tests and performance checks | 94 | 15,536 |
| Scripts and tooling | 33 | 4,291 |
| Database migrations/preflight/seeds/cron | 46 | 2,842 |
| Configuration and CI | 39 | 1,889 |
| **Engineering code/configuration total** | **570** | **99,218** |
| Documentation | 168 | 12,057 |
| Other tracked text/data | 28 | 4,436 |
| **Measured tracked text total** | **766** | **115,711** |

### Production lines by module

| Module | Files | Physical lines | Share of production source |
| --- | ---: | ---: | ---: |
| `apps/web` | 294 | 58,231 | 78.0% |
| `apps/extension` | 37 | 11,527 | 15.4% |
| `packages/shared` | 22 | 4,310 | 5.8% |
| `supabase/functions` | 3 | 352 | 0.5% |
| `apps/analytics` | 2 | 240 | 0.3% |
| **Total** | **358** | **74,660** | **100%** |

### Engineering lines by main language/file type

This table combines production, tests, database and scripts; configuration-only files are not all included in every language row.

| Type | Files | Physical lines |
| --- | ---: | ---: |
| TypeScript (`.ts`) | 256 | 37,027 |
| TSX | 120 | 29,369 |
| CSS | 21 | 13,457 |
| JavaScript modules (`.mjs`) | 63 | 12,421 |
| SQL | 46 | 2,888 |
| Python | 4 | 970 |
| PowerShell | 9 | 933 |
| JavaScript | 5 | 103 |
| Shell | 1 | 80 |

### Largest maintainability hotspots

| File | Physical lines | Assessment |
| --- | ---: | --- |
| `apps/web/components/DashboardExperience.tsx` | 10,666 | Critical decomposition priority |
| `apps/web/app/globals.css` | 9,020 | Design-token/component-style separation needed |
| `apps/extension/contents/autofill.ts` | 2,483 | High-risk untrusted-page integration boundary |
| `apps/web/components/JobApplicationWorkspace.tsx` | 1,660 | Split state/use cases from views |
| `apps/web/lib/supabase/types.ts` | 1,651 | Generated schema type; large but lower hand-maintenance concern |
| `apps/extension/sidepanel/main.tsx` | 1,512 | Orchestration extraction required |
| `apps/web/components/InterviewsWorkspace.tsx` | 1,286 | Separate practice, evidence and outcome modules |
| `packages/shared/src/fit-model.ts` | 1,180 | Core decision logic needs focused tests and internal modules |
| `apps/web/app/api/sync/dashboard/route.ts` | 1,086 | API route should delegate to domain sync services |

Line count is a risk locator, not a quality score. Generated Supabase types should not be refactored for size; large handwritten orchestration and global styling should.

## Startup-to-production organization plan

### Now: controlled beta

- Declare the canonical map above in the root README.
- Create one ignored artifact root and stop producing root-level debug logs.
- Classify local preview/remediation directories without deleting user work.
- Add `CODEOWNERS` or an ownership document for runtime modules and critical configuration.
- Add a repeatable line-count/size-report script to CI as informational evidence.

### Before wider beta

- Extract dashboard domain behavior and extension persistence/orchestration.
- Establish the environment/configuration matrix.
- Standardize structured log fields, error codes, redaction and retention.
- Move generated evidence into predictable release/validation structures.
- Add dependency boundaries so UI code cannot directly bypass domain policy.

### Before production launch

- Verify log/telemetry retention and deletion against the privacy notice.
- Exercise restoration, incident and rollback runbooks.
- Make CI artifacts expire automatically and release evidence immutable.
- Require owners and change review for security, billing, AI, mobility sources, migrations and extension permissions.
- Enforce size/complexity trend reporting without imposing arbitrary line-count failure gates.

## CTO conclusion

The codebase is not disorganized at the top level; it is **under-explained and operationally cluttered**. The monorepo boundaries are sensible. The production-readiness work is to make ownership and artifact lifecycle explicit, move transient work outside the canonical tree, and break the largest handwritten orchestration files into domain-centered modules.

The total of 74,660 production lines is manageable, but 58,231 lines in the web module and more than 19,000 lines across the two largest web files create an avoidable concentration of risk. Structural cleanup should be incremental, test-protected and aligned with the core product domains—not a cosmetic folder rewrite.
