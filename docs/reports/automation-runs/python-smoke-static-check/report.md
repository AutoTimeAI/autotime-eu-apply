# AutoTime AI MVP Python Smoke Test Report

Generated: 2026-05-06T15:00:56  
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
  "python_report_dir": "C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\docs\\automation-runs\\python-smoke-static-check"
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
