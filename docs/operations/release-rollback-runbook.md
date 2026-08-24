# Deployment rollback runbook

No production rollback or restoration may be executed without explicit founder confirmation immediately beforehand.

## Preflight

- Identify current and target deployment IDs and Git SHAs; confirm target was previously healthy.
- Confirm database compatibility. Application rollback must not assume additive migrations were reversed.
- Pause invitations/jobs if needed and create an incident/change record.

## Application rollback

1. Founder approves the exact target deployment.
2. Promote/rollback through the deployment provider using the recorded immutable deployment ID.
3. Verify canonical domain resolves to the target SHA.
4. Run non-mutating homepage/login/auth-protection/health smoke.
5. Monitor errors, latency and support signals; record start/finish/operator/output.

## Database forward fix

Prefer additive forward-fix migrations. Never destructively down-migrate production data merely to match older application code. If incompatibility is unavoidable, stop traffic and use the controlled restoration procedure with separate approval.

Success requires demonstrated provider action, SHA verification, clean smoke and monitoring evidence—not this document alone.
