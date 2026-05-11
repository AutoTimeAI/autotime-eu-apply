# Product Sync Wiring

AutoTime uses a local-first sync model for the extension and dashboard.

## Contract

1. Track Job saves to Chrome local storage first.
2. The extension records local sync metadata for the job.
3. If a dashboard session exists, the extension syncs to the dashboard.
4. The dashboard merges by normalized job URL to avoid duplicate tracked jobs.
5. Server diagnostics are printed to Vercel logs and persisted to `operational_logs`.
6. The admin panel reads persisted logs first, then computed signals if there are no persisted logs yet.

## Local States

- `pending`: saved locally, waiting for dashboard sync.
- `synced`: dashboard sync completed.
- `failed`: dashboard sync failed; local record remains safe and retryable.

## Production Rule

Basic job tracking and basic dashboard sync are free. Pro gating is only for advanced features.
