# Changelog

This project is tracked with git tags rather than published npm versions
(the root `package.json` has no `version` field by design). Entries below
start from this file's introduction; for anything earlier, `git log` and the
tag list are the source of truth.

## Release tags so far

| Tag | Date |
| --- | --- |
| `v0.0.1` | 2026-05-03 |
| `v0.1.0-private-beta` | 2026-05-23 |
| `v0.1.1-proof-workflow` | 2026-07-01 |
| `v0.1.2-pre-commercial-prod` | 2026-08-08 |

Run `git log <tag>..<next-tag> --oneline` for the full commit list between any
two releases; this file does not attempt to summarize that history
retroactively.

## Unreleased

Changes since `v0.1.2-pre-commercial-prod` - add an entry here alongside each
merged fix or feature, and move this section under a new tag heading when the
next release is cut.

- Fixed a Stripe webhook redelivery bug that could send a duplicate
  "upgrade confirmed" email (`supabase/migrations/20260821170000_stripe_webhook_idempotency.sql`).
- Fixed an open-redirect bypass in post-login redirects (`/auth/callback`,
  `/api/qa/session`, and the login page all accepted a `redirectTo` value
  that resolved to an external origin via a leading `/\`).
- Added `docs/README.md`, an index consolidating the 100+ files under `docs/`.
