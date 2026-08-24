# AutoTime EU Apply — Browser Extension

A [WXT](https://wxt.dev)-built Chrome (MV3) extension. It is the **local-first**
half of AutoTime EU Apply: everything it does — detecting a job posting,
tracking an application, autofilling a form — works fully offline against
`chrome.storage`. Signing in to the AutoTime web dashboard adds optional
cloud sync and AI features on top; it is never required.

## Architecture

```
entrypoints/
  autotime.content.ts   WXT content script entrypoint (built to
                         content-scripts/autotime.js, injected on demand -
                         see below, not auto-registered against every page)
  background/index.ts   MV3 service worker
contents/
  autofill.ts            Real content-script logic: job detection, the
                          floating "Track Job" widget, form autofill
lib/                      Shared logic used by all three contexts
sidepanel/                React UI for the side panel (main.tsx entry)
```

### Entrypoints

- **`entrypoints/autotime.content.ts`** is the actual WXT content script.
  It uses runtime registration (`registration: "runtime"`), scoped to a
  fixed list of supported job-board/app origins (see the file's own
  comment) - it is never auto-injected on page load or listed in the
  manifest's `content_scripts`. The background worker injects it on demand
  via `chrome.scripting.executeScript` (toolbar icon click, or a side panel
  request for the active tab). It delegates to `contents/autofill.ts` for
  the real logic, schedules the passive ESCO match overlay
  (`lib/match-overlay.ts`), and listens for an explicit LinkedIn match
  request from the toolbar icon.
- **`entrypoints/background/index.ts`** is the MV3 service worker. It
  handles the toolbar-icon-click "show widget" flow, retries failed
  application syncs on install/startup/storage change, and implements the
  `externally_connectable` handshake the web dashboard uses to hand the
  extension a signed-in session. It and the side panel are the only two
  contexts that call the dashboard's sync APIs (`lib/cloud-sync.ts`)
  directly.

### Content scripts

- **`contents/autofill.ts`** does the actual page-context work: parsing job
  posting details from the DOM/JSON-LD (`detectJobPage`, with a large block
  of per-platform selector heuristics plus a capture-mode policy — see
  `lib/job-page.ts` — that keeps LinkedIn manual-only), rendering the
  floating, draggable, shadow-DOM "Track Job" widget, and autofilling saved
  profile/reusable-answer/application-content values into visible form
  fields (including the LinkedIn Easy Apply modal).
- **`lib/match-overlay.ts`** renders a small "ESCO skill match" card,
  either passively on supported job pages or, on LinkedIn, only after an
  explicit one-time consent dialog (reading a LinkedIn page this way is
  outside LinkedIn's terms, so it is opt-in and never scrapes automatically).

### Side panel

`sidepanel/main.tsx` renders `<SidePanelApp>`, which owns the panel's state:
the currently detected/tracked job on the active tab, the account session
and its dashboard sync, and editable drafts for every feature (profile,
reusable answers, job analysis, application content, tracker).

**Note:** `renderLegacyTools` in `main.tsx` is currently `false`. The
rendered UI is just the "Track Job" panel, an account badge, and a sync
diagnostics drawer. The full multi-section layout — `SectionNav`,
`Onboarding`, and the per-feature sections (`ProfileSection`,
`JobAnalysisSection`, `ApplicationContentSection`, `TrackerSection`,
`ApplicationsSection`, `UsageLogSection`, `ValidationMetricsSection`,
`AccountSection`, `SavedViews`) — is fully built and wired up but not
currently shown. Each of those files says so in its own header comment.

### `lib/`

Shared logic with no React/DOM dependency (safe to import from any
context):

| File | Responsibility |
| --- | --- |
| `storage.ts` | `chrome.storage` read/write layer and all shared types — the local-first persistence boundary |
| `session.ts` | Keeps the account session's access token fresh (proactive refresh + refresh-and-retry-once) |
| `cloud-sync.ts` | HTTP client for the dashboard's `/api/sync/*` endpoints |
| `openai.ts` | Client for the backend AI endpoints (`/api/ai/*`), plus `appUrl` (the app origin, imported everywhere) |
| `job-page.ts` | Parses raw page signals into normalized job details; owns the capture-mode policy |
| `job-analysis.ts` | Local, offline job-fit scoring — fallback when AI analysis is unavailable |
| `content-generation.ts` | Local, offline application-content templates — fallback when AI generation is unavailable |
| `autofill.ts` | Field-detection logic used by `contents/autofill.ts` to match form inputs to saved data |
| `applications.ts` | Application list filtering/dedup/CSV export/dashboard-merge helpers |
| `validation.ts` | Field-level validation for every editable draft |
| `countries.ts` | ISO country list with E.164 calling codes |
| `v2-dashboard.ts` | Builds the manual "Export V2 Dashboard JSON" bundle |

## How the pieces communicate

All cross-context messaging uses `chrome.runtime.sendMessage` /
`chrome.tabs.sendMessage` with a small set of `AUTOTIME_*` message types
(defined ad hoc at each call site — there is no central message-type
registry file).

- **Side panel → active tab's content script**: `AUTOTIME_DETECT_JOB_PAGE`,
  `AUTOTIME_AUTOFILL_PROFILE`, `AUTOTIME_INSERT_APPLICATION_CONTENT`,
  `AUTOTIME_SHOW_WIDGET`. If the tab has no listener yet (opened before
  install/reload), the caller falls back to
  `chrome.scripting.executeScript` to inject `content-scripts/autotime.js`
  at runtime, then retries the message (see `ensureContentScriptReady` in
  both `sidepanel/main.tsx` and `entrypoints/background/index.ts`).
- **Side panel / content script → background**: `AUTOTIME_SYNC_APPLICATIONS`
  (sync tracked applications to the dashboard).
- **Background → content scripts**: broadcasts
  `AUTOTIME_ACCOUNT_CONNECTED` to every open tab when the session changes,
  and sends `AUTOTIME_LINKEDIN_MATCH_REQUEST` to the active tab when the
  toolbar icon is clicked on a LinkedIn job page.
- **Web dashboard → background** (`chrome.runtime.onMessageExternal`, only
  reachable from the origin listed in `externally_connectable` in
  `wxt.config.ts`, and additionally checked against `sender.url` in
  `isTrustedSender`): `AUTOTIME_PING` (preflight connectivity check) and
  `AUTOTIME_CONNECT_ACCOUNT` (hands the extension a freshly signed-in
  session).

The account session (including its raw `authToken`/`refreshToken`) is
stored via `lib/storage.ts`'s `getAccountSession`/`saveAccountSession` in
`chrome.storage.local`, which any extension context - background, side
panel, or content script - can read directly. The background worker and
side panel are the only two contexts that call the dashboard's *sync* APIs
(`lib/cloud-sync.ts`); `lib/match-overlay.ts`, which runs in content-script
context, fetches the dashboard's ESCO scoring endpoint directly using the
session it reads from storage.

## Local-first storage

- **`chrome.storage.local`** holds everything: profile, reusable answers,
  drafts (job analysis, application content, tracker), saved applications,
  job references, AI usage log, diagnostic log, per-application sync state,
  the onboarding-seen flag, and the account session (`getAccountSession`/
  `saveAccountSession` in `lib/storage.ts`). All of it works fully offline.
  Every getter in `lib/storage.ts` runs the stored value through a
  `normalize*` function so older/partial shapes saved by a previous version
  of the extension don't break newer code — this is the project's
  schema-migration mechanism in lieu of real storage versioning.
- **Dashboard sync is optional and best-effort.** When a tracked
  application is saved, `lib/storage.ts` marks it `pending` in the
  per-application sync-state map; if the user is connected, a sync request
  goes out immediately (`lib/cloud-sync.ts`, merging with the dashboard's
  copy so a concurrent web-dashboard edit is never overwritten). On
  failure, the state is marked `failed` with the error, and the background
  worker retries pending/failed applications automatically on extension
  install/startup and whenever the account session changes. If the user is
  never connected, everything just stays local indefinitely.
