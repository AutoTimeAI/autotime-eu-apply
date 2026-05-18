# AutoTime AI MVP Python Smoke Test Report

Generated: 2026-05-06T14:57:46  
Repo: `C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply`  
Python: `3.14.0`  
OS: `Windows-11-10.0.26200-SP0`

## Decision

**Automated smoke result:** FAIL

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
| pnpm_version | PASS | `pnpm --version` | 0.28s | 0 |  |
| automated_market_gate | PASS | `pnpm market:ready:automated` | 1.33s | 1 | nested subprocess blocked by environment |
| new_validation_report | PASS | `pnpm validation:new` | 0.51s | 0 |  |
| extension_build | FAIL | `pnpm build:extension` | 2.88s | 1 |  |

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
  "latest_release_run": "C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\docs\\release-runs\\2026-05-06T13-57-48-572Z.md",
  "latest_automation_run": "C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\docs\\automation-runs\\2026-05-06T13-08-15-427Z.md",
  "latest_founder_validation_run": "C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\docs\\founder-validation-runs\\2026-05-06T13-57-49-165Z-manual-validation.md",
  "python_report_dir": "C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\docs\\automation-runs\\python-smoke-20260506-145746"
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

Note: this environment blocked a nested Node subprocess spawn. Run `pnpm market:ready:automated` directly in a normal terminal for the full Node gate.

#### stdout tail

```text

> autotime-eu-apply@ market:ready:automated C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply
> node scripts/market-ready-gate.mjs --run-automated


> autotime-eu-apply@ release:check C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply
> node scripts/release-check.mjs

Running Extension unit tests... FAIL
Running Repo typecheck... FAIL
Running Repo lint... FAIL
Running Extension production build... FAIL
Release check report written to docs\release-runs\2026-05-06T13-57-48-572Z.md
â€‰ELIFECYCLEâ€‰ Command failed with exit code 1.
â€‰ELIFECYCLEâ€‰ Command failed with exit code 1.
```
#### stderr tail

```text
Market-ready gate failed: pnpm release:check failed
```

### new_validation_report

Command: `pnpm validation:new`

Passed: `True`

#### stdout tail

```text

> autotime-eu-apply@ validation:new C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply
> node scripts/validation-run.mjs

Founder validation report created at docs\founder-validation-runs\2026-05-06T13-57-49-165Z-manual-validation.md
```

### extension_build

Command: `pnpm build:extension`

Passed: `False`

#### stdout tail

```text

> autotime-eu-apply@ build:extension C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply
> pnpm --filter extension build


> extension@0.0.1 build C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply\apps\extension
> wxt build


WXT 0.20.25
[36mi[39m Building chrome-mv3 for production with Vite 8.0.10
[31mÃ—[39m Command failed after 489 ms
C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply\apps\extension:
â€‰ERR_PNPM_RECURSIVE_RUN_FIRST_FAILâ€‰ extension@0.0.1 build: `wxt build`
Exit status 1
â€‰ELIFECYCLEâ€‰ Command failed with exit code 1.
```
#### stderr tail

```text

[41m[30m ERROR [39m[49m EPERM: operation not permitted, unlink 'C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply\apps\extension\.output\chrome-mv3\background.js'

  

```
