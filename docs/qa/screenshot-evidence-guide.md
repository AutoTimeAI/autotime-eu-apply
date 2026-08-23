# Screenshot and Visual-Evidence Standard

Governs any screenshot captured as evidence for this release-assurance
program, per §12 of the assessment brief.

## When to use a screenshot

Important user journeys, UI results, validation errors, access-denied
states, admin restrictions, privacy actions, accessibility states,
responsive states, visual-regression differences, extension states,
and monitoring dashboards (where safe). **Not** required for every
unit/backend test — prefer assertion output, API responses, database
results, traces, or structured logs for those (already the pattern
this assessment followed throughout `docs/qa/06-test-execution-report.md`).

## Filename convention

```
<test-id>_<step-number>_<short-description>_<status>.png
```

Example: `RLS-004_05_cross-user-update-denied_PASS.png`

## Storage location

`test-evidence/<release-sha>/<area>/` — see the tree under
`test-evidence/130ca9ae5f9038e4eece27ad9a3eb549af431a3a/` created
alongside this guide. Screenshots are **not committed to git** by
default — `test-evidence/` is gitignored except for the
`evidence-index.csv` and `execution-manifest.json` templates, per the
assessment brief's instruction to retain safe indexes without
committing potentially sensitive captured evidence. If a specific
screenshot is confirmed to contain no personal data and is worth
keeping in version control (e.g. for a public-facing landing page),
add it explicitly with `git add -f`.

## Rules

- Capture sufficient context — not a tight crop that loses the state being demonstrated.
- Use before/action/after evidence where the test genuinely needs a sequence.
- **Mask emails, names, identifiers, and any personal data** before saving. If the QA test account's own seeded fake data is visible, that's acceptable (it's synthetic per `docs/qa-test-account.md`) — but never a real user's data.
- Exclude tokens/secrets from the frame entirely (not just blurred — cropped out or the browser closed before any secret was visible).
- Never fabricate or reuse an unrelated screenshot as if it were evidence for a different test.
- Link every screenshot to its Test ID in `test-evidence/<sha>/evidence-index.csv`.
- Record viewport and browser in the index.
- Hash the file (SHA-256) and record the hash in the index.
- Prefer the existing app screenshot conventions already established in this repo (`screenshots/` at repo root, used by several existing Playwright specs) where a spec already produces one — don't duplicate.

## Existing screenshot inventory (context, not new work)

`screenshots/` at repo root already has 130 files across 12
subdirectories, produced as a side effect of existing Playwright
specs. This assessment does not modify or regenerate those — running
the full local suite during this pass regenerated several of them
with broken config-unavailable renders (see `DEF-001`) and those
changes were reverted, not committed, to avoid corrupting the
existing baseline with this environment's config gap.
