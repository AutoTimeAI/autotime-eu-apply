# Claude Code Pre-Release Runbook

Use this document as the operating prompt for Claude Code before an AutoTime
production release. It is a verification and release-preparation task. Do not
deploy, migrate production data, change production environment variables, or
push commits unless the user separately and explicitly authorizes that action.

## Copy/paste prompt for Claude Code

```text
Act as the pre-release engineer for this repository. Prepare the current main
commit for a production release, but do not deploy it yet.

Rules:
- Read AGENTS.md and repository instructions before acting.
- Preserve all existing uncommitted changes. Never reset, clean, stash, revert,
  or overwrite user work.
- Treat generated screenshots, test artifacts, and next-env.d.ts changes as
  local work unless proven otherwise.
- Evaluate the exact committed revision intended for release. Record its full
  SHA and confirm it is an ancestor of origin/main.
- Never expose or print secrets.
- Do not apply database migrations, edit production environment variables,
  trigger the production workflow, deploy to Vercel, or push Git changes during
  this pre-release pass.
- Use fake data for browser and API checks. Do not enter real CV, job, identity,
  visa, payment, cookie, token, or API-key data.
- If a required check cannot run, report it as BLOCKED rather than assuming it
  passed.

Inspect first:
1. Run `git status --short --branch` and record the release SHA with
   `git rev-parse HEAD`.
2. Confirm local main matches origin/main. Fetch only if network access is
   available and authorized.
3. Review `.github/workflows/production-deploy.yml`, `vercel.json`,
   `package.json`, pending migrations under `supabase/migrations`, and relevant
   release notes/checklists.
4. Identify changes since the last successful production release and classify
   them as application code, database, configuration, dependency, security, or
   documentation-only changes.

Run required automated gates:
1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test:unit`
4. `pnpm test:mobility-suite`
5. `pnpm build:web`
6. `pnpm test:production-hardening`
7. `pnpm test:manual-production-deploy`
8. `pnpm test:repository-organization`

On Windows, use `pnpm.cmd` if PowerShell blocks the `pnpm.ps1` shim. Do not
weaken the machine execution policy. Run independent checks in parallel where
safe, but keep enough output to diagnose failures.

Conditional gates:
- If extension code changed: run `pnpm release:check`, inspect its generated
  report, build the extension, and leave the documented Chrome/live-job checks
  explicitly pending until completed.
- If migrations changed: verify ordering, idempotency expectations, rollback or
  forward-fix strategy, compatibility with the currently deployed application,
  and whether the migration must precede or follow the code deployment. Do not
  apply it.
- If authentication, authorization, RLS, SECURITY DEFINER functions, admin
  routes, billing, AI metering, or secrets changed: run their focused tests and
  perform a security review. Fail closed on uncertainty.
- If user-visible flows changed: run the smallest relevant Playwright suite and
  verify desktop/mobile behavior. Do not update snapshots merely to make tests
  green; explain the visual difference first.
- If dependencies changed: verify the frozen lockfile install and review
  production-impacting advisories without making unrelated upgrades.

Release safety checks:
- Confirm the production workflow requires a full 40-character SHA from main
  and the exact confirmation `DEPLOY PRODUCTION`.
- Confirm it captures the previous READY production deployment, performs a
  production build, runs the deployed smoke test, and rolls back on failure.
- Confirm required GitHub/Vercel credentials and environment configuration are
  present by metadata/status checks only. Do not display secret values.
- Confirm the smoke test covers the public HTML and an unauthenticated protected
  route.
- State the rollback target or explain why it cannot yet be identified.

Produce `docs/reports/pre-release-<YYYY-MM-DD>-<short-sha>.md` containing:
- release SHA, branch, timestamp, and comparison base;
- concise change summary and risk classification;
- every command run with PASS, FAIL, or BLOCKED status;
- database/configuration/manual steps in required order;
- unresolved warnings and deferred non-blockers;
- rollback plan;
- a final decision of GO, NO-GO, or BLOCKED;
- the exact production workflow command to run after explicit approval, but do
  not execute it.

The normal approved deployment command is:
`gh workflow run production-deploy.yml -f commit_sha=<FULL_SHA> -f confirmation="DEPLOY PRODUCTION"`

After writing the report, stop and summarize the decision. A GO means the
artifact is ready for a separately authorized deployment; it is not permission
to deploy.
```

## Release decision standard

- **GO**: all required gates passed, release ordering is known, no unresolved
  release-blocking risk exists, and rollback is available.
- **NO-GO**: a gate failed, a confirmed security/data-integrity defect exists,
  or the proposed revision is not the intended commit on `main`.
- **BLOCKED**: required evidence cannot be obtained, credentials or services are
  unavailable, or a required manual decision is missing.

Warnings must not be silently converted into passes. Each warning should be
classified as blocking, accepted non-blocking, or deferred with an owner and a
reason.

## Production handoff

After an explicit deployment instruction, prefer the guarded GitHub workflow
over a direct local deployment. Monitor the workflow through the deployed smoke
test and automatic rollback stage. Record the workflow run URL, Vercel
deployment URL, commit SHA, result, and post-deploy error-log scan.

If GitHub workflow dispatch is unavailable, stop and request a decision before
using a direct Vercel deployment. A direct fallback must deploy an isolated
archive of the approved commit so local uncommitted files cannot be uploaded,
and it must include an identified rollback target plus the same post-deploy
smoke test.

## Current operational notes (2026-09-19)

- The Vercel project is `autotime-eu-apply`.
- Production is served at `https://autotime-eu-apply.vercel.app`.
- Automatic Git-based Vercel deployment is disabled; production normally uses
  `.github/workflows/production-deploy.yml`.
- The workflow pins pnpm 10.33.0, Node 24, and Vercel CLI 59.7.0.
- The release workflow's mandatory CI gates are currently typecheck and the
  mobility suite, followed by the Vercel production build and live smoke test.
- Sentry source-map upload requires a valid build-time auth token. Missing it
  does not currently fail the Vercel build, so the pre-release report must call
  it out explicitly as an observability gap.
- Do not treat full-page screenshots of fixed-position elements as definitive
  visual evidence; verify with viewport screenshots and bounding boxes.

