# AutoTime AI MVP Python Smoke Test Report

Generated: 2026-05-18T15:40:00<br>
Repo: `C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply`<br>
Python: `3.14.0`<br>
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
| pnpm_version | PASS | `pnpm --version` | 0.31s | 0 |  |
| automated_market_gate | PASS | `pnpm market:ready:automated` | 83.26s | 1 | manual evidence pending |
| new_validation_report | PASS | `pnpm validation:new` | 1.4s | 0 |  |
| extension_build | PASS | `pnpm build:extension` | 6.43s | 0 |  |

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
      "scripting",
      "storage"
    ],
    "host_permissions_count": 7
  },
  "passed": true
}
```

## Latest Evidence Paths

```json
{
  "latest_release_run": "C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\docs\\release-runs\\2026-05-18T14-40-18-140Z.md",
  "latest_automation_run": "C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\docs\\automation-runs\\2026-05-18T14-41-23-207Z.md",
  "latest_founder_validation_run": "C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\docs\\founder-validation-runs\\2026-05-18T14-41-25-892Z-manual-validation.md",
  "python_report_dir": "C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\docs\\automation-runs\\python-smoke-20260518-154000"
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
Release check report written to docs\release-runs\2026-05-18T14-40-18-140Z.md

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
ok - blocks interview prep when evidence is too thin
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
MVP automation report written to docs\automation-runs\2026-05-18T14-41-23-207Z.md
â€‰ELIFECYCLEâ€‰ Command failed with exit code 1.
```
#### stderr tail

```text
Market-ready gate failed for docs\founder-validation-runs\2026-05-18T14-34-16-365Z-manual-validation.md
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

Founder validation report created at docs\founder-validation-runs\2026-05-18T14-41-25-892Z-manual-validation.md
```

### extension_build

Command: `pnpm build:extension`

Passed: `True`

#### stdout tail

```text
DiagnosticEvent({
      area: "sync",
      event: completedEvent,
      message: "Locally saved jobs synced to dashboard.",
      status: "success",
      details: {
        applicationCount: syncedApplicationIds.length,
        deletedApplicationCount: deletedApplicationIds.length
      }
    })
    return undefined
  } catch (error: unknown) {
    const syncError = getErrorMessage(error)
    await updateApplicationSyncState(applicationIds, "failed", {
      error: syncError
    })
    await logDiagnosticEvent({
      area: "sync",
      event: failedEvent,
      message: syncError,
      status: "warning",
      details: { applicationCount: applications.length }
    })
    return syncError
  }
}

let retrySyncInFlight = false

