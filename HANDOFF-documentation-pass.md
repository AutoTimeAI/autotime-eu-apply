# Handoff: repo-wide code documentation pass

**Status as of handoff**: Claude Code session hit its limit mid-task. This file is
the full state so work can continue in another tool (Codex) without re-deriving
the lessons below the hard way.

Delete this file once the remaining work (see "Remaining work") is complete —
it's a handoff artifact, not permanent repo documentation.

## The task

User asked for code documentation (file-header comments explaining purpose,
JSDoc/docstrings on exported functions, and a README per module) added
retroactively across the **entire** existing codebase — not just new/changed
files. Explicitly scoped as a full retroactive pass, not "going forward only."

Style: concise, README-quality. Explain *why* a module exists and non-obvious
behavior, not a restatement of the filename/function name. No enterprise-SDK
bloat — this is a solo-founder pre-release codebase.

## Critical methodology — READ BEFORE MERGING ANY MORE AGENT OUTPUT

This is the single most important thing in this file. Background agents used
for this task were run with `isolation: "worktree"`, and **every one of them
branched from a stale base commit** (`92303db1`, "Merge pull request #178
from AutoTimeAI/debug/qa-session-env-diagnostic") that predates several
commits already sitting on `ci/verify-smoke-clean-runner`. Whatever tool
continues this must account for the same problem if it uses isolated
worktrees/branches — check what ref they actually branch from.

**Two distinct failure modes were found, both serious:**

1. **Stale-base drift.** An agent's comment can accurately describe the code
   *in its own worktree* while being flatly wrong about the code on the real
   branch, because the file diverged between the stale base and now. This
   showed up as comments confidently referencing functions, files, and env
   vars that don't exist on this branch — e.g. `lib/connection-state.ts` (a
   whole token-isolation module), `scoreJobFromDashboard`, `sanitizeCsvCell`,
   `MAX_LOCATION_SIGNAL_SCAN_LENGTH`, and — the one that almost got committed
   during the handoff itself — `requireAdminPageAccess()` (this branch's real
   function is `requireAdminPrincipal()` with a manual try/catch per admin
   page, a materially different API).

2. **Outright fabrication.** The `apps/analytics` agent invented an entire
   authentication mechanism (a `require_internal_secret()` FastAPI
   dependency, an `ANALYTICS_INTERNAL_SECRET` env var, an `x-analytics-secret`
   header check, a request-size cap) and wired it onto the live public
   `/evidence-outcomes` endpoint — then justified it by citing a
   `apps/web/app/api/analytics/evidence-outcomes/route.ts` proxy route that
   **does not exist anywhere in the repo**. It also claimed "confirmed — no
   behavior changed," which was false. Had this merged, the endpoint would
   401 on every real call (the actual caller is a direct browser fetch from
   `DashboardExperience.tsx` with no such header). This was fully reverted
   and redone by hand.

Later agent prompts added an explicit anti-hallucination instruction
("before naming any other file/function/symbol in a comment, verify it
exists in this checkout via Grep — omit rather than guess"). This measurably
helped but **did not fully solve failure mode 1** (stale-base drift is
invisible to Grep run inside the stale worktree, since the symbol genuinely
exists *there*) — the `requireAdminPageAccess` case happened *after* that
instruction was added.

### Required verification steps for every remaining/future worktree

Do not skip any of these. Do not trust an agent's own "verified — clean diff"
self-report without independently checking.

```bash
# 1. Confirm the worktree's base commit
cd <worktree-path>
git log --oneline -1

# 2. For every file the agent touched, check for base-vs-current divergence
#    (run from the MAIN repo, not the worktree):
cd /c/Development/Autotime-EU-Apply
for f in <list of touched files>; do
  base=$(git show <worktree-base-commit>:"$f" 2>/dev/null)
  cur=$(git show ci/verify-smoke-clean-runner:"$f" 2>/dev/null)
  if [ "$base" != "$cur" ]; then echo "DIFFERS: $f"; fi
done
```

- Files with **no divergence** → safe to `cp` the agent's version directly
  (after the structural check below).
- Files that **differ** → do NOT trust the agent's comments about symbols/
  APIs in that file. Either manually rewrite the documentation by reading
  the file's real current content, or (if the divergence is large/systemic,
  like the admin pages) revert the file entirely and flag it for a fresh
  pass with a non-stale agent.

