# Installed extension validation

**Product:** AutoTime EU Apply Chrome extension 0.0.4  
**Date:** 9 September 2026  
**Build:** `apps/extension/.output/chrome-mv3`  
**Browser:** Isolated Chromium persistent profile  
**Result:** Pass with scope limitations

Every executed extension-related case is listed in the [extension test-case CSV](extension-test-case-catalogue-2026-09-09.csv).

## Complete extension gate

| Gate | Result | Detail |
| --- | --- | --- |
| Extension unit suite | Pass | 81/81 checks passed |
| TypeScript validation | Pass | `tsc --noEmit -p tsconfig.json` |
| Production MV3 build | Pass | WXT 0.20.25 generated a 209.19 KB unpacked build |
| Chrome ZIP packaging | Pass | 74.64 KB, eight expected archive entries |
| Packaged artifact integrity | Pass | SHA-256 `8B47E9ABFD4C6C4F975AE6FB701433F7BF56F886458D8B337CBAA227FF0BCCF2` |
| Fresh-build installed-runtime validation | Pass | Service worker, injection, parsing, save and reload persistence passed |
| Platform registry and capture policy | Pass | 6/6 checks passed across the 38-platform registry |
| ATS/job aggregation and LinkedIn policy | Pass | 34/34 checks passed |
| Web cloud-sync boundary contracts | Pass | 16/16 checks passed |
| Production-hardening contracts | Pass | 47/47 checks passed, including extension connection/error handling |
| Extension-linked browser journeys | Pass | LinkedIn-shaped import plus desktop/mobile Extension navigation passed |
| Offline ATS fixture validation | Pass | Greenhouse, Lever, Workday and Ashby role parsing passed after fixture input alignment |

The automated and isolated installed-extension scope is complete. This is not a claim that external production integrations or human usability certification are complete.

## Executed checks

| Check | Result | Evidence |
| --- | --- | --- |
| MV3 package loads | Pass | Background service worker registered under extension ID `gbakhnmncdpcekjibjanihjamcofohoh` |
| Runtime content-script injection | Pass | `content-scripts/autotime.js` injected into a supported HTTPS tab |
| Widget rendering | Pass | Visible `#autotime-draggable-job-widget` shadow host rendered |
| Widget controls | Pass | Track Job, Autofill, Connect, close and resize controls present and enabled |
| Supported-board detection | Pass | Live StepStone vacancy detected |
| Job title | Pass | `Software Engineer (m/w/d)` |
| Company | Pass | `Bank11 für Privatkunden und Handel GmbH` |
| Location | Pass | `Neuss, de` |
| Description extraction | Pass | 428 visible words parsed |
| Unsigned local save | Pass | One application record written without account authentication |
| Reload persistence | Pass | Widget restored and saved-record count remained one after page reload |
| Search-results behavior | Pass | Search page displayed a clear “Could not detect job details” state; detail page parsed successfully |
| Permission scope | Pass | Manifest limited to `activeTab`, `scripting`, `storage` and declared supported hosts |

## Observations

- The package intentionally provides a floating page widget. It declares no popup or Chrome side-panel entry, consistent with the current extension README.
- StepStone emitted minified React hydration errors (`#418`, `#423`, `#425`) before and after injection. These were host-page errors, not extension service-worker failures.
- No account was used. Cloud synchronization, authenticated Connect behavior and server reconciliation remain production-integration tests.

## Scope limitations

- Chromium automation cannot natively dispatch a physical Chrome toolbar-icon click. The validation invoked the same background injection operations that the registered `chrome.action.onClicked` handler calls.
- Human visual inspection of toolbar discoverability, dragging/resizing feel and assistive-technology behavior remains separate usability evidence.
- Autofill was not submitted against a real employer form to avoid changing external state.
- Authenticated dashboard connection, token refresh and cloud reconciliation were not exercised against production credentials.
- The live installed-runtime check covered StepStone. The 81-case unit suite covers parsing, routing or policy behavior for the broader platform matrix, but it is not equivalent to a live installed run on every job board/ATS.

## Live platform status

The read-only 38-platform probe produced 25 passes, 8 inconclusive results and 5 failures. It does not change external data.

| Category | Platforms |
| --- | --- |
| Access-blocked/inconclusive | Indeed, InfoJobs, Monster, JobTeaser, Honeypot, NoFluffJobs, CEEhiring, iCIMS |
| Stale/unreachable sample | Jobgether (HTTP 410) |
| Verifier requires method-aware feed handling | Workday (public CXS search expects POST rather than the probe's GET) |
| Feed/sample drift | BambooHR, Teamtailor, Jobvite |

These live-probe outcomes remain release evidence gaps. They do not invalidate the passing deterministic platform-policy tests, but the affected platforms must not be advertised as freshly live-verified until their evidence is renewed.

## Defects repaired during completion pass

- Removed global `networkidle` waits from the extension-linked mobile navigation test. A continuously loading Contacts panel caused a false 120-second timeout even though navigation, focus and account-menu assertions had succeeded. The test now uses URL, visible-content and `aria-current` readiness signals and passes 2/2.
- Updated the offline ATS validation fixture to provide an explicit visible heading. The production parser intentionally stopped guessing role titles from browser page titles, but the legacy validation script still supplied only `title`.

## Reproduction

Run:

```text
node scripts/validate-installed-extension.mjs
```

The script creates an isolated temporary browser profile, loads the unpacked MV3 build, exercises a live supported vacancy, verifies local persistence, closes the browser and removes the temporary profile.
