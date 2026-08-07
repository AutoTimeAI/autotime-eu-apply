# AutoTime Operations Admin

## Status

The `admin_operations_foundation` migration has been reviewed and applied
to the `autotime-eu-apply` (dev) Supabase project, and an owner has been
bootstrapped there via the controlled procedure in
`admin-owner-bootstrap.md`. Every admin page (Overview, Users, Feedback,
AI Operations, Market Data, Feature Flags, Audit Log) is wired to real
data as of 2026-08-07.

**Production status is unconfirmed** — this has only been verified
against the dev project. Applying the migration and bootstrapping an
owner in production are separate, deliberate actions (see the
"Controlled preview checklist" below) that have not been performed or
recorded here. Until they are, membership lookup fails closed in
production and nobody receives admin access there.

## Authorization model

Every protected page and API starts with the authenticated Supabase session, loads an active `admin_memberships` row through the server-only service-role client, and checks one named permission. Email addresses and auth metadata do not grant admin access.

| Role    | Intended scope                                                                 |
| ------- | ------------------------------------------------------------------------------ |
| owner   | All permissions, including membership and typed flag changes                   |
| admin   | Operations except membership and flag mutation                                 |
| support | Privacy-minimised users and feedback workflows                                 |
| analyst | Aggregate overview, feedback, AI operations, market status and read-only flags |

Suspended memberships have no permissions. The service-role key remains server-only. The database tables enable RLS, grant no normal-client policies, and revoke `anon` and `authenticated` access.

## Routes and safeguards

- `/admin/login` is outside the protected admin layout and uses normal Supabase sign-in.
- `/admin` and each section are protected server components.
- Admin APIs independently authorize requests; mutations also require same-origin requests.
- High-impact changes require a typed permission, constrained values, and an audit event before the state change.

The market refresh endpoint only records an idempotent, rate-limited request. It does not scrape, call ESCO, or start a background job. Feature flags accept only enumerated keys, booleans, and known environments.

| Boundary | Permission | Roles |
| --- | --- | --- |
| Overview | `overview:read` | owner, admin, support, analyst |
| Optional overview audit activity | `audit:read` | owner, admin |
| User summaries | `users:read` | owner, admin, support |
| User email | `users:read_email` | owner, admin |
| Beta access mutation | `users:manage_beta` | owner, admin |
| Feedback | `feedback:read/write` | role-specific |
| AI operations | `ai_operations:read` | owner, admin, analyst |
| Market status | `market_data:read` | owner, admin, analyst |
| Market refresh | `market_data:refresh` | owner, admin |
| Flag read | `feature_flags:read` | owner, admin, analyst |
| Flag mutation | `feature_flags:write` | owner |
| Audit log | `audit:read` | owner, admin |

Pages, route handlers and transactional database functions enforce their own boundary. Navigation filtering is presentation only. Mutations require a same-origin request and use fixed-purpose `SECURITY INVOKER` functions callable only by `service_role`.

## Migration object inventory

The admin migration creates six RLS tables, `admin_audit_events_created_at_idx`, an append-only trigger/function, and three fixed-purpose transactional mutation functions. The event migration creates one RLS table, two indexes, a unique `(user_id,event,transition_id)` constraint, and one serialized event-recording function. Both migrations explicitly expect ownership by `postgres`, revoke `PUBLIC`/`anon`/`authenticated`, and grant only named privileges to `service_role`.

## Privacy boundaries

The overview exposes aggregate counts and operational status. Extension and sync identifiers are redacted, arbitrary log metadata is removed, and the user API never returns CVs, job descriptions, prompts, generated content, or billing secrets. Email is returned only to roles with `users:read_email`.

Phase 3B Jobs and Applications currently use versioned browser storage. That is development data, not a canonical production record source. The overview therefore never counts browser records. It may count only allowlisted boundary events (`job_saved`, `job_analysed`, `application_prepared`, `application_submitted`) that contain an authenticated user ID, event name and timestamp. They contain no job description, CV/evidence, screening answer, immigration field, or generated content. Missing schemas and unsupported metrics display `Not instrumented`, never zero.

Operational events also carry a non-sensitive UUID `transitionId`. The database serializes requests per user, accepts each `(user_id, event, transition_id)` once, and limits raw delivery to 30 new events per minute. Duplicate delivery is an idempotent success.

Support does not receive bulk email addresses. A future email lookup, if justified, must be exact-match, separately permitted, reason-required, audited, bounded to one result, and unavailable for export.

## Audit action dictionary

- `admin_owner_bootstrapped` / `admin_owner_recovery_suspended`: controlled SQL only.
- `beta_access_suspended` / `beta_access_restored`: atomic beta-access RPC.
- `feature_flag_updated`: atomic version-checked flag RPC.
- `market_refresh_requested`: atomic idempotent refresh-request RPC.

## Retention defaults

- Workflow operational events: 90 days raw.
- Informational operational logs: 30 days.
- Warning/error operational logs: 90 days.
- Resolved feedback: 12 months.
- Admin audit events: 24 months during private beta, subject to documented review.

No automated deletion is enabled by this foundation.

## Remaining gaps

- Apply the migration and bootstrap an owner in production (done for dev only — see Status above).
- Add a durable worker for approved market refresh requests.
- Add retention policy, pagination and operator UI controls for feedback/audit records.
- Add end-to-end tests with seeded active, suspended and non-admin identities after schema approval.
- Decide and document retention for privacy-safe workflow operational events before production application.

## Controlled preview checklist

1. Use a disposable Supabase preview project with no shared data.
2. Run the read-only conflict/dependency preflight and retain its output.
3. Confirm the migration executor is `postgres` and the expected Supabase roles exist.
4. Apply each reviewed migration once; confirm a second execution fails clearly.
5. Inspect objects, owners, RLS, zero ordinary-client policies, grants and function settings using the migration comments.
6. Run the local/preview migration harness, including rollback injection, audit immutability, deduplication and rate limits.
7. Bootstrap one preview-only owner by exact UUID using the reviewed procedure.
8. Seed owner, admin, support, analyst, suspended and ordinary preview identities.
9. Exercise every page/API directly, including cross-origin and stale flag requests.
10. Run the admin, complete unit, Phase 3B.1 browser, build-canary and privacy scans.
11. Review evidence before any production consideration. Preview success does not authorize production application.
