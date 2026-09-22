# Production Version Lock — 2026-09-22

Snapshot of every version-relevant fact about the exact code, tooling, and
infrastructure currently deployed to production. This is a point-in-time
record, not a living document - see "How to keep this current" at the
bottom for when to regenerate it. For the current release-readiness
narrative and decision, start at
[`release-evidence-index.md`](./release-evidence-index.md) instead; this
file exists purely as the version/dependency ledger that index points to.

## 1. Deployed artefact

| Field | Value |
|---|---|
| Git commit (deployed) | `e3b7c6b1ac3a2a88464755feb1e08731873306d5` |
| Commit date | 2026-09-22T15:34:22+01:00 |
| Branch | `main` |
| Production deploy workflow run | `35752891873` (green, alias-claim step passed) |
| Vercel project ID | `prj_XUEts6JIkUeZ4pcUIIKl2FiXgqeC` |
| Vercel org/team ID | `team_eYfFWCwi1Hh0FJoPORmr6pcb` |
| Production URL | `https://autotime-eu-apply.vercel.app` |
| Deploy mechanism | GitHub Actions `production-deploy.yml` (`workflow_dispatch`, requires exact 40-char SHA + typed `DEPLOY PRODUCTION` confirmation) → Vercel CLI (`vercel build` + `vercel deploy --prebuilt --prod`), not Git-integration deploys |

To reproduce this exact build locally: `git checkout e3b7c6b1ac3a2a88464755feb1e08731873306d5`, then follow §3.

## 2. Repository structure (monorepo)

