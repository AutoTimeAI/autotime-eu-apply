# Extension Smoke Test

Use this checklist after changes to the WXT side panel shell.

## Build And Reload

1. Run `pnpm build:extension`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Load or reload the unpacked extension from:

```text
apps/extension/.output/chrome-mv3
```

## Side Panel

1. Click the AutoTime EU Apply extension icon.
2. Confirm the Chrome side panel opens.
3. Confirm navigation shows:
   - Profile
   - View Profile
   - Reusable Answers
   - View Answers
   - Job Analysis
   - View Job Analysis
   - Application Content
   - View Content
   - Tracker
   - View Tracker
   - Applications
   - Usage Log
   - Validation Metrics
   - AI Settings

## Validation

1. Visit each edit tab without saving.
2. Confirm required-field alerts do not appear just from visiting.
3. Click Save on an empty edit tab.
4. Confirm required-field alerts appear and save is blocked.
5. Switch tabs.
6. Confirm visible alerts and nav warning markers clear.

## Save And View

1. Fill valid data in each edit tab.
2. Click Save.
3. Confirm the success message is visible and scrolls into view.
4. Confirm the edit form clears after successful save.
5. Open the matching view tab.
6. Confirm the saved data is visible.
7. For View Profile, confirm links, target countries and roles, work-right
   details, salary expectation, CV text, projects, and experience highlights
   are visible after saving.
8. For View Job Analysis, confirm fit score, recommendation, positioning angle,
   and score factors are visible after saving.
9. In Job Analysis, paste a job description that includes analyst, payments, or
   systems language and confirm the saved analysis uses that text in the score
   and positioning output.

## Autofill

1. Save a valid profile.
2. Save reusable answers.
3. Open a page with obvious empty name, email, phone, or textarea questions.
4. Open the Profile tab in the side panel.
5. Click Autofill Current Page.
6. Confirm matching empty fields are filled or a clear no-fields message appears.

## Application Content Insertion

1. Save application content.
2. Open a page with obvious empty cover letter, profile summary, motivation,
   strengths, or availability textareas.
3. Open the Application Content tab in the side panel.
4. Click Insert Saved Content.
5. Confirm matching empty content fields are filled or a clear no-fields
   message appears.

## Current Job Page Import

1. Open a job posting page in the active tab.
2. Open the Tracker tab in the side panel.
3. Click Import Current Job Page.
4. Confirm role title and application URL are filled.
5. Confirm company and location notes are filled when the page exposes them.
6. Confirm existing typed tracker fields are not overwritten.

## Applications

1. Open the Applications tab.
2. Click Save Current Tab.
3. Confirm the current tab appears in the saved application list.
4. Click Save Current Tab again and confirm the duplicate warning appears.
5. Save a valid tracker entry.
6. Confirm the tracker entry appears in the saved application list.
7. Edit status, next action, next action date, and notes.
8. Confirm the status options are `Saved`, `Applying`, `Applied`,
   `Interview`, `Rejected`, and `Closed`.
9. Search for the edited next action.
10. Export CSV and confirm the file includes the tracker fields.
11. Delete the application and confirm it is removed from the list.

## Usage Log

1. Open the Application Content tab.
2. Click Generate from Saved Data after saving the required profile and job
   analysis.
3. Open Usage Log.
4. Confirm an `Application content generation` entry appears with model
   `local-template` and `$0.0000` estimated cost.
5. Click Clear Usage Log.
6. Confirm the empty-state message appears and stays cleared after reopening the
   side panel.

## AI Settings

1. Open AI Settings.
2. Save a test model and monthly budget.
3. Confirm the success message appears.
4. Clear AI Settings.
5. Confirm defaults return.
6. If using a real API key for release validation, save it, generate job
   analysis or application content, and confirm Usage Log records the selected
   model and a non-negative estimated cost.

## Validation Metrics

1. Save at least one current tab or tracker entry to Applications.
2. Set one application to `Applied` and one to `Interview` if sample data is
   available.
3. Open Validation Metrics.
4. Confirm total applications, status outcomes, source counts, content snapshot
   coverage, next-action coverage, and outcome-note coverage match the
   Applications list.
5. Export the validation CSV and confirm it includes metric, status, and source
   sections.

## Clear Saved Data

1. Open each view tab with saved data.
2. Click the matching Clear Saved button.
3. Confirm the view tab returns to its empty-state message.
4. Close and reopen the side panel.
5. Confirm the cleared saved data stays cleared.

## Reload Persistence

1. Close and reopen the side panel.
2. Confirm edit forms are empty.
3. Confirm saved data still appears in each matching view tab.
