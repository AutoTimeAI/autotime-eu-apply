# Blind review instructions

Produced by `pnpm export:blind-review-artifact`
(`scripts/export-blind-review-artifact.mjs`) — item B of
`docs/reference/landwell-master-execution-plan.md` §5.3: the first
blind-reviewer labeling cycle doesn't need the (not yet built)
expert-signoff admin UI, this CSV satisfies it.

## Files

- `blind-review-artifact.csv` — hand this to the reviewer. Vacancy text and
  candidate evidence only, no engine output.
- `blind-review-artifact-engine-output.csv` — the engine's own decision for
  the same cases. **Do not open this, or show it to the reviewer, until
  every `reviewer_label` cell in the blind artifact is filled in.** Seeing
  the engine's answer first defeats the purpose of an independent label.

## What the reviewer does

For each row, read only `vacancy_text` and `candidate_evidence`, then fill in:

- `reviewer_label` — one of `Apply`, `Consider`, `Insufficient information`
  (the same three outcomes the product itself can produce — reviewers judge
  the same decision space, not a different scale).
- `reviewer_reasoning` — one or two sentences on why, especially for
  anything corridor/sponsorship-specific.
- `reviewer_name` — who labeled it, for traceability if a second reviewer
  is later added.

Where legal/pathway correctness matters (sponsorship route validity, salary
threshold interpretation), only a qualified mobility/employment-law
reviewer's label counts for that dimension — a general reviewer can still
label the applied-decision question, but flag legal cells as unverified
per the validation plan's own fallback rule (§5.2).

## After labels are in

Compare `reviewer_label` against `engine_decision` per case. Agreement rate
and disagreement details are what step 4 of the master plan's sequencing
(§6) — the real end-to-end evaluation — is built on. Disagreements get
classified using the validation plan's failure taxonomy (critical false
certainty → jurisdiction/entity errors → unsupported legal conclusions →
role-domain failures → UX/workflow failures) and repaired in that order.

## Regenerating the artifact

Re-run `pnpm export:blind-review-artifact` any time
`scripts/real-vacancy-evaluation-cases.mjs` gains new cases. It overwrites
both CSVs from the current case list — save labeled rows elsewhere first if
a review round is already in progress.
