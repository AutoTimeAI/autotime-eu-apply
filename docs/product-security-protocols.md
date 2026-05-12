# AutoTime Product Security Protocols

These constraints define the production behavior for the dashboard, extension,
sync layer and admin console. They are product rules, not suggestions.

## Execution Order

1. The user lands in the dashboard.
2. The dashboard evaluates profile completion.
3. If the profile is below 90%, only profile completion and overview guidance are available.
4. Once the profile reaches 90%, job checks, tracker actions, analytics and interview prep unlock.
5. Every execution action still validates the profile gate before running.

Code source of truth: `apps/web/lib/product-protocols.ts`.

## Security Constraints

- AutoTime must never auto-submit applications.
- AutoTime must not store browser cookies, job-site sessions, passwords, API keys or payment secrets.
- Job tracking saves locally first so the user does not lose work.
- Basic tracked-job dashboard sync is available to signed-in free and pro users.
- Pro gating applies only to advanced assistance, not basic job tracking sync.
- Admin routes, logs and monitoring are visible only to authenticated allowlisted admin users.
- Data ownership must remain user-scoped in API logic and database row-level security.

## Failure Protocol

Failures must be explainable in logs and UI status messages. Use these levels:

- `severe`: auth bypass risk, data ownership risk, database write failure, payment/security issue.
- `warn`: sync failure with local fallback, extension connection issue, missing config, API degradation.
- `info`: expected fallback, user action, successful sync, routine health check.

The user-facing fallback should say what happened and the next recovery action.
The internal log should identify the subsystem: auth, sync, storage, API, database,
extension, admin or AI.

## Dashboard Protocol

The dashboard must stay simple for end users:

- Profile first.
- Then job fit and saved roles.
- Then applications and next actions.
- Then interview prep and advanced AI.

Do not expose admin, logs or internal diagnostics in the end-user dashboard.

## Extension Protocol

The extension must follow this order:

1. Extract visible job data only.
2. Track Job saves locally first.
3. If the dashboard session is connected, sync the tracked job.
4. If sync fails, keep the local job and show the reason.
5. Never submit or trigger job-site application actions without explicit user review.
