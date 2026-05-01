# Extension Smoke Test

Use this checklist after changes to the WXT side panel shell.

## Build And Reload

1. Run `npm run build`.
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
7. For View Job Analysis, confirm fit score, recommendation, positioning angle,
   and score factors are visible after saving.

## Autofill

1. Save a valid profile.
2. Save reusable answers.
3. Open a page with obvious empty name, email, phone, or textarea questions.
4. Open the Profile tab in the side panel.
5. Click Autofill Current Page.
6. Confirm matching empty fields are filled or a clear no-fields message appears.

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
8. Search for the edited next action.
9. Export CSV and confirm the file includes the tracker fields.
10. Delete the application and confirm it is removed from the list.

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
