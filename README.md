# AutoTime EU Apply

Cross-border job application copilot for Europe.

This repository is a pnpm monorepo with a Chrome extension, a basic Next.js web
app shell, and a shared package.

## Apps

- `apps/extension` - Chrome extension built with Plasmo.
- `apps/web` - Basic Next.js web app shell.
- `packages/shared` - Shared package for future common types and schemas.

The Chrome extension source of truth is `apps/extension`.

## Extension MVP

Current status:

- `MVP v1`: Done
- `MVP v1.1`: In progress, first tracker feature done

The extension currently supports:

- Candidate profile settings stored in `chrome.storage.local`.
- Reusable answers for sponsorship, relocation, work authorisation, and notice period.
- Saving the current tab as an application draft.
- Viewing saved applications in the popup.
- Deleting saved application records.
- Editing saved application role title, company, source, notes, and status.
- Searching saved applications and filtering them by status.
- Preventing duplicate saved applications for the same URL.
- Exporting saved applications to CSV.
- Basic autofill for obvious first name, last name, email, and phone fields.
- Basic textarea autofill for obvious sponsorship, relocation, work authorisation,
  and notice period questions.
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
- Profile storage.
- Reusable answer storage.
- Saved application create/delete behavior.
- Saved application search and status filtering.
- Saved application duplicate URL detection.
- Saved application CSV export formatting.

## Chrome Extension Notes

The extension uses these Chrome permissions:

- `storage` for `chrome.storage.local`.
- `tabs` for reading the current active tab and sending autofill messages.

After building, load the generated extension from:

```text
apps/extension/build/chrome-mv3-prod
```

For development, Plasmo also creates development build output under:

```text
apps/extension/build/chrome-mv3-dev
```

## Repository Notes

Generated folders such as `node_modules`, `.next`, `build`, `.plasmo`, and
TypeScript build info files are ignored by Git.