async function retryPendingApplicationSync(reason: "installed" | "startup") {
  if (retrySyncInFlight) {
    return
  }

  retrySyncInFlight = true

  try {
    const session = await getAccountSession()

[REDACTED SENSITIVE LINE]
      await logDiagnosticEvent({
        area: "sync",
        event: [36mretry-sync-skipped-${reason}[39m,
        message: "Saved job sync retry skipped because no dashboard session exists.",
        status: "info"
      })
      return
    }

    const [applications, syncState] = await Promise.all([
      getApplications(),
      getApplicationSyncState()
    ])
    const retryableApplications = applications.filter((application) => {
      const status = syncState[application.id]?.status
      return status === "pending" || status === "failed"
    })

    if (retryableApplications.length === 0) {
      await logDiagnosticEvent({
        area: "sync",
        event: [36mretry-sync-empty-${reason}[39m,
        message: "No saved jobs need dashboard sync retry.",
        status: "info"
      })
      return
    }

    await syncApplicationsWithState({
      applications: retryableApplications,
      completedEvent: [36mretry-sync-completed-${reason}[39m,
      failedEvent: [36mretry-sync-failed-${reason}[39m,
      session,
      startedEvent: [36mretry-sync-started-${reason}[39m
    })
  } finally {
    retrySyncInFlight = false
  }
}

async function broadcastAccountConnected() {
  try {
    const tabs = await chrome.tabs.query({})

    await Promise.allSettled(
      tabs
        .filter((tab) => tab.id)
        .map((tab) =>
          chrome.tabs.sendMessage(tab.id as number, {
            type: "AUTOTIME_ACCOUNT_CONNECTED"
          })
        )
    )
  } catch (error: unknown) {
    await logDiagnosticEvent({
      area: "connect",
      event: "account-connected-broadcast-failed",
      message: getErrorMessage(error),
      status: "warning"
    })
  }
}

async function showWidgetInTab(tab: chrome.tabs.Tab) {
  if (!tab.id || !tab.url || !/^https?:\/\//i.test(tab.url)) {
    return
  }

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "AUTOTIME_SHOW_WIDGET"
    })
    return
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content-scripts/autotime.js"]
    })
  }

  await chrome.tabs.sendMessage(tab.id, {
    type: "AUTOTIME_SHOW_WIDGET"
  })
}

export default defineBackground(() => {
  chrome.action.onClicked.addListener((tab) => {
    void showWidgetInTab(tab)
  })

  chrome.runtime.onMessage.addListener(
    (
      message: InternalMessage,
      _sender,
      sendResponse: (response: InternalResponse) => void
    ) => {
      if (message?.type !== "AUTOTIME_SYNC_APPLICATIONS") {
        return false
      }

      void (async () => {
        const applications = Array.isArray(message.applications)
          ? (message.applications as ApplicationRecord[])
          : await getApplications()
        const applicationIds = applications.map((application) => application.id)
        const session = await getAccountSession()

[REDACTED SENSITIVE LINE]
          await updateApplicationSyncState(applicationIds, "pending")
          await logDiagnosticEvent({
            area: "sync",
            event: "widget-sync-skipped-unconnected",
            message: "Widget sync skipped because no dashboard session exists.",
            status: "info",
            details: { applicationCount: applications.length }
          })
          sendResponse({
            connected: false,
            ok: true,
            reason: "Click CONNECT to sync to dashboard",
            synced: false
          })
          return
        }

        const syncError = await syncApplicationsWithState({
          applications,
          completedEvent: "widget-sync-completed",
          failedEvent: "widget-sync-failed",
          session,
          startedEvent: "widget-sync-started"
        })

        sendResponse({
          connected: true,
          ok: true,
          reason: syncError ? [36mDashboard sync failed: ${syncError}[39m : undefined,
          synced: !syncError
        })
      })().catch((error: unknown) => {
        void logDiagnosticEvent({
          area: "sync",
          event: "widget-sync-unexpected-failed",
          message: getErrorMessage(error),
          status: "error"
        })
        sendResponse({
          error: getErrorMessage(error),
          ok: false,
          reason: [36mDashboard sync failed: ${getErrorMessage(error)}[39m,
          synced: false
        })
      })

      return true
    }
  )

  chrome.runtime.onInstalled.addListener(() => {
    void retryPendingApplicationSync("installed")
  })

  chrome.runtime.onStartup.addListener(() => {
    void retryPendingApplicationSync("startup")
  })

  chrome.runtime.onMessageExternal.addListener(
    (
      message: ExternalMessage,
      sender,
      sendResponse: (response: ExternalResponse) => void
    ) => {
      if (!isTrustedSender(sender)) {
        void logDiagnosticEvent({
          area: "connect",
          event: "external-message-untrusted",
          message: "Dashboard-to-extension message rejected because sender is not trusted.",
          status: "error",
          details: { senderUrl: sender.url ?? "missing" }
        })
        sendResponse({ error: "Untrusted sender", ok: false })
        return false
      }

      if (message.type === "AUTOTIME_PING") {
        void logDiagnosticEvent({
          area: "connect",
          event: "ping-received",
          message: "Dashboard preflight ping reached the extension.",
          status: "info"
        })
        void getAccountSession()
          .then((session) =>
            sendResponse({
[REDACTED SENSITIVE LINE]
              ok: true,
              version: chrome.runtime.getManifest().version
            })
          )
          .catch(() =>
            sendResponse({
              connected: false,
              ok: true,
              version: chrome.runtime.getManifest().version
            })
          )

        return true
      }

      const session = parseAccountSession(message)

      if (!session) {
        void logDiagnosticEvent({
          area: "connect",
          event: "connect-invalid-message",
          message: "Connection message did not include a valid account session.",
          status: "error"
        })
        sendResponse({ error: "Invalid account session", ok: false })
        return false
      }

      void saveAccountSession(session)
        .then(async () => {
          await logDiagnosticEvent({
            area: "connect",
            event: "account-session-saved",
            message: "Account session saved in extension storage.",
            status: "success",
            details: { email: session.email, plan: session.plan }
          })

          const applications = await getApplications()
          const syncError = await syncApplicationsWithState({
            applications,
            completedEvent: "connect-sync-completed",
            failedEvent: "connect-sync-failed",
            session,
            startedEvent: "connect-sync-started"
          })

          await broadcastAccountConnected()
          await logDiagnosticEvent({
            area: "connect",
            event: "account-connected-broadcast",
            message: "Connection update broadcast to open extension tabs.",
            status: "success"
          })

          sendResponse({ ok: true, syncError })
        })
        .catch((error: unknown) => {
          void logDiagnosticEvent({
            area: "connect",
            event: "account-session-save-failed",
            message: getErrorMessage(error),
            status: "error"
          })
          sendResponse({ error: "Could not save account session", ok: false })
        })

      return true
    }
  )
})

---
[90mD[39m Transformed:
---
import { defineBackground } from "wxt/utils/define-background"

type ExternalMessage = {
[REDACTED SENSITIVE LINE]
  email?: unknown
  plan?: unknown
  type?: unknown
}

type ExternalResponse = {
  connected?: boolean
  error?: string
  ok: boolean
  syncError?: string
  version?: string
}

type InternalMessage = {
  applications?: unknown
  type?: unknown
}

type InternalResponse = {
  connected?: boolean
  error?: string
  ok: boolean
  reason?: string
  synced?: boolean
}

export default defineBackground();
---
[90mD[39m vite-node transformed entrypoint C:\Users\rajan\OneDrive\Desktop\Autotime-EU-Apply\apps\extension\entrypoints\autotime.content.ts
[90mD[39m Original:
---
import { defineContentScript } from "wxt/utils/define-content-script"
import { registerAutotimeContentScript } from "../contents/autofill"

export default defineContentScript({
  matches: ["*://*/*"],
  main() {
    // Register page-level message handlers used by the side panel.
    registerAutotimeContentScript()
  }
})

---
[90mD[39m Transformed:
---
import { defineContentScript } from "wxt/utils/define-content-script"

export default defineContentScript({
  matches: ["*://*/*"]
})
---
[90mD[39m All entrypoints: [ { type: 'content-script',
    name: 'autotime',
    inputPath:
     'C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\apps\\extension\\entrypoints\\autotime.content.ts',
    outputDir:
     'C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\apps\\extension\\.output\\chrome-mv3\\content-scripts',
    options: { matches: [Array] },
    skipped: false },
  { type: 'background',
    name: 'background',
    inputPath:
     'C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\apps\\extension\\entrypoints\\background\\index.ts',
    outputDir:
     'C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\apps\\extension\\.output\\chrome-mv3',
    options: { main: undefined },
    skipped: false } ]
[90mD[39m Detected entrypoints: [ { type: 'content-script',
    name: 'autotime',
    inputPath:
     'C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\apps\\extension\\entrypoints\\autotime.content.ts',
    outputDir:
     'C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\apps\\extension\\.output\\chrome-mv3\\content-scripts',
    options: { matches: [Array] },
    skipped: false },
  { type: 'background',
    name: 'background',
    inputPath:
     'C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\apps\\extension\\entrypoints\\background\\index.ts',
    outputDir:
     'C:\\Users\\rajan\\OneDrive\\Desktop\\Autotime-EU-Apply\\apps\\extension\\.output\\chrome-mv3',
    options: { main: undefined },
    skipped: false } ]
[32mâˆš[39m Built extension in 2.178 s
  â”œâ”€ .output\chrome-mv3\manifest.json                992 B   
  â”œâ”€ .output\chrome-mv3\background.js                12.41 kB
  â”œâ”€ .output\chrome-mv3\content-scripts\autotime.js  55.51 kB
  â”œâ”€ .output\chrome-mv3\icons\128.png                16.15 kB
  â”œâ”€ .output\chrome-mv3\icons\16.png                 720 B   
  â”œâ”€ .output\chrome-mv3\icons\32.png                 1.78 kB 
  â””â”€ .output\chrome-mv3\icons\48.png                 3.12 kB 
Î£ Total size: 90.68 kB                             
[32mâˆš[39m Finished in 3.089 s
```
#### stderr tail

```text
[33m-[39m Preparing...
[1G
```
