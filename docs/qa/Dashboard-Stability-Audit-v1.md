# Dashboard Stability Audit v1

Date: 2026-05-15

## Dashboard Files Inspected

- `apps/web/components/DashboardExperience.tsx`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/dashboard/applications/page.tsx`
- `apps/web/app/dashboard/applications/[id]/page.tsx`
- `apps/web/app/dashboard/follow-ups/page.tsx`
- `apps/web/app/dashboard/interview/page.tsx`
- `apps/web/app/dashboard/insights/page.tsx`
- `apps/web/app/dashboard/layout.tsx`
- `apps/web/app/api/sync/dashboard/route.ts`
- `apps/web/lib/supabase/types.ts`
- `packages/shared/src/schemas.ts`
- `packages/shared/src/types.ts`
- `apps/web/app/globals.css`

## Core Flow Checked

User reviews a job, saves/tracks the job, sees it in the dashboard, opens job detail, updates status, adds notes or outcome learning, and persists those changes through local state plus optional account sync.

## Broken Buttons Found

- `Save to Tracked Jobs` could be clicked repeatedly while the save/sync path was still running, creating duplicate local applications.
- `Delete` did not show an in-flight state and could be clicked repeatedly.
- `Delete` depended on the cloud delete request first, which made local-first dashboards feel broken when account sync was not configured.
- `Prep interview` buttons were not disabled while another AI/prep action was already running.
- Application detail opening was checked for route/id wiring.

## Silent Failures Found

- Dashboard/profile sync response failures showed status text but did not log a useful developer error.
- Dashboard/profile sync fetch failures showed status text but did not log a useful developer error.
- Dashboard diagnostic logging failures were swallowed.
- Online analytics failures updated local UI status but did not log the developer error.
- Clipboard copy failures for application kit fields did not log the developer error.
- AI role analysis and interview prep fallbacks showed user-facing messages but did not log the failed API/fetch path.
- Application update could report success even if the application id was missing from state.

## Data Mismatch Issues Checked

- Application status values match across `DashboardExperience.tsx`, `packages/shared/src/schemas.ts`, and `apps/web/lib/supabase/types.ts`.
- Outcome reason values match across frontend filters/forms and shared/backend schemas.
- Dashboard API maps nullable database strings back to optional frontend fields.
- No array/string mismatch was found in the tracked-job, status, notes, evidence, outcome, or interview prep core flow.
- Missing application ids were the main state-shape risk found in the update/delete paths.

## Fixes Applied

- Added loading guard for `Save to Tracked Jobs`.
- Added loading guard for application deletion.
- Made local-first deletion work when cloud sync is not configured.
- Added explicit missing-id failure handling for application updates and deletes.
- Added developer `console.error` logging for dashboard sync, profile sync, diagnostics, analytics, copy, AI fit analysis, interview prep, save, update, and delete failure paths.
- Kept user-visible success/error status messages for local save, sync success, sync failure, delete success, and fallback paths.
- Disabled interview prep actions while an AI/prep request is already in flight.
- Confirmed the existing `Open` application action routes to the job detail page.

## Remaining Risks

- Notes, next action, due date, status, and outcome currently save on change. That is intentional in the current product, but it means status messages can update frequently while typing.
- Cloud persistence still depends on auth/session and sync endpoint readiness. Local-first save remains available when cloud sync is unavailable.
- Local-only delete cannot create a cloud tombstone until account sync is configured. If the same application already exists online before sync is configured, loading cloud data later can reintroduce it.
- The dashboard is still concentrated in one large client component, so future edits should stay small and be tested through the full flow.

## Manual Test Checklist

1. Dashboard loads without console runtime errors.
2. Empty state appears when there are no tracked jobs.
3. A reviewed job can be saved with `Save to Tracked Jobs`.
4. The tracked job appears in `/dashboard/applications`.
5. `Open` opens `/dashboard/applications/[id]`.
6. Status update works from the list and detail view.
7. Notes or outcome learning saves from the list and detail view.
8. Delete works when account sync is configured.
9. Delete works locally when account sync is not configured.
10. Error message appears when an API request fails.
11. Success message appears after save/update/delete.
12. Refresh keeps the updated local data.
13. Refresh keeps synced data when signed in and cloud sync is configured.
14. Double-clicking save or delete does not create duplicate submissions.

## Verified Dashboard Actions

- Action: Save dashboard locally
  File/component: `apps/web/components/DashboardExperience.tsx` / backups utility bar
  Status: Working
  Notes: Button is visible when the dashboard protocol is unlocked, calls `saveDashboard`, writes current state to localStorage through `persist`, shows success status, and survives refresh through `getStoredState`.

- Action: Export dashboard backup
  File/component: `apps/web/components/DashboardExperience.tsx` / backups utility bar and settings actions
  Status: Working
  Notes: Button calls `exportDashboard`, creates a JSON blob from current dashboard state, triggers browser download, and shows success status. No API dependency.

- Action: Import dashboard backup
  File/component: `apps/web/components/DashboardExperience.tsx` / backups utility bar
  Status: Fixed
  Notes: Button calls `importDashboard`, validates with `companionDashboardStateSchema`, persists local state, schedules dashboard/profile sync, clears the textarea on success, shows visible validation/parse errors, and now logs parse failures.

- Action: Check account sync status
  File/component: `apps/web/components/DashboardExperience.tsx` / settings action panel
  Status: Fixed
  Notes: Button calls `checkCloudSyncStatus`, checks cloud readiness and browser session state, shows ready/not signed-in/errors in dashboard status, and now catches/logs unexpected session-check failures.

- Action: Save profile online
  File/component: `apps/web/components/DashboardExperience.tsx` / settings action panel
  Status: Working
  Notes: Button calls `syncProfileToCloud`, which calls `/api/sync/profile`, checks `response.ok`, logs response/fetch failures, shows success/failure status, and enables profile account sync only after success.

- Action: Load profile from account
  File/component: `apps/web/components/DashboardExperience.tsx` / settings action panel
  Status: Working
  Notes: Button calls `loadProfileFromCloud`, which calls `loadProfileSnapshot`, checks `response.ok`, updates local profile state and localStorage on success, and shows/logs visible failures.

- Action: Save job tracker online
  File/component: `apps/web/components/DashboardExperience.tsx` / settings action panel
  Status: Working
  Notes: Button calls `syncDashboardToCloud`, posts reusable answers, applications, evidence, outcomes and prep packs to `/api/sync/dashboard`, checks `response.ok`, logs failures, updates unsynced state, and shows success/failure status.

- Action: Delete synced profile
  File/component: `apps/web/components/DashboardExperience.tsx` / settings action panel
  Status: Fixed
  Notes: Button calls `deleteProfileForAccount`, confirms with the user, calls `DELETE /api/sync/profile`, checks `response.ok`, clears local profile and disables account sync on success, and now logs response/fetch failures visibly.

- Action: Review CV with AI
  File/component: `apps/web/components/DashboardExperience.tsx` / profile setup and guided actions
  Status: Fixed
  Notes: Button is disabled until CV text has at least 40 characters or while reviewing, calls `reviewResumeForContext`, uses local fallback suggestions when AI fails or limits are hit, shows visible status/alerts, resets loading in `finally`, and now logs API/fetch failures.

- Action: Import CV file
  File/component: `apps/web/components/DashboardExperience.tsx` / profile setup
  Status: Fixed
  Notes: File-picker button opens the hidden input, `importResumeFile` rejects unsupported formats visibly, posts DOCX files to `/api/profile/import-cv`, reads text files locally, clears input in `finally`, and now logs DOCX/text import failures.

- Action: Approve CV profile suggestions
  File/component: `apps/web/components/DashboardExperience.tsx` / profile setup
  Status: Working
  Notes: Button calls `approveContextSuggestion`, blocks visibly when no suggestion exists, persists profile/job/evidence updates locally, schedules profile sync, clears suggestion state, and shows an alert/status on success.

- Action: Apply market context to profile
  File/component: `apps/web/components/DashboardExperience.tsx` / guided actions and profile setup
  Status: Working
  Notes: Button calls `applyMarketContextToProfile`, updates profile target fields plus current job notes, persists local state, schedules profile sync, and shows status plus alert.

- Action: Save reviewed job to Tracked Jobs
  File/component: `apps/web/components/DashboardExperience.tsx` / Analyse Fit final action
  Status: Fixed
  Notes: Button is visible in Analyse Fit, disabled without a job draft or while saving, calls `saveApplicationFromJob`, creates application/evidence/outcome records, persists locally, syncs `/api/sync/dashboard`, opens Tracked Jobs on success, and shows/logs failures.

- Action: Use AI role analysis
  File/component: `apps/web/components/DashboardExperience.tsx` / Analyse Fit AI assistant
  Status: Fixed
  Notes: Button is disabled while AI is running or without a job draft, calls `runAiJobAnalysis`, posts to `/api/ai/analyse`, checks `response.ok`, updates job analysis on success, resets loading in `finally`, and logs visible fallback/fetch failures.

- Action: Export decision audit
  File/component: `apps/web/components/DashboardExperience.tsx` / Analyse Fit audit details
  Status: Working
  Notes: Button calls `exportDecisionAudit`, exports the current decision/evidence audit as JSON, and shows success status. No API dependency.

- Action: Official source reviewed checkbox
  File/component: `apps/web/components/DashboardExperience.tsx` / Analyse Fit official verification
  Status: Working
  Notes: Checkbox calls `setOfficialSourceReviewed`, updates trust state, writes to localStorage, and persists through refresh.

- Action: Application search and filters
  File/component: `apps/web/components/DashboardExperience.tsx` / Tracked Jobs filters
  Status: Working
  Notes: Search, status filter, and outcome filter update local React state, recompute `filteredApplications`, and immediately update the visible list. No API dependency or persistence required.

- Action: Open job detail
  File/component: `apps/web/components/DashboardExperience.tsx` and `apps/web/app/dashboard/applications/[id]/page.tsx`
  Status: Working
  Notes: Existing `Open` link routes to `/dashboard/applications/[id]`, the route passes `applicationId` into `DashboardExperience`, and the detail view shows either the selected job or a visible `Job not found` state.

- Action: Update application status
  File/component: `apps/web/components/DashboardExperience.tsx` / list and detail workflow panels
  Status: Fixed
  Notes: Select controls call `updateApplication`, which validates the application id, updates application plus outcome record, persists local state, schedules dashboard sync, shows success/failure status, and logs missing-id or sync failures.

- Action: Update next action and due date
  File/component: `apps/web/components/DashboardExperience.tsx` / list and detail workflow panels
  Status: Fixed
  Notes: Inputs call `updateApplication`, update local application state and matching outcome record, persist through localStorage, schedule `/api/sync/dashboard`, and show/log visible success or sync failure status.

- Action: Update outcome reason
  File/component: `apps/web/components/DashboardExperience.tsx` / Tracked Jobs list
  Status: Fixed
  Notes: Select calls `updateApplication`, writes `outcomeReason`, regenerates the matching outcome record, persists locally, schedules dashboard sync, and uses visible/logged failure handling.

- Action: Update notes or outcome learning
  File/component: `apps/web/components/DashboardExperience.tsx` / list and detail workflow panels
  Status: Fixed
  Notes: Text input/textarea calls `updateApplication`, writes notes locally on change, updates outcome record, schedules sync, survives refresh through localStorage, and logs missing-id/sync failures.

- Action: Generate interview prep from a tracked job
  File/component: `apps/web/components/DashboardExperience.tsx` / Tracked Jobs list and job detail
  Status: Fixed
  Notes: Button is only enabled for `Interview` status and disabled while AI is running, calls `generateInterviewPrep`, checks guardrails, posts to `/api/ai/interview`, saves AI or local prep pack, syncs dashboard, resets loading in `finally`, and logs response/fetch failures.

- Action: Delete tracked job
  File/component: `apps/web/components/DashboardExperience.tsx` / Tracked Jobs list
  Status: Fixed
  Notes: Button calls `deleteApplication`, is disabled while deleting that id, deletes locally when cloud sync is unavailable, calls `DELETE /api/sync/dashboard` when configured, removes related evidence/outcome/prep records from local state, shows/logs visible failure, and persists local success through refresh.

- Action: Select tracked job for Application Kit
  File/component: `apps/web/components/DashboardExperience.tsx` / Application Kit workspace
  Status: Working
  Notes: Select updates `kitApplicationId` and `kitDraft`, creates a content snapshot draft from saved evidence when one is not already saved, and updates the editor immediately. No API dependency.

- Action: Copy Application Kit field
  File/component: `apps/web/components/DashboardExperience.tsx` / Application Kit field cards
  Status: Fixed
  Notes: Button calls `copyKitField`, blocks empty values visibly, writes to clipboard on success, shows success status, and logs/shows copy failure.

- Action: Save Application Kit to job
  File/component: `apps/web/components/DashboardExperience.tsx` / Application Kit workspace
  Status: Working
  Notes: Button calls `saveApplicationKitSnapshot`, blocks visibly without an active job/draft, updates the selected application content snapshot and `updatedAt`, persists locally, schedules dashboard sync, and shows success/failure status through the shared sync path.

- Action: Regenerate Application Kit draft
  File/component: `apps/web/components/DashboardExperience.tsx` / Application Kit workspace
  Status: Working
  Notes: Button calls `regenerateKitDraft`, blocks visibly without an active tracked job, rebuilds the draft from saved evidence, and shows success status. No API dependency until the user saves.

- Action: Run progress analytics report
  File/component: `apps/web/components/DashboardExperience.tsx` / Progress and guided actions
  Status: Fixed
  Notes: Button calls `runOnlineAnalytics`, blocks visibly until saved evidence/outcomes exist, posts to the analytics endpoint, checks `response.ok`, updates the report/status on success, and now logs visible fetch/service failures.

- Action: Generate AI interview coach answer
  File/component: `apps/web/components/DashboardExperience.tsx` / Interview Prep workspace
  Status: Fixed
  Notes: Button is disabled while AI is running, calls `generateInterviewBuddyAnswers`, validates question/draft, posts to `/api/ai/interview-answer`, uses local fallback on API failure, resets loading in `finally`, and now logs response/fetch failures.

- Action: Generate local interview evidence check
  File/component: `apps/web/components/DashboardExperience.tsx` / Interview Prep workspace
  Status: Working
  Notes: Button calls `generateLocalInterviewBuddyAnswers`, validates input, generates local answer variants and coach metadata, and shows success or validation status. No API dependency.

- Action: Save final interview answer
  File/component: `apps/web/components/DashboardExperience.tsx` / Interview Prep workspace
  Status: Working
  Notes: Button is disabled until outputs exist, calls `saveFinalInterviewAnswer`, writes the final answer to the inferred reusable answer field, persists locally, schedules dashboard sync, and shows success/failure status through the shared sync path.

- Action: Proof Library profile and reusable-answer fields
  File/component: `apps/web/components/DashboardExperience.tsx` / Proof Library workspace
  Status: Working
  Notes: Textareas call `updateProfile` or `updateReusableAnswer`, save locally on change, schedule the appropriate profile/dashboard sync when enabled, and persist through refresh.

- Action: Follow-up queue status/action updates
  File/component: `apps/web/components/DashboardExperience.tsx` / Follow-ups section
  Status: Fixed
  Notes: Follow-up controls reuse `updateApplication`, so status, next action, due date, notes and outcome updates share the same local persistence, outcome-record update, sync scheduling, visible status, and logged failure handling as Tracked Jobs.