| App | Path | Purpose |
|---|---|---|
| `web` | `apps/web` | Next.js production app (this is what's deployed to Vercel) |
| `extension` | `apps/extension` | Chrome browser extension (published separately to the Chrome Web Store) |
| `analytics` | `apps/analytics` | Python analytics service |

## 3. Toolchain (exact, locked)

| Tool | Version | Source of truth |
|---|---|---|
| Node.js | `24` (constrained `>=24 <25`) | `package.json` `engines.node`; CI `production-deploy.yml` `node-version: 24` |
| pnpm | `10.33.0` (exact, not a range) | `package.json` `packageManager` + `engines.pnpm`; CI `pnpm/action-setup@v4` pinned to `10.33.0` |
| Package manager | pnpm workspaces (monorepo) | `pnpm-workspace.yaml`, `pnpm-lock.yaml` |

CI (`production-deploy.yml`) installs with `pnpm install --frozen-lockfile` equivalent (locked dependencies step), so what deploys is exactly what `pnpm-lock.yaml` at this commit resolves to - not a fresh `^`-range resolution.

## 4. `apps/web` — key locked dependency versions

Resolved (locked) versions as of this commit, via `pnpm list --depth 0` — not the `^`/`~` ranges in `package.json`, which can drift on a fresh install without the lockfile.

| Package | Locked version | package.json range |
|---|---|---|
| `next` | `16.3.5` | `^16.3.3` |
| `react` / `react-dom` | `18.2.0` | `^18.2.0` |
| `typescript` | `6.0.2` | `^6.0.2` |
| `@supabase/supabase-js` | `2.105.3` | `^2.105.3` |
| `@supabase/ssr` | `0.10.2` | `^0.10.2` |
| `stripe` | `22.1.0` | `^22.1.0` |
| `resend` | `6.12.3` | `^6.12.3` |
| `openai` | `6.36.0` | `^6.36.0` |
| `zod` | `4.3.6` | `^4.3.6` |
| `eslint` (dev) | `9.38.0` | `^9.38.0` |

**Note on `next@16.3.5`**: this version deprecates the Edge Runtime for
route handlers framework-wide (`runtime = "edge"` is marked deprecated in
this version's own docs, not a project-specific issue) - see
`docs/quality-assurance.md`'s 2026-09-20/21 entries on the OG-route
Edge→Node migration and the resulting server-trace-budget fallout, fixed
in commit `023ad6db`.

For the complete dependency tree (all direct + transitive packages, exact
resolved versions), see `pnpm-lock.yaml` at this commit - it is the actual
source of truth; the table above is a curated subset of what matters most
for security/compatibility tracking.

## 5. `apps/extension` — browser extension

| Field | Value |
|---|---|
| Extension version | `0.0.5` (`apps/extension/package.json`) |
| Distribution | Published to the Chrome Web Store: `https://chromewebstore.google.com/detail/autotime-eu-apply/cnddgochpdijpljflnbhpngacmmglmfn` (see `docs/quality-assurance.md`, "2026-09-21: browser extension published to the Chrome Web Store") |
| Relationship to web app version | **Independent** - the extension is versioned and shipped separately from `apps/web`; there is no enforced version-lockstep between them. A web-app deploy does not republish the extension, and vice versa. |

## 6. Database (Supabase)

| Field | Value |
|---|---|
| Project ref | `dorqxmnslzzmrpjbhlcl` |
| Project name | `autotime-eu-apply` |
| Postgres version | `17.6.1.113` (`postgres_engine: 17`, release channel `ga`) |
| Region | `eu-north-1` (Ireland) |
| Plan | **Free tier** — no scheduled backups, no PITR, no leaked-password protection (accepted risks; see `release-evidence-index.md`) |
| Latest migration applied | `20260922120000_public_beta_waitlist_signups.sql` |
| Migration count | See `supabase/migrations/` — every `.sql` file in that directory, in filename (timestamp) order, has been applied directly to this production project; there is no separate "pending" set |

To see the exact schema at this commit: `supabase/migrations/*.sql` in filename order is the authoritative, replayable history — do not rely on any single migration file in isolation.

## 7. Hosting / deployment platform

| Field | Value |
|---|---|
| Platform | Vercel |
| Deploy path | Vercel CLI with a bare API token (`VERCEL_TOKEN` secret), **not** Vercel's native Git-integration deploys — see `docs/quality-assurance.md`'s 2026-09-21 entry for why this distinction mattered (it's the root cause of the recurring stale-alias bug, fixed in commit `7d8386c0`) |
| Runtime environments seen in code | Node.js serverless functions (default) + a small number of static/edge-adjacent assets; the OG image route (`apps/web/app/api/og/route.tsx`) moved from Edge to Node in commit `fcc2f5bd` (2026-09-20) |

## 8. External services and their SDK versions

| Service | SDK / integration | Version | Verified-live status |
|---|---|---|---|
| Supabase (Auth + Postgres) | `@supabase/supabase-js`, `@supabase/ssr` | `2.105.3` / `0.10.2` | Verified live throughout this release cycle |
| Stripe (billing) | `stripe` (Node SDK) | `22.1.0` | Billing state transitions verified; live/test-mode end-to-end transaction **not yet verified** (public-launch item) |
| OpenAI (AI features) | `openai` (Node SDK) | `6.36.0` | Verified live with a real costed API call ($0.000509) on 2026-09-20 |
| Resend (transactional email) | `resend` | `6.12.3` | **Fixed 2026-09-22** — sender domain was unverified/unregistered (`autotime-eu-apply.com`) since inception; switched to `hello@autotimeai.com` (verified domain, different Resend account, `RESEND_API_KEY` updated accordingly); confirmed live by an actual received email. See `docs/quality-assurance.md`'s 2026-09-22 entry for the full incident |
| PostHog (analytics) | `NEXT_PUBLIC_POSTHOG_KEY`/`_HOST` env-configured | n/a (hosted service) | Not independently re-verified this cycle |
| Sentry (error monitoring) | referenced in `docs/reference/testing/sentry-*` | n/a | Live event/alert verification is a documented open public-launch item |

## 9. What this document intentionally does NOT lock

- **Chrome extension review/publication state** — tracked separately in `docs/quality-assurance.md`, not version-pinned here since Chrome Web Store review is asynchronous and outside this repo's control.
- **Third-party SaaS platform versions** (Vercel's own runtime, Supabase's managed Postgres minor-patch cadence) — these can change underneath a fixed deploy without a corresponding commit here; re-check §6/§7's live values if debugging an environment-specific issue.
- **`.codex-temp/`, `.preview-*/` directories** — these are stale worktree/build artifacts found in the repo during this audit (e.g. containing an old extension build at version `0.0.1`, not the current `0.0.5`). They are not part of the deployed production build and should not be treated as version evidence.

## How to keep this current

Regenerate this document (a new dated file, don't overwrite this one) when:
- A new production deploy lands with meaningfully different dependency versions (a major/minor bump to Next.js, Supabase SDKs, or any service listed in §8)
- The Supabase project's plan tier changes (resolves the Free-tier accepted risks)
- The deploy mechanism itself changes (e.g. if the project ever moves off the bare-token Vercel CLI path to Git-integration deploys)

To regenerate: `git rev-parse HEAD` for §1, `pnpm --filter web list <packages> --depth 0` for §4, extension `package.json` for §5, Supabase MCP `get_project`/`list_projects` for §6, and cross-check `docs/quality-assurance.md`'s most recent entries for anything that changed service-verification status (§8).
