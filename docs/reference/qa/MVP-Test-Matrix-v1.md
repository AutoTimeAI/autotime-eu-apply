# MVP Test Matrix v1

Owner: Product / QA
Last updated: 2026-05-14
Status: Draft

## Scope

This matrix tracks core MVP coverage for Autotime EU Apply. Add one row per meaningful user workflow, integration, permission rule, or regression risk.

> This matrix predates and complements `docs/qa/AutoTime-EU-Apply-QA-Documentation.xlsx`
> (2026-08-21), which covers the automated test suite (123 test cases across
> the local-fixture and production Playwright suites) with embedded
> screenshot evidence. This file remains the record for manually-tracked
> scenarios such as the browser extension rows below.

## Priority Guide

| Priority | Meaning |
| --- | --- |
| P0 | Must work before showing anyone |
| P1 | Important but can improve after MVP |
| P2 | Nice to validate |

## Test Matrix

| ID | Area | Scenario | Preconditions | Steps | Expected Result | Priority | Coverage | Status | Evidence | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EXT-01 | Extension | Install extension | Browser supports extension install | Install the extension in the target browser | Extension installs successfully | P0 | Manual | Pass |  |  |
| EXT-02 | Extension | Open extension popup | Extension is installed | Click the extension icon | Extension popup opens successfully | P0 | Manual | Pass |  |  |
| EXT-04 | Extension | Detect job page | Extension is installed and browser is on a supported job page | Open extension popup on job page | Extension detects the job page | P0 | Manual | Pass |  |  |
| EXT-05 | Extension | Capture job title | Extension has detected job page | Inspect captured job data | Job title is captured correctly | P0 | Manual | Pass |  |  |
| EXT-06 | Extension | Capture company | Extension has detected job page | Inspect captured job data | Company is captured correctly | P0 | Manual | Pass |  |  |
| EXT-07 | Extension | Capture location | Extension has detected job page | Inspect captured job data | Location is captured correctly | P1 | Manual | Pass |  |  |
| EXT-10 | Extension | Click Track Job | Extension has captured job details | Click Track Job | Job is tracked without error | P0 | Manual | Pass |  |  |
| DASH-03 | Dashboard | Saved job appears | Job has been tracked from extension | Open dashboard saved jobs view | Saved job appears in dashboard | P0 | Manual | Pass |  |  |
| DASH-05 | Dashboard | Change job status | Saved job exists in dashboard | Change saved job status | Job status updates successfully | P1 | Manual | Pass |  |  |
| SYNC-01 | Sync | Extension to dashboard sync works | Extension and dashboard are connected to same account | Track job from extension and check dashboard | Tracked job syncs from extension to dashboard | P0 | Manual | Pass |  |  |

## Status Values

Use: `Not Run`, `Pass`, `Fail`, `Blocked`, `Retest`.

## Evidence Convention

Store screenshots, videos, logs, and exports under `docs/qa/Test-Evidence/`. Link evidence from the matrix row using a relative path.
