# Authenticated mobility persistence

## Implementation and activation status

The migration, repository, authenticated API, consent model, reconciliation state machine and UI controls are implemented. Production activation remains off. `AUTOTIME_MOBILITY_SERVER_SYNC_ENABLED` is evaluated only on the server and defaults to disabled; the browser learns availability only from the fail-closed API response.

Production project `dorqxmnslzzmrpjbhlcl` has been explicitly authorised for the additive mobility migration only. The migration remains unapplied until the documented recovery gate, read-only preflight, feature-flag verification and separate production execution approval are complete. Global production mobility sync remains disabled.

## Data and ownership

`mobility_profiles.user_id` is the primary key and a cascading foreign key to `auth.users`. The table stores a validated schema-version-1 profile, consent version and timestamp, sync-enabled state, migration timestamp, and database-managed creation/update timestamps.

GET, PUT, PATCH and DELETE derive the user ID from `getRequestUser`. Request bodies contain no user ID. The admin-backed repository scopes every operation to the authenticated ID; four RLS policies independently limit SELECT, INSERT, UPDATE and DELETE to `auth.uid() = user_id`. Anonymous access has no policy. Service-role credentials remain server-only.

PUT accepts a strict envelope containing the profile, consent and expected server timestamp. Unsupported profile or consent versions fail validation. Existing rows require the exact last-read timestamp; stale or racing writes return HTTP 409 rather than silently overwriting a newer record. Returned records are validated and expose only the constant ownership context `authenticated-user`, never another user's identifier.

The API does not log request bodies or mobility fields and uses generic error messages.

## Consent

Consent version: **1**.

Opening International performs a read only and never grants consent or uploads data. Before the first upload, the UI explains which mobility facts are stored, why they are used, that they are associated with the signed-in account, that browser and account copies are removed separately, and that AutoTime is not making an immigration decision.

Consent requires an explicit button; there is no preselected checkbox. It is timestamped and stored under the exact account-scoped browser key, then recorded with the server profile only after a confirmed PUT. A server record carries consent to a new browser. Disabling sync records `sync_enabled=false` on the server and removes the local consent marker without deleting either copy. A later upload requires renewed explicit consent.

Legacy-migrated facts remain review-only. The consent action is withheld until the user explicitly saves the reviewed mobility form.

## State machine

The typed states are:

- `local-only`
- `consent-required`
- `upload-pending`
- `syncing`
- `synced`
- `conflict`
- `offline`
- `error`
- `server-disabled`

`syncing` begins only after an explicit upload action. `synced` is reached only when PUT succeeds, the response validates, schema and ownership context match, and the returned profile equals the expected profile. Network attempts, invalid responses, conflicts and failed writes retain the local data and never produce `synced`.

## Reconciliation

- **Neither copy:** keep an empty local form; no upload.
- **Local only:** request consent; upload only after the explicit action.
- **Server only:** load the validated server record and do not overwrite it with empty defaults.
- **Matching copies:** mark synced if server sync remains enabled.
- **Different copies:** enter conflict state. The user may keep the account version, review key differences, or confirm replacing it with the browser version.
- **Malformed local copy:** retain the raw key, block upload, explain the error, and offer exact-key removal.
- **Legacy copy:** migrate conservatively and require review/save before consent or upload.
- **Stale server timestamp:** return conflict and require reconciliation.

Automatic upload is intentionally absent, including after server deletion, retry, login or page open.

## Local retention and logout

A confirmed account upload leaves the browser copy in place and offers removal. `Remove from this browser` deletes only `autotime-international-mobility:v1:<authenticated-user-id>`. It never scans storage. Account-profile deletion removes the active user's mobility and consent keys only after required server deletions succeed.

`Delete account mobility profile` removes only the server record and retains the browser copy. `Disable account sync` retains both copies and explains this. Logout clears session and in-memory React state through navigation but does not silently delete durable browser or account data.

## Account deletion integration

The existing Settings flow is an **account-profile data deletion**, not deletion of the authentication identity. Its copy now deletes mobility data first and the general synced profile second. It treats a disabled mobility endpoint as no active mobility service, removes the active user's local mobility and consent keys only after the required server operations succeed, and reports partial failure rather than claiming completion.

Full deletion of the Supabase authentication identity is not implemented in this repository. The foreign-key cascade will delete mobility data when such an identity-deletion service is added, but that cascade still requires preview verification.

## Preview migration and RLS verification

Only proceed after proving the linked target is a disposable/non-production preview project through provider metadata, not an application environment string.

