# Release Candidate Record

## Status: PROVISIONAL RELEASE CANDIDATE

No release SHA has been designated by the founder as of this
assessment. Per the operating rules, current `main` HEAD is being
used provisionally and is explicitly **not** to be described as a
frozen release until a founder decision is recorded here.

## Record

| Field | Value |
|---|---|
| Release branch | `main` |
| Release SHA (provisional) | `130ca9ae5f9038e4eece27ad9a3eb549af431a3a` |
| Tag | None — latest real tag is `v0.1.2-pre-commercial-prod` @ `a49fa27402ab13d1fa7b215ff9cc0bd1b63f9267` (2026-08-08), 15 days and ~65 merged PRs behind this SHA |
| Build identifier | Not assigned — no CI build-artifact ID surfaced to this assessment |
| Deployment identifier | Unknown — no Vercel access |
| Deployed SHA | **Unverified**. A read-only GET to `https://autotime-eu-apply.vercel.app/api/diagnostics/health` did not return a parseable SHA/version marker from this seat. |
| Test start time | 2026-08-23 (this assessment's discovery phase) |
| Test completion time | Not yet complete — see `docs/qa/06-test-execution-report.md` once populated |

## Deployment-verification gate

Per §3 rule 6: **if the deployed build cannot be matched to the
tested SHA, mark deployment verification BLOCKED and apply NO-GO.**

**Current status: BLOCKED.**

Closing this requires one of:
1. Founder provides the Vercel deployment ID/SHA currently live in production, or
2. Founder grants Vercel dashboard/CLI access so this assessment can retrieve it directly, or
3. Founder confirms the correct authenticated way to query `/api/diagnostics/health` (it may require the `ANALYTICS_INTERNAL_SECRET` header or similar, which this assessment does not have and will not guess or brute-force).

## What "frozen" will mean once designated

Once a release SHA is designated:
- No further code changes land on that SHA without a new record here.
- Final regression, smoke, and production-verification evidence in
  `test-evidence/<sha>/` must all reference that exact SHA.
- If any mandatory gate's evidence was collected against a different
  SHA than the one ultimately deployed, that gate reverts to NOT RUN
  and must be re-executed against the real release SHA.

## Interim commit history since the last tag (context, not evidence)

`v0.1.2-pre-commercial-prod` → current HEAD spans PRs #88 through
#176, including: a real AI-billing race-condition fix (#100), an
atomic AI-credit reservation system, Stripe webhook idempotency, an
open-redirect security fix (#172), numerous cross-user
ownership-verification fixes, and this session's full audit-and-merge
sprint. This is included here only as context for why the last tag is
not an acceptable stand-in for "current state" — not as a substitute
for founder sign-off on a real cut point.
