# V2 Smoke Test

Use this checklist after changes to the V2 web companion dashboard or the
extension-to-web dashboard export.

## Preview

1. Run `pnpm dev:web:reset`.
2. Open `http://127.0.0.1:3000`.
3. Confirm the dashboard loads without a runtime error.
4. Confirm the tabs are visible: Profile, Job Review, Applications, Interview
   Prep.

## Extension Export

1. Build or run the extension.
2. Save a profile, reusable answers, job analysis, and at least one application.
3. Open Applications in the side panel.
4. Click `Export V2 Dashboard JSON`.
5. Confirm `autotime-v2-dashboard.json` downloads.
6. Confirm the downloaded JSON contains `profile`, `reusableAnswers`,
   `jobAnalysis`, `applications`, and `interviewPrepPacks`.

## Web Import

1. Open the V2 dashboard.
2. Paste the exported JSON into the Import JSON field.
3. Click `Import Dashboard`.
4. Confirm a success message appears.
5. Confirm imported profile memory, job review, and applications are visible.
6. Paste invalid JSON and confirm a clear failure message appears.

## Dashboard Workflow

1. Update profile memory and click `Save Dashboard`.
2. In Job Review, edit job details and click `Save to Applications`.
3. In Applications, change an application status to `Interview`.
4. Click `Generate Prep`.
5. Confirm the Interview Prep tab shows likely questions and a final checklist.
6. Leave the AI key empty and confirm local prep still works.
7. Save a controlled-cost OpenAI key in AI Interview Settings.
8. Click `Generate AI Prep` for an interview-stage application and confirm STAR
   prompts, employer questions, and checklist items render.
9. Test an invalid key and confirm a clear failure message plus local fallback.
10. Click `Export JSON` and confirm the exported file imports successfully.

## Responsive Check

1. Open browser dev tools.
2. Check desktop width.
3. Check a mobile-sized viewport.
4. Confirm fields, buttons, application rows, and prep cards do not overlap.

## Guardrails

- LinkedIn remains manual copy/paste only in the extension.
- No Supabase, auth, cloud sync, or remote writes are expected in this flow.
- Export/import is local file based.
