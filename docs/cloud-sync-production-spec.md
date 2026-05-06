# AutoTime Cloud Sync Production Spec

Status: Marked for post-MVP production track.

Motto: Smarter targeting. Stronger applications. More interviews.

## Decision

Cloud sync makes sense for real production and should be treated as mandatory
before a broad paid release. It is not required to finish the founder-led MVP
validation gate because the current local export/import bridge is safer and
keeps LinkedIn, secrets, and live application evidence under user control.

The production path is:

1. Keep MVP local-first until founder validation is complete.
2. Add account-based cloud sync behind a feature flag.
3. Require explicit user consent before uploading candidate data.
4. Keep LinkedIn manual copy/paste only.
5. Never store browser cookies, job-site sessions, or API keys in synced data.

## Why Sync Matters

Cloud sync turns AutoTime from a local helper into a continuous candidate
operating system. The user should be able to move between the Chrome extension
and web dashboard without exporting JSON every time.

Production users will expect:

- one candidate profile across extension and dashboard
- saved applications available after restart or device change
- interview prep connected to each tracked application
- targeting decisions based on the same profile evidence everywhere
- less manual import/export friction
- safer backup and recovery

## MVP Boundary

The current MVP remains valid with local export/import if these conditions stay
true:

- candidate profile bridge is mandatory
- dashboard export/import blocks incomplete profile evidence
- LinkedIn remains manual copy/paste only
- no form is submitted automatically
- autofill only runs after explicit user action
- API keys are not saved into reports
- live job-site validation evidence remains manual

## Production Sync Scope

Sync these records:

- candidate profile
- target countries and target roles
- work-right and relocation context
- reusable answers
- saved applications
- job analysis and apply decisions
- generated content snapshots
- interview prep packs
- validation metrics and user-visible activity log
- AI usage metadata, excluding secrets

Do not sync:

- OpenAI API keys or provider secrets
- browser cookies
- LinkedIn session data
- raw job-site authentication state
- hidden form data from pages the user did not explicitly capture
- full application forms without user review
- anything submitted automatically

## Recommended Stack

Recommended first production stack:

- Supabase Auth
- Supabase Postgres
- row-level security per user
- encrypted-at-rest platform storage
- client-side feature flag for cloud sync mode
- local-first fallback if sync is unavailable

Supabase alone is enough for the first production sync track. Clerk can be added
later if user/account UX needs become more complex.

## Data Model

Minimum tables:

- `profiles`
- `profile_revisions`
- `reusable_answers`
- `applications`
- `job_analyses`
- `content_snapshots`
- `interview_prep_packs`
- `ai_usage_events`
- `sync_events`

Each table must include:

- `id`
- `user_id`
- `created_at`
- `updated_at`
- `source_surface`, such as `extension` or `web`
- `schema_version`

Application records should include platform, role title, company, country,
status, next action, outcome notes, and content snapshot references.

Profile records are living candidate memory, not a one-time constant. The
`profiles` table stores the latest profile for fast dashboard and extension
reads. The `profile_revisions` table records explicit user-approved changes with
changed fields, reason, snapshot, source surface, and revision number. AutoTime
must never silently overwrite profile memory from AI or extension detection.

## User Consent

Cloud sync must be opt-in during the transition from MVP to production. The user
must see a clear control before data upload:

- Local only
- Cloud sync enabled

The consent copy should be product-specific:

AutoTime uses your candidate profile and saved application evidence to keep
targeting, stronger applications, and interview prep consistent across the
extension and dashboard.

## Extension Rules

The extension may sync:

- saved candidate profile
- reusable answers
- user-captured application evidence
- explicit content snapshots
- user-approved job analysis

The extension must not sync:

- LinkedIn page automation state
- cookies or session tokens
- hidden page data not reviewed by the user
- application submission actions

Autofill must remain explicit-click only. Sync does not change execution safety.

## Dashboard Rules

The dashboard may sync:

- profile updates
- application history edits
- interview prep packs
- status and outcome notes
- AI usage metadata

The dashboard must block production export/sync readiness when mandatory profile
bridge fields are missing.

## Rollout Steps

1. Complete MVP founder validation with local bridge.
2. Create Supabase project and define RLS policies.
3. Add environment variable policy and never commit credentials.
4. Add auth session handling to the web dashboard.
5. Add cloud sync feature flag.
6. Implement profile sync first.
7. Implement applications sync second.
8. Implement interview prep sync third.
9. Add sync status UI to both extension and dashboard.
10. Add automated tests for data shape, RLS assumptions, and offline fallback.
11. Run private pilot with cloud sync disabled by default.
12. Enable cloud sync for selected pilot users only.

## Production Gates

Cloud sync is not production-ready until:

- user can sign in and sign out
- user can delete synced account data
- sync can be disabled
- local mode still works
- RLS prevents cross-user data access
- no secrets are stored in synced tables
- no browser cookies are collected
- LinkedIn remains manual copy/paste only
- no auto-submit behavior exists
- dashboard and extension show the same candidate profile
- application evidence syncs with clear timestamps
- privacy policy and data deletion route are documented

## First Build Slice

The first implementation slice should be small:

- add auth shell
- add `profiles` table
- sync mandatory profile bridge fields only
- show sync status in dashboard
- keep extension export/import working

This proves real product continuity without risking job-site automation safety.

Repo marker:

- `.env.example` documents the cloud-sync feature flag and Supabase public
  client settings without storing real credentials.
- `supabase/migrations/20260506171000_cloud_sync_profiles.sql` defines the
  first safe schema slice: one synced profile per user, mandatory profile bridge
  constraints, row-level security, and profile sync audit events.
- `supabase/migrations/20260506182000_profile_revisions.sql` adds profile
  revision history so profile details can change over time without treating the
  candidate profile as a fixed constant.
- The web dashboard includes a Production Sync Track shell that shows local mode
  by default and does not upload data.
- `apps/web/lib/cloud-sync.ts` centralises the feature flag and public Supabase
  env readiness check before any auth package or upload path is added.
- The dashboard account-sync shell is visible but locked until the readiness
  guard confirms the feature flag and public Supabase env values are present.
- `@supabase/supabase-js` is installed for the web app, but the client factory
  returns no client until the cloud-sync feature flag and public Supabase env
  values are present. Profile upload remains unimplemented and blocked.
- The auth session adapter only calls Supabase `auth.getSession()` after the
  guarded client exists; profile sync still requires a later explicit action.
- The profile sync payload mapper converts a validated `CandidateProfile` into
  the Supabase `profiles` row shape only when mandatory profile bridge evidence
  and an authenticated user id are present. It does not include secrets, cookies,
  or API keys.
- The profile sync action adapter can prepare a payload only after cloud-sync
  readiness, authenticated session, mandatory profile evidence, and explicit user
  action are present. It still does not write to Supabase.
