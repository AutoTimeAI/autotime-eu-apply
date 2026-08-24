-- job_workflow_jobs and job_workflow_applications have no way to record a
-- deletion. reconcileJobWorkflow (apps/web/lib/job-workflow-sync.ts) treats
-- "exists on the server, not present locally" as "adopt it from the
-- server" unconditionally - which is also the correct behaviour for a
-- device that has never synced before. Without a tombstone, that same rule
-- can't distinguish a genuinely new server-only row from one a user
-- deleted locally, so a deleted job/application would silently reappear on
-- the next sync. A nullable deleted_at column lets a deletion leave a
-- tombstone instead of removing the row: readJobWorkflow filters these
-- rows out entirely, so once soft-deleted a row never comes back down to
-- any client - closing the resurrection path at its source rather than
-- trying to detect it after the fact on the client.
alter table public.job_workflow_jobs add column deleted_at timestamptz;
alter table public.job_workflow_applications add column deleted_at timestamptz;