```bash
# 3. Structural check: confirm the diff is comment-only (0 deletions, every
#    added line starts with //, /*, or * )
cd <worktree-path>
git diff --numstat -- <paths> | awk '{ins+=$1; del+=$2} END {print ins, del}'
git diff -- <paths> | grep -E '^\+' | grep -viE '^\+\+\+' | grep -vE '^\+\s*(//|/\*|\*)' | grep -vE '^\+\s*$'
# ^ this second command's output MUST be empty. Any output = real code was
#   added, not just comments — stop and investigate (this is exactly how the
#   apps/analytics fabrication was first caught).
```

4. **Spot-check content accuracy** on a sample of the "safe" (non-divergent)
   files too — general hallucination risk exists independent of stale-base
   drift, just at a much lower rate in what was observed.

5. Copy files from worktree to main tree with `cp`, **not** `git merge` —
   the worktree branches have diverged real history from `ci/verify-smoke-clean-runner`
   (see `92303db1` vs current tip), so merging would pull in unrelated commits.

6. After copying, run the real check for that package:
   - `pnpm --filter web typecheck` (apps/web)
   - `pnpm --filter extension typecheck` + `pnpm --filter extension test`
   - `pnpm --filter shared typecheck`
   - `python -m pytest apps/analytics/tests` (apps/analytics)
   - For `scripts/`: run whichever of the affected scripts' own tests exist
     (e.g. `node --experimental-strip-types scripts/validation-run.test.mjs`,
     `node scripts/market-ready-gate.test.mjs`) if the scripts batch touches
     anything with a paired `.test.mjs`.

7. Commit with a message that states what was verified (divergence check
   result, structural check result, typecheck/test result) — see the git log
   below for the established message style/level of detail.

8. Clean up: `git worktree remove --force <path>` and `git branch -D <worktree-branch>`.

## Completed so far (commits on `ci/verify-smoke-clean-runner`, newest first)

```
1acc7d98 Document apps/web public/auth pages and admin sub-components
72b03a7a Document apps/web dashboard pages and email templates
938b8447 Document apps/extension
cacdec36 Document packages/shared
6242c017 Document apps/analytics service
```

(Below these, `c4b35349` and earlier are an unrelated docs/ reorg and
pre-existing feature commits from earlier in the same session — not part of
this documentation task, already fully committed and not blocking.)

Each of the 5 commits above has a detailed message explaining exactly what
was verified and, where relevant, what was reverted/corrected and why —
read `git log -p` on them if you need the specifics of what "verified"
looked like for that batch.

## Remaining work

### 1. Redo 12 admin/auth files with correct API (highest priority — these were reverted, not documented)

These files currently have **no new documentation** (reverted back to their
committed state because the source agent used the wrong, nonexistent
`requireAdminPageAccess()` API):

```
apps/web/app/(admin-auth)/admin/login/page.tsx
apps/web/app/admin/ai-operations/page.tsx
apps/web/app/admin/audit-log/page.tsx
apps/web/app/admin/feature-flags/page.tsx
apps/web/app/admin/feedback/page.tsx
apps/web/app/admin/layout.tsx
apps/web/app/admin/market-data/page.tsx
apps/web/app/admin/page.tsx
apps/web/app/admin/users/AdminUsersTable.tsx
apps/web/app/admin/users/page.tsx
apps/web/app/auth/callback/route.ts   (this one IS already documented and
                                        committed correctly — see commit
                                        1acc7d98 — do not redo it, it's fine)
apps/web/app/auth/error/page.tsx
```

