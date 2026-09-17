# Baseline definition

## Comparison boundaries

CID uses three reproducible checkpoints rather than the ambiguous phrase “before R&D.”

| ID | Boundary | Meaning |
|---|---|---|
| B0 | Git commit `4b5e1c7e` (10 September 2026) | Pre-intensive-moat-R&D repository: acceptance-gate audit existed; the later evidence-deep package and new provenance foundation did not. |
| B1 | Phase 2 package dated 12 September 2026 | Research/design baseline represented by `docs/reports/evidence-deep-rd-2026-09/`; documentation, not implementation proof. |
| B2 | Working tree inspected 12 September 2026 | Post-R&D engineering checkpoint, including uncommitted files. Not a durable release until committed and deployed. |

To reproduce B0, use read-only Git commands such as `git ls-tree -r --name-only 4b5e1c7e` and `git diff --stat 4b5e1c7e -- <path>`. Because B2 contains uncommitted work, record a commit SHA before using it as an audit or release baseline.

## Production baseline

P0 and P1 are **unknown** until direct environment evidence is supplied. Repository reports mention prior release runs, but no inspected artifact proves that the three new mobility migrations, governed source jobs or decision writes operate in the intended production project. CID therefore records no before/after production uplift.

Required production identity: project/environment ID, deployment ID/commit, database migration ledger, UTC verification time and verifier. Required validation identity: cohort definition, consent basis, protocol/version, observations and analysis.

## Method and limitations

The comparison uses Git history, current files, automated-test artifacts and existing research audits. It does not use access to Supabase production, Vercel, Stripe, Resend, Sentry, Chrome Web Store or expert systems. Screenshots and local tests demonstrate only what they directly exercised. Absence from the inspected evidence means “not evidenced,” not necessarily “does not exist.”
