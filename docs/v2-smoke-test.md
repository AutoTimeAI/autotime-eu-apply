# V2 Smoke Test

Use this checklist after changes to the V2 web companion dashboard or the
extension-to-web dashboard export.

## Preview

1. Run `pnpm dev:web:reset`.
2. Open `http://127.0.0.1:3000`.
3. Confirm the dashboard loads without a runtime error.
4. Confirm the tabs are visible: Smarter Targeting, Stronger Applications,
   Outcome Evidence, and More Interviews.
5. Confirm the Mandatory MVP Profile Bridge panel is visible and marks missing
   candidate profile fields until profile evidence is completed or imported.
6. Confirm the Production Sync Track panel shows local mode unless cloud sync is
   explicitly enabled after Supabase auth, RLS, consent, and deletion controls
   are validated.
7. Click `Review Cloud Sync Status` and confirm it reports missing env/config
   without uploading data.
8. Confirm the production dashboard is live:

```bash
pnpm smoke:web
```

## Extension Export

1. Build or run the extension.
2. Save a profile, reusable answers, job analysis, and at least one application.
3. Open Applications in the side panel.
4. Click `Export V2 Dashboard JSON`.
5. Confirm `autotime-v2-dashboard.json` downloads.
6. Confirm the downloaded JSON contains `profile`, `reusableAnswers`,
   `jobAnalysis`, `applications`, and `interviewPrepPacks`.
7. Confirm export is blocked if no saved candidate profile exists or if the
   mandatory profile bridge fields are empty.

## Web Import

1. Open the V2 dashboard.
2. Paste the exported JSON into the Import Application Evidence field.
3. Click `Import Evidence`.
4. Confirm a success message appears.
5. Confirm imported profile memory, job review, and applications are visible.
6. Paste invalid JSON and confirm a clear failure message appears.
7. Paste valid dashboard JSON with an empty profile and confirm import is
   blocked with a candidate profile bridge message.

## Dashboard Workflow

1. Update profile memory and click `Save Local Application Evidence`.
2. In Stronger Applications, edit job details and click `Save Job Decision`.
3. In Outcome Evidence, change an application status to `Interview`.
4. Click `Generate Prep`.
5. Confirm the More Interviews tab shows likely questions and a final checklist.
6. Leave the AI key empty and confirm local prep still works.
7. Save a controlled-cost OpenAI key in AI Interview Settings.
8. Click `Generate AI Prep` for an interview-stage application and confirm STAR
   prompts, employer questions, and checklist items render.
9. Test an invalid key and confirm a clear failure message plus local fallback.
10. Run the controlled-cost live check when `OPENAI_API_KEY` is available:

```bash
pnpm test:v2:ai-live
```

11. Click `Export Application Evidence` and confirm the exported file imports
    successfully.

## Responsive Check

1. Open browser dev tools.
2. Check desktop width.
3. Check a mobile-sized viewport.
4. Confirm fields, buttons, application rows, and prep cards do not overlap.

## Guardrails

- LinkedIn remains manual copy/paste only in the extension.
- No Supabase, auth, cloud sync, or remote writes are expected in this flow.
- Export/import is local file based.

## Live ATS Evidence

Run the deterministic V2 ATS platform evidence check:

```bash
pnpm test:v2:ats-live
```

When network access is available and live page reachability should be checked,
run:

```bash
LIVE_ATS_FETCH=1 pnpm test:v2:ats-live
```

Record any live-site selector regressions as release risks because external ATS
markup can change without a repo change.
