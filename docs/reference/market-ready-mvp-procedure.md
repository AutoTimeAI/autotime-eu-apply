# Market-Ready MVP Procedure

Use this when moving AutoTime EU Apply from completed MVP candidate to
market-ready controlled pilot.

## Gate Definition

The MVP is market-ready only when all three layers are complete:

1. Automated quality checks pass.
2. Manual Chrome and V2 dashboard smoke evidence is recorded.
3. Five real UK/EU job rows and export metrics are recorded in a founder
   validation report.

Until those are done, call the product a completed local-first MVP candidate,
not a market-ready MVP.

## Step 1: Run Automated Checks

Run the full local automated gate:

```bash
pnpm market:ready:automated
```

By default this skips the deployed live smoke check inside the MVP automation
toolkit. If the deployed dashboard should be checked live too, run:

```bash
node scripts/market-ready-gate.mjs --run-automated --live-smoke
```

Expected result before manual evidence is complete: the automated checks can
pass, then the market-ready evidence gate will fail with the missing report
items. That is useful; it tells you exactly what still needs proof.

## Step 2: Create A Fresh Evidence Report

```bash
pnpm validation:new
```

This creates a new file in:

```text
docs/founder-validation-runs/
```

Use the newest generated report as the release evidence file.

## Step 3: Build And Load The Extension

```bash
pnpm build:extension
```

Then open `chrome://extensions`, enable Developer mode, and load or reload:

```text
apps/extension/.output/chrome-mv3
```

Fill the report fields for Chrome version, operating system, extension smoke
result, privacy checks, AI setting used, and usage/cost log result.

## Step 4: Complete Manual Smoke Tests

Use:

```text
docs/extension-smoke-test.md
docs/v2-smoke-test.md
```

Record both results in the founder validation report.

Required evidence:

- no auto-submit observed
- autofill only after explicit click
- saved content insertion only into empty matching textareas
- LinkedIn manual copy/paste only
- CSV export is local saved data only
- AI key/fallback behavior and usage log checked

## Step 5: Validate Five Real UK/EU Roles

Record one role for each source:

- LinkedIn: manual copy/paste only
- Greenhouse: live import must work
- Lever: live import must work
- Workday: live import must work
- Other UK/EU job source: import or manual fallback must work

Each row needs role, company, country, URL/source, import result, content result,
status, and outcome notes. For non-LinkedIn rows, `Import OK` should be `Yes`
only after the page captures the useful fields exposed by the job page.

## Step 6: Export Evidence

From the extension:

1. Export Applications CSV.
2. Export Validation Metrics CSV.
3. Review that the Applications CSV contains only locally saved application
   data.
4. Record the headline metrics in the founder validation report.

If the V2 dashboard flow changed, also export and import the V2 dashboard JSON
and record that result.

## Step 7: Run The Final Gate

Run against the newest validation report:

```bash
pnpm market:ready:gate
```

Or run against a specific report:

```bash
node scripts/market-ready-gate.mjs --evidence docs/founder-validation-runs/YOUR-FILE.md
```

When this passes, the MVP has enough evidence for a controlled market pilot.

## Step 8: Tag The Release

After the gate passes and the worktree is clean:

```bash
git status --short
git tag v0.0.2
```

Recommended release wording:

```text
AutoTime EU Apply V1 is market-ready for a controlled founder-led pilot.
It is not yet a public-scale Chrome Web Store launch until pilot feedback,
privacy copy, onboarding copy, and support handling are complete.
```
