# AutoTime AI MVP Python Smoke Test Report

Generated: 2026-05-06T15:05:28  
Repo: `C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply`  
Python: `3.14.0`  
OS: `Windows-11-10.0.26200-SP0`

## Decision

**Automated smoke result:** PASS

This Python runner checks local build, repo, output, and report readiness only.
It does not automate LinkedIn, browser form entry, or application submission.
Manual live-site evidence is still required before a market-ready pilot decision.

## Repo Shape

```json
{
  "repo_path": "C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply",
  "exists": true,
  "package_json_exists": true,
  "pnpm_lock_exists": true,
  "pnpm_workspace_exists": true,
  "apps_dir_exists": true,
  "docs_dir_exists": true,
  "scripts_dir_exists": true,
  "expected_package_scripts": [
    "build:extension",
    "dev:web",
    "market:ready:automated",
    "market:ready:gate",
    "validation:new"
  ],
  "missing_package_scripts": [],
  "passed": true
}
```

## Command Results

| Check | Result | Command | Duration | Return code | Note |
|---|---:|---|---:|---:|---|
| node_version | PASS | `node --version` | 0.03s | 0 |  |
| pnpm_version | PASS | `pnpm --version` | 0.32s | 0 |  |
| automated_market_gate | PASS | `pnpm market:ready:automated` | 47.28s | 1 | manual evidence pending |
| new_validation_report | PASS | `pnpm validation:new` | 0.68s | 0 |  |
| extension_build | PASS | `pnpm build:extension` | 3.71s | 0 |  |

## Extension Output

```json
{
  "path": "C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\apps\\extension\\.output\\chrome-mv3",
  "exists": true,
  "required_files": {
    "manifest.json": true
  },
  "manifest": {
    "name": "AutoTime EU Apply",
    "version": "0.0.1",
    "manifest_version": 3,
    "permissions": [
      "activeTab",
      "sidePanel",
      "storage"
    ],
    "host_permissions_count": 1
  },
  "passed": true
}
```

## Latest Evidence Paths

```json
{
  "latest_release_run": "C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\docs\\release-runs\\2026-05-06T14-05-42-344Z.md",
  "latest_automation_run": "C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\docs\\automation-runs\\2026-05-06T14-06-15-619Z.md",
  "latest_founder_validation_run": "C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\docs\\founder-validation-runs\\2026-05-06T14-06-16-980Z-manual-validation.md",
  "python_report_dir": "C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\docs\\automation-runs\\python-smoke-20260506-150528"
}
```

## Web Smoke Check

```json
{
  "skipped": true,
  "reason": "Run with --start-web to test the local dashboard URL."
}
```

## Manual Evidence Still Required

- [ ] LinkedIn manual copy/paste policy test
- [ ] Greenhouse live job import/content test
- [ ] Lever live job import/content test
- [ ] Workday live job import/content test
- [ ] Other source test
- [ ] Autofill safety test: explicit click only, no submit
- [ ] Saved content insertion safety test: no overwrite, no submit
- [ ] Applications CSV export reviewed
- [ ] Validation metrics CSV export reviewed
- [ ] Usage/cost log checked without recording API keys
- [ ] Final `pnpm market:ready:gate` after manual evidence is completed

## Detailed Command Logs

### node_version

Command: `node --version`

Passed: `True`

#### stdout tail

```text
v24.11.1
```

### pnpm_version

Command: `pnpm --version`

Passed: `True`

#### stdout tail

```text
10.33.0
```

### automated_market_gate

Command: `pnpm market:ready:automated`

Passed: `True`

Note: command reached the expected manual-evidence gate.

#### stdout tail

