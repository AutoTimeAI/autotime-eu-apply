// WXT build/manifest configuration - the single source of truth for the
// extension's MV3 manifest (permissions, host permissions, icons,
// externally_connectable). `activeTab`/`scripting`/`storage` cover the
// widget-injection fallback and local-first storage; `host_permissions`
// lists the AutoTime web app origin (for the background worker's dashboard
// calls) plus the job boards where automated selector extraction is
// allowed (see JobCaptureMode in lib/job-page.ts - boards not listed here
// still get manual-only/API-reference treatment, but adding a host here
// alone doesn't change capture mode; both need to agree). The content
// script itself (entrypoints/autotime.content.ts) declares its own scoped
// `matches` list for runtime injection rather than using these
// host_permissions directly - see that file's comment.
import { defineConfig } from "wxt"

const supportedJobBoardHostPermissions = [
  "https://*.stepstone.de/*",
  "https://*.indeed.com/*",
  "https://eures.ec.europa.eu/*",
  "https://*.eurotechjobs.com/*",
  "https://*.xing.com/*",
  "https://*.welcometothejungle.com/*",
  // BambooHR, Teamtailor, Jobvite and Personio's application forms live on
  // the same page as the job posting (no navigation needed, just a
  // same-page "Apply" click the widget doesn't drive itself - the same
  // click-before-autofill assumption already accepted for Recruitee) -
  // live-verified 2026-09-08 against 2 real employers each, autofill
  // promoted to "verified" in platform-coverage.ts on that evidence. Jobvite
  // has no packages/shared/src/atsFieldMaps.ts entry (its field ids are
  // opaque per-form-template tokens, unusable across employers - confirmed,
  // not assumed) but reaches the same fields via real <label for>
  // associations and the existing generic label-text detector.
  "https://*.bamboohr.com/*",
  "https://*.teamtailor.com/*",
  "https://jobs.jobvite.com/*",
  "https://*.jobs.personio.de/*",
  "https://*.jobs.personio.com/*",
  // Lever and Ashby's application forms live at a separate same-origin
  // path (/apply, /application) from the job posting page - the widget's
  // navigate-then-reinject autofill flow (see getAtsApplicationFormUrl in
  // packages/shared/src/atsFieldMaps.ts) needs chrome.scripting.executeScript
  // to work on that path *without* a fresh user gesture, since it's
  // triggered by the background service worker after chrome.tabs.update(),
  // not by a new toolbar click. activeTab's grant is scoped to the
  // gesture-invoked page and isn't documented to survive an
  // extension-initiated navigation to a new document, so these need an
  // explicit, permanent grant rather than relying on that ambiguity.
  "https://jobs.lever.co/*",
  "https://jobs.ashbyhq.com/*"
]

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "AutoTime EU Apply",
    description: "Cross-border job application copilot for Europe",
    permissions: ["activeTab", "scripting", "storage"],
    host_permissions: [
      "https://autotime-eu-apply.vercel.app/*",
      ...supportedJobBoardHostPermissions
    ],
    externally_connectable: {
      matches: ["https://autotime-eu-apply.vercel.app/*"]
    },
    action: {
      default_icon: {
        "16": "icons/16.png",
        "32": "icons/32.png",
        "48": "icons/48.png",
        "128": "icons/128.png"
      },
      default_title: "AutoTime EU Apply"
    },
    icons: {
      "16": "icons/16.png",
      "32": "icons/32.png",
      "48": "icons/48.png",
      "128": "icons/128.png"
    },
    web_accessible_resources: [
      {
        resources: [
          "icons/16.png",
          "icons/32.png",
          "icons/48.png",
          "icons/128.png"
        ],
        matches: ["*://*/*"]
      }
    ]
  }
})
