# Backup verification and controlled restoration

Production restoration is destructive/high impact and requires explicit founder confirmation immediately before execution. Prefer an isolated restoration target.

## Backup verification

Record provider/project, backup type, immutable identifier, UTC creation time, retention, encryption and latest successful status without credentials. Confirm the backup predates the planned maintenance window.

## Controlled restoration exercise

1. Founder approves exact source backup and isolated destination.
2. Restore into a newly created test project/database, never over production for a drill.
3. Apply access restrictions and synthetic credentials.
4. Verify schema migration versions, table counts/checksums for selected non-PII fixtures, RLS enabled state, functions/grants and application read paths.
5. Destroy the isolated copy only under the approved provider procedure and retention policy; record destruction reference.
6. Record recovery point/time objectives, start/finish, operator, errors and evidence hashes.

Documentation, a “backup enabled” flag or an untested snapshot does not make restoration PASS.
