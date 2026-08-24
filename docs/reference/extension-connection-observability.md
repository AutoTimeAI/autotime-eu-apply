# Extension Connection Observability

This runbook covers the dashboard sign-in, extension connect, Track Job, and dashboard sync flow.

## Where To Look

- Dashboard connect page: shows a live connection timeline while it checks the extension, reads the account, sends the session, and records audit status.
- Extension side panel, Account section: shows the latest connection diagnostic event and lets you export or clear the local diagnostic log.
- Config catalog: `config/monitoring/extension-connection-flow.json` defines expected events, failure events, operating rules, and operator actions.

## Expected Healthy Flow

1. Dashboard sends `AUTOTIME_PING`.
2. Extension logs `ping-received`.
3. Dashboard sends `AUTOTIME_CONNECT_ACCOUNT`.
4. Extension logs `account-session-saved`.
5. If local tracked jobs exist, extension logs `connect-sync-started` and `connect-sync-completed`.
6. Extension logs `account-connected-broadcast`.
7. Active job-board widgets log `account-connected-received`.

For Track Job, the extension must always save locally first. Basic dashboard sync is allowed for both free and pro users when a dashboard session exists.

## Debugging A User Report

Ask the user for the exported `autotime-diagnostic-log.json` from the extension side panel Account section. Then compare the latest events against `config/monitoring/extension-connection-flow.json`.

Use this quick read:

- No `ping-received`: dashboard cannot reach the extension. Check extension ID, disabled extension state, externally connectable origins, and whether the user opened the correct dashboard environment.
- `ping-received` but no `account-session-saved`: connect payload was not sent or was rejected. Check dashboard sign-in state and the live connection timeline.
- `account-session-saved` but `connect-sync-failed`: session exists, but tracked job sync failed. Check API auth, account ID, and returned error details.
- `account-connected-broadcast-failed`: connection can still be valid; refresh the job-board tab so the widget can pick up the saved session.
- `track-job-saved-local` with no sync success: job is safe locally. User needs a valid dashboard session or a sync retry.

## Privacy

Diagnostic logs are local to the extension unless exported by the user. Token-like, secret-like, password-like, and authorization-like detail keys are redacted before storage.

## Product Rules

- Basic job tracking is free.
- Basic tracked job sync is free after dashboard connection.
- Pro gates should apply only to advanced features.
- Error messages must explain the next fixable reason, not just say to try again.