1. Record the preview project identifier and owner approval.
2. Back up its schema and confirm no production users are present.
3. Apply `20260729120000_mobility_profiles_entry_gate.sql` to that preview target only.
4. Confirm the table, trigger, constraints and four policies from PostgreSQL metadata.
5. Create two disposable authenticated identities A and B.
6. With each user's own access token, exercise owner create/read/update/delete.
7. Verify A cannot select, update or delete B and B cannot access A.
8. Verify anonymous requests return no record and cannot mutate data.
9. Submit bodies containing `user_id` and confirm strict HTTP 400 responses.
10. Delete one preview auth identity and confirm its mobility row cascades while the other remains.
11. Record only status codes, record counts and synthetic identifiers; never record mobility payloads.

No live RLS result is claimed in this document because these steps were not safely executable against the ambiguously linked project.

## Rollback

Turn off `AUTOTIME_MOBILITY_SERVER_SYNC_ENABLED` first. The API then fails closed and the UI returns to browser-only behavior. Keep the additive table in place while investigating so data is not destroyed. Roll back code independently. Drop the preview table only after retention/export review; never weaken RLS or delete browser copies as a rollback shortcut.

## Production activation checklist

- The production recovery gate and read-only preflight are approved.
- The reviewed migration is applied separately and schema metadata is verified while the feature remains disabled.
- A founder-only server-side canary gate exists before any canary record is uploaded.
- Founder consent, concurrency, reconciliation, deletion and desktop/mobile UAT pass.
- Two controlled identities or two explicitly authorised existing accounts prove cross-user and anonymous RLS isolation before wider activation.
- Cascade deletion is demonstrated without affecting the second controlled identity.
- Consent copy and version receive privacy/legal review.
- Data-retention period and support recovery process are approved.
- Full authentication-account deletion is implemented or explicitly excluded from product claims.
- Logs are inspected and contain no mobility payloads.
- Monitoring and rollback ownership are assigned.
- A separate production change approval enables wider access.

## Production migration recovery gates

Production project `dorqxmnslzzmrpjbhlcl` is authorised only for the reviewed additive mobility migration. The migration must remain unapplied until one of the following recovery gates is recorded and approved.

### Preferred: provider-managed restore point

Record all of the following before migration:

- a non-zero provider backup or restore timestamp created before migration;
- the confirmed project reference;
- the account or role that can initiate restoration;
- the responsible owner;
- the expected restore procedure and validation steps.

A backup listing with zero timestamps is not an acceptable restore point. Keep the feature flag disabled throughout recovery testing.

### Alternative: reduced-protection gate with explicit owner approval

If a provider restore point remains unavailable, production migration requires explicit owner acceptance of reduced recovery protection. Before approval:

1. Securely retain a schema-only pre-migration snapshot outside the repository.
2. Record the remote migration-history state.
3. Confirm the migration uses one explicit transaction and creates only a new, empty mobility table and its own trigger and policies.
4. Review rollback SQL separately; do not execute it automatically.
5. Record that rollback would remove the mobility table and all mobility records.
6. If any mobility records exist, make a retention/export decision before rollback.

A schema-only snapshot does not contain or back up production row data.

### Read-only production preflight

Run `supabase/preflight/20260729120000_mobility_profiles_entry_gate_readonly.sql` through an approved read-only SQL session. It reports table, policy, trigger, migration-history, foreign-key-target and RLS prerequisites without selecting application rows.

### Schema-only snapshot procedure

Snapshot creation is a separate production action requiring explicit approval. Use a PowerShell session with the existing authenticated Supabase CLI; do not put a database password or connection string on the command line:

```powershell
$expectedProjectRef = 'dorqxmnslzzmrpjbhlcl'
$resolvedProjectRef = (Get-Content -Raw -LiteralPath 'supabase/.temp/project-ref').Trim()
if ($resolvedProjectRef -ne $expectedProjectRef) { throw 'Production target mismatch' }

$snapshotDirectory = Join-Path $env:LOCALAPPDATA 'AutoTime/production-schema-snapshots'
New-Item -ItemType Directory -Force -Path $snapshotDirectory | Out-Null
$snapshotTimestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$snapshotPath = Join-Path $snapshotDirectory "autotime-$snapshotTimestamp-schema.sql"
pnpm exec supabase db dump --linked --schema public,auth --file $snapshotPath
Get-FileHash -Algorithm SHA256 -LiteralPath $snapshotPath
```

Store the snapshot path, SHA-256 checksum, creation time, confirmed project reference and custodian in the migration record. Inspect only DDL from the snapshot. Never commit the snapshot or copy it into a tracked workspace directory.

### Rollback review

Application rollback begins by keeping `AUTOTIME_MOBILITY_SERVER_SYNC_ENABLED` disabled. Database rollback, if later approved, would remove only the newly created `public.mobility_profiles` table and its dependent trigger/policies. Because that action destroys mobility rows, it requires a prior retention/export decision and must never run automatically.