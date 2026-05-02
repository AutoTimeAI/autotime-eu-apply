# AutoTime EU Apply

Cross-border job application copilot for Europe.

This repository is a pnpm monorepo with a WXT Chrome extension, a basic Next.js
web app shell, and a shared package.

## Apps

- `apps/extension` - Chrome extension built with WXT.
- `apps/web` - Basic Next.js web app shell.
- `packages/shared` - Reserved for v2 shared types and schemas.

The Chrome extension source of truth is `apps/extension`.
`packages/shared` is intentionally unused in the MVP so extension storage and
validation can remain local until backend/web integration begins.

## Extension MVP

Current status:

- Repo implementation slice: usable local-first extension workflow is in place.
- Full uploaded MVP spec: not complete yet.
- Approximate spec completion: 75-80%.
- Next milestone: close the full-spec MVP gaps listed in
  `docs/mvp-spec-alignment.md`, then run the manual Chrome smoke test.

This status is based on the uploaded `EU Apply.7z` product spec pack,
especially `AutoTime_MVP_Consolidated_Summary.docx`,
`AutoTime_EU_Apply_Final_Build_Execution_Spec_v1.docx`, and
`AutoTime_EU_Apply_MVP_Execution_Document.docx`.

The extension currently supports:

- Candidate profile settings stored in `chrome.storage.local`.
- Expanded profile memory for links, target countries and roles, work-right
  details, salary expectation, base CV text, project summaries, and experience
  highlights.
- Country and notice-period profile inputs with required-field validation.
- International phone validation against the selected country calling code.
- Reusable answers for sponsorship, relocation, work authorisation, and notice period.
- Creating, viewing, and clearing reusable answers from the side panel.
- Saving the current tab as a saved application from the side panel.
- Importing the active job page into the side-panel tracker.
- Pasting a manual job description into Job Analysis when page extraction is
  incomplete or unavailable.
- Transparent local job-fit scoring with visible factors, recommendation, and
  positioning angle.
- Saving side-panel tracker entries into the saved applications list.
- Viewing, editing, searching, filtering, deleting, and exporting saved
  applications from the side panel.
- Preventing duplicate saved applications for the same URL.
- Basic autofill for obvious first name, last name, email, and phone fields.
- Basic textarea autofill for obvious sponsorship, relocation, work authorisation,
  and notice period questions.
- Triggering profile and reusable-answer autofill from the side panel.
- Side-panel drafts for profile, job analysis, application content, and tracker.
- Application notes and editable spec-aligned status tracking: `Saved`,
  `Applying`, `Applied`, `Interview`, `Rejected`, and `Closed`.
- Next-action and next-action-date tracking for saved applications.

The extension does not submit forms and does not use Firebase or a backend yet.
The web app does not depend on Firebase until backend work starts.

Known full-spec gaps include AI-backed analysis and content generation,
generated content snapshots, AI usage/cost logging, profile-to-content reuse,
and deeper extraction for priority job platforms.

## Local Setup

Install dependencies:

```bash
pnpm install
```

Run the extension in development:

```bash
pnpm dev:extension
```

Build the extension:

```bash
pnpm build:extension
```

After building, load or reload the unpacked extension from:

```text
apps/extension/.output/chrome-mv3
```

Run the web app:

```bash
pnpm dev:web
```

Build the web app:

```bash
pnpm build:web
```

## Tests

Run extension unit tests:

```bash
pnpm --filter extension test
```

Run extension typecheck:

```bash
pnpm --filter extension typecheck
```

Current unit tests cover:

- Name splitting for autofill.
- Autofill field detection.
- Reusable answer field detection.
- Safe fill eligibility checks.
- Job page detail inference for tracker import.
- Transparent job-fit scoring and positioning inference.
- Expanded profile storage and legacy profile normalization.
- Reusable answer storage.
- Job analysis, application content, and tracker draft storage.
- Profile and draft validation.
- Saved application create/delete behavior.
- Saved application search and status filtering.
- Legacy tracker and application status normalization.
- Saved application duplicate URL detection.
- Saved application CSV export formatting.

## Chrome Extension Notes

The extension uses these Chrome permissions:

- `storage` for `chrome.storage.local`.
- `activeTab` for reading/importing the current job page and sending autofill messages.
- `sidePanel` for opening the Chrome side panel.

The WXT content script is configured with `matches: ["<all_urls>"]` so the side
panel can request autofill and job-page import on normal application pages.

After building, load the generated extension from:

```text
apps/extension/.output/chrome-mv3
```

The manual extension smoke-test checklist lives at:

```text
docs/extension-smoke-test.md
```

Run that checklist before tagging or shipping an MVP build.

The full MVP spec alignment checklist lives at:

```text
docs/mvp-spec-alignment.md
```

## Repository Notes

Generated folders such as `node_modules`, `.next`, `.output`, `build`,
`.plasmo`, `.wxt`, and TypeScript build info files are ignored by Git.
