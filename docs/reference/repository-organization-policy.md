# Repository organization and artifact policy

## Purpose

Keep product code, operational configuration, durable documentation and
regenerable output visibly separate. Location communicates ownership,
retention and whether a file is a source of truth.

## Canonical layout

```text
apps/                  Deployable runtime code
packages/              Shared runtime-independent code
supabase/              Database migrations and edge functions
scripts/               Development, QA, release and maintenance automation
tests/                 Cross-runtime E2E, smoke and fixtures
config/                Shared operational definitions
.github/workflows/     CI and release configuration
docs/reference/        Living specifications and policies
docs/reports/          Curated, retained point-in-time evidence
artifacts/             Ignored, regenerable local/CI output
```

Root configuration is permitted only when a tool expects a conventional root
file or when it bootstraps the entire workspace. Product modules and general
utilities must not be added at root.

## Artifact lifecycle

| Class | Location | Git | Retention |
| --- | --- | --- | --- |
| Source and configuration | Canonical code/config paths | Tracked | Repository lifetime |
| Living policy/specification | `docs/reference/` | Tracked | Until superseded with history |
| Release/UAT decision evidence | `docs/reports/` | Tracked when curated | Defined audit period |
| Browser/coverage/performance output | `artifacts/` | Ignored | 14–30 days in CI unless promoted |
| Runtime telemetry | Sentry/provider | Never committed | Privacy-policy schedule |
| Local debug logs | `artifacts/logs/` | Ignored | Delete after diagnosis |
| Preview/worktree/cache copies | Outside canonical source or ignored root pattern | Ignored | Owner-classified |

Generated output is promoted into `docs/reports/` only when it is intentionally
reviewed, summarized and attached to a release or validation decision.

## Logging rules

Runtime and diagnostic events must use structured fields: timestamp,
environment, release, service, severity, bounded event code and correlation ID.
Do not log CV text, vacancy bodies, application answers, email, phone, tokens,
cookies, authorization headers or provider secrets.

No command may create `debug.log` or another log file at repository root.
Local file logging, when necessary, must target `artifacts/logs/` and state its
retention purpose.

## Existing non-canonical directories

Preview, remediation, quarantined dependency and temporary directories may
contain recoverable user work. Ignoring them is not permission to delete them.
Before removal or relocation, identify the owner, whether changes are unique,
and whether recovery evidence is required.