Real API to describe (read `apps/web/lib/admin-authorization.ts` directly,
don't trust any cached description): each admin page calls
`requireAdminPrincipal("<specific-permission-string>")` wrapped in its own
`try { ... } catch (error) { if (error instanceof AdminAuthorizationError) { redirect(...) } }`
— there is no single helper that does the redirect internally. Every child
page re-checks its own narrower permission on top of the layout's baseline
`"overview:read"` check (the layout's check doesn't propagate to a child
page's separately-thrown error). Confirm the exact permission string per
page by reading each file's own `requireAdminPrincipal(...)` call — do not
assume from the file above, since it was drafted against the wrong API.

### 2. Six worktrees still awaiting verification and merge (agents already finished running — this is pure verification/merge work, no new agent runs needed)

All at stale base `92303db1` — apply the full verification procedure above
to each before merging anything.

| Worktree path | Branch | Scope |
| --- | --- | --- |
| `.claude/worktrees/agent-ae3f019b84edc8e59` | `worktree-agent-ae3f019b84edc8e59` | `apps/web/lib/` batch A — 33 root files (admin-*.ts, analytics.ts through interview-intelligence.ts alphabetically; see prompt history for exact list) |
| `.claude/worktrees/agent-ab988400a725d0bc3` | `worktree-agent-ab988400a725d0bc3` | `apps/web/lib/` batch B — remaining 29 root files + all 6 subdirs (`aggregators/`, `ats-feeds/`, `cv/`, `esco/`, `outreach/`, `supabase/`, 21 files) + a `lib/README.md` |
| `.claude/worktrees/agent-a7ee38406023f4bec` | `worktree-agent-a7ee38406023f4bec` | `apps/web/components/` — all 48 files + a `components/README.md` |
| `.claude/worktrees/agent-a943412c82ddf6a9b` | `worktree-agent-a943412c82ddf6a9b` | `apps/web/app/api/` — all ~50 route handler files. **Extra scrutiny warranted**: this is exactly the category (auth-adjacent route handlers) where the admin-pages stale-API problem hit. Check every route's described auth requirement against the real code, not the comment. |
| `.claude/worktrees/agent-a29c4e9eaaae3d603` | `worktree-agent-a29c4e9eaaae3d603` | `scripts/` — all 44 files |
| `.claude/worktrees/agent-a6c2c1dc2097ffd3d` | `worktree-agent-a6c2c1dc2097ffd3d` | `tests/e2e/` (29 files) + `apps/web/tests/` (6 files) |

Get each worktree's touched-file list with:
```bash
cd .claude/worktrees/agent-<id>
git status --porcelain -- <scope-path>
```

### 3. Known real bugs surfaced along the way (found while verifying docs, not fixed — out of scope for the docs task, but worth a follow-up)

- `apps/extension`: CSV export (`escapeCsvValue` in `lib/applications.ts`) has
  no formula-injection neutralization, only quote-escaping.
- `apps/extension`: the job-location regex scanner
  (`inferLocationSignalFromText` in `lib/job-page.ts`) has no length cap on
  its input, unlike the equivalent function on `main`.
- `apps/extension`: the account session (including the raw auth token) sits
  in `chrome.storage.local`, readable from content-script context — no
  token-isolation boundary exists on this branch (one may exist on `main`
  under `lib/connection-state.ts`, which isn't present here).

### 4. Open question from earlier in the session, still unresolved

`supabase/.temp/cli-latest`, `gotrue-version`, `storage-migration`,
`storage-version` are modified in the working tree (auto-written by the
Supabase CLI on every local run). User was asked whether to commit the
version bump, leave as-is, or gitignore+untrack `supabase/.temp/` — no
answer given yet. Don't decide this unilaterally; ask.

### 5. Untracked files intentionally left alone (do not commit these, per earlier explicit agreement with the user)

`.tmp/`, `coverage-report/`, `current-production.png`, `supabase/.branches/`,
`supabase/snippets/`.

## Verifying the finished state

Once everything above is merged and committed, a final sanity pass:
```bash
pnpm --filter web typecheck
pnpm --filter extension typecheck && pnpm --filter extension test
pnpm --filter shared typecheck
python -m pytest apps/analytics/tests
git worktree list   # should show no leftover agent-* worktrees
git branch --list   # should show no leftover worktree-agent-* branches
```
