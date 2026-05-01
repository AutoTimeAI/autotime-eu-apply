# AutoTime EU Apply

Cross-border job application copilot for Europe.

This repository is a pnpm monorepo with a WXT Chrome extension, a basic Next.js
web app shell, and a shared package.

## Apps

- `apps/extension` - Chrome extension built with WXT.
- `apps/web` - Basic Next.js web app shell.
- `packages/shared` - Shared package for future common types and schemas.

The Chrome extension source of truth is `apps/extension`.

## Extension MVP

Current status:

- `MVP v1`: Done
- `MVP v1.1`: In progress, tracker import flow done

The extension currently supports:

- Candidate profile settings stored in `chrome.storage.local`.
- Country and notice-period profile inputs with required-field validation.
- International phone validation against the selected country calling code.
- Reusable answers for sponsorship, relocation, work authorisation, and notice period.
- Saving the current tab as an application draft.
- Importing the active job page into the side-panel tracker.
- Viewing saved applications in the popup.
- Deleting saved application records.
- Editing saved application role title, company, source, notes, and status.
- Searching saved applications and filtering them by status.
- Preventing duplicate saved applications for the same URL.
- Exporting saved applications to CSV.
- Basic autofill for obvious first name, last name, email, and phone fields.
- Basic textarea autofill for obvious sponsorship, relocation, work authorisation,
  and notice period questions.
- Side-panel drafts for profile, job analysis, application content, and tracker.
- Application notes and editable application status tracking.

The extension does not submit forms and does not use Firebase or a backend yet.

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
- Profile storage.
- Reusable answer storage.
- Job analysis, application content, and tracker draft storage.
- Profile and draft validation.
- Saved application create/delete behavior.
- Saved application search and status filtering.
- Saved application duplicate URL detection.
- Saved application CSV export formatting.

## Chrome Extension Notes

The extension uses these Chrome permissions:

- `storage` for `chrome.storage.local`.
- `activeTab` for reading/importing the current job page and sending autofill messages.
- `sidePanel` for opening the Chrome side panel.

After building, load the generated extension from:

```text
apps/extension/.output/chrome-mv3
```

The manual extension smoke-test checklist lives at:

```text
docs/extension-smoke-test.md
```

## Repository Notes

Generated folders such as `node_modules`, `.next`, `.output`, `build`,
`.plasmo`, `.wxt`, and TypeScript build info files are ignored by Git.