```text

> autotime-eu-apply@ market:ready:automated C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply
> node scripts/market-ready-gate.mjs --run-automated


> autotime-eu-apply@ release:check C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply
> node scripts/release-check.mjs

Running Extension unit tests... PASS
Running Repo typecheck... PASS
Running Repo lint... PASS
Running Extension production build... PASS
Release check report written to docs\release-runs\2026-05-06T14-05-42-344Z.md

> autotime-eu-apply@ test:mvp:coverage C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply
> node scripts/mvp-test-coverage.mjs

MVP automated testing coverage target met: 95% automated, 5% manual

> autotime-eu-apply@ test:validation-run C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply
> node scripts/validation-run.test.mjs

ok - formats stable validation report dates
ok - creates a validation report with build metadata
ok - includes the automated and manual testing gates
ok - keeps LinkedIn and live platform validation explicit
ok - includes export evidence and release decision sections
ok - finds the latest markdown report in a report directory

> autotime-eu-apply@ test:smoke:web C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply
> node scripts/smoke-web-dashboard.test.mjs

ok - passes when deployed dashboard HTML contains expected markers
ok - fails when response status is not successful
ok - fails when response is not HTML
ok - fails when expected dashboard markers are missing
ok - fails with fetch error message when request throws an Error
ok - fails with fallback message when request throws an unknown value
ok - reads default and environment override smoke URLs

> autotime-eu-apply@ test:web:interview C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply
> node --experimental-strip-types apps/web/tests/interview-prep.test.mjs

ok - creates local interview prep pack without AI
ok - normalizes partial AI interview prep output
ok - estimates interview prep OpenAI usage cost
ok - checks web AI budget and key availability
ok - generates AI interview prep from mocked OpenAI response

> autotime-eu-apply@ test:mvp C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply
> node scripts/mvp-automation-toolkit.mjs

Running Extension unit tests... PASS
Running Web AI interview-prep unit tests... PASS
Running Web smoke automation unit tests... PASS
Running Validation run generator tests... PASS
Running MVP automated testing coverage gate... PASS
Running Repo typecheck... PASS
Running Repo lint... PASS
Running Extension production build... PASS
Running Web production build... PASS
MVP automation report written to docs\automation-runs\2026-05-06T14-06-15-619Z.md
â€‰ELIFECYCLEâ€‰ Command failed with exit code 1.
```
#### stderr tail

```text
Market-ready gate failed for docs\founder-validation-runs\2026-05-06T13-57-49-165Z-manual-validation.md
- Chrome version is missing completed evidence
- Extension Smoke Test result is not completed
- V2 Dashboard Smoke Test result is not completed
- LinkedIn live row needs a real role title
- LinkedIn live row needs a real company
- LinkedIn live row needs a country
- LinkedIn Content OK must be marked Yes after live validation
- LinkedIn live row needs outcome notes
- Greenhouse live row needs a real role title
- Greenhouse live row needs a real company
- Greenhouse live row needs a country
- Greenhouse Import OK must be marked Yes after live validation
- Greenhouse Content OK must be marked Yes after live validation
- Greenhouse live row needs outcome notes
- Lever live row needs a real role title
- Lever live row needs a real company
- Lever live row needs a country
- Lever Import OK must be marked Yes after live validation
- Lever Content OK must be marked Yes after live validation
- Lever live row needs outcome notes
- Workday live row needs a real role title
- Workday live row needs a real company
- Workday live row needs a country
- Workday Import OK must be marked Yes after live validation
- Workday Content OK must be marked Yes after live validation
- Workday live row needs outcome notes
- Other live row needs a real role title
- Other live row needs a real company
- Other live row needs a country
- Other Import OK must be marked Yes after live validation
- Other Content OK must be marked Yes after live validation
- Other live row needs outcome notes
- Decision: MVP validation result must be completed
```

### new_validation_report

Command: `pnpm validation:new`

Passed: `True`

#### stdout tail

```text

> autotime-eu-apply@ validation:new C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply
> node scripts/validation-run.mjs

Founder validation report created at docs\founder-validation-runs\2026-05-06T14-06-16-980Z-manual-validation.md
```

### extension_build

Command: `pnpm build:extension`

Passed: `True`

#### stdout tail

```text

> autotime-eu-apply@ build:extension C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply
> pnpm --filter extension build


> extension@0.0.1 build C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply\apps\extension
> wxt build


WXT 0.20.25
[36mâ„¹[39m Building chrome-mv3 for production with Vite 8.0.10
[32mâœ”[39m Built extension in 849 ms
  â”œâ”€ .output\chrome-mv3\manifest.json                  498 B    
  â”œâ”€ .output\chrome-mv3\sidepanel.html                 406 B    
  â”œâ”€ .output\chrome-mv3\background.js                  2.74 kB  
  â”œâ”€ .output\chrome-mv3\chunks\sidepanel-LrJJjsva.js   283.22 kB
  â”œâ”€ .output\chrome-mv3\content-scripts\autotime.js    12.88 kB 
  â””â”€ .output\chrome-mv3\assets\sidepanel-B99_DNW6.css  3.21 kB  
Î£ Total size: 302.94 kB                              
[32mâœ”[39m Finished in 1.265 s
```
#### stderr tail

```text
[33m-[39m Preparing...
[1G
```
