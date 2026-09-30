# Private beta onboarding pack

Practical materials for onboarding a real private-beta tester who has already
accepted an invitation, for AutoTime AI (AutoTime EU Apply) private beta
v1.0.1. Companion to the founder-facing process docs in
[`../early-user-beta-onboarding-checklist.md`](../early-user-beta-onboarding-checklist.md)
and [`../private-beta-feedback-questions.md`](../private-beta-feedback-questions.md).

## Files

| File | Purpose |
| --- | --- |
| [`welcome-email-annie.md`](welcome-email-annie.md) | Ready-to-send welcome email for tester Annie. |
| [`testing-guide.md`](testing-guide.md) | Beginner-friendly testing guide, reusable for any tester. Task steps map to real interface page names and buttons. |
| [`feedback-template.md`](feedback-template.md) | Structured feedback template, reusable for any tester. |
| [`tracker.md`](tracker.md) | Minimal beta tracking table. No email addresses or personal job/profile data. |

## Verified facts this pack relies on

Verified directly from the repository on 2026-09-30 (see file/path evidence
below). Anything not in this list was **not** independently confirmed and is
called out explicitly in the files above or in "Onboarding blockers" below.

- **Production URL**: `https://autotime-eu-apply.vercel.app` — [`README.md`](../../../../README.md) line 19.
- **Sign-in**: `/login` — GitHub or Google OAuth only. There is no
  email/password form (`apps/web/components/LoginContent.tsx`, `type OAuthProvider = "github" | "google"`).
- **Private-beta gate**: a brand-new sign-up has no `beta_access` row, which
  is treated as `pending` (`apps/web/lib/beta-access.ts`). A signed-in user
  who is not `beta_access.status = 'active'` is redirected from every
  `/dashboard/*` route to `/waitlist` (`apps/web/app/dashboard/layout.tsx`).
- **Invite-code unlock**: `/waitlist` shows a one-field "Unlock your account"
  form (`apps/web/components/WaitlistContent.tsx`) that posts to
  `POST /api/beta/redeem-invite` (`apps/web/app/api/beta/redeem-invite/route.ts`).
  The valid code is a single shared value read from the `BETA_INVITE_CODE`
  environment variable (`apps/web/lib/env.server.ts`, `getBetaInviteCode()`) —
  **not** a per-tester code. This pack does not read or print that value; you
  must supply it yourself when sending the email (see "Onboarding blockers").
- **Onboarding wizard**: `/dashboard/onboarding` renders `OnboardingWizard`
  (`apps/web/app/dashboard/onboarding/page.tsx`). The progressive-onboarding
  target (CV/evidence, target countries, work-authorisation requirement, then
  Role Pathways or Job Analysis) is documented in
  [`../../product-onboarding-workflow.md`](../../product-onboarding-workflow.md).
- **Jobs / job analysis**: `/dashboard/jobs` renders `JobApplicationWorkspace`
  (`apps/web/app/dashboard/jobs/page.tsx`). Real button labels found in that
  component: **"Save job"**, **"Analyse job"** (also "Analyse this vacancy"
  as a dialog title), **"Prepare application"**
  (`apps/web/components/JobApplicationWorkspace.tsx`).
- **Applications / application-readiness**: `/dashboard/applications` renders
  the same workspace in "applications" view
  (`apps/web/app/dashboard/applications/page.tsx`). Status-flow buttons found
  in code: **"Start final review"** → **"Mark ready"** (disabled until
  `readiness.ready`) → **"Mark as applied"** (requires an explicit browser
  confirm dialog: *"Confirm that you submitted this application outside
  AutoTime"*) → **"Add interview"**. The heading **"Application readiness"**
  and a checklist of open readiness checks are shown above the action
  (`apps/web/components/JobApplicationWorkspace.tsx` lines ~1952–2020). AutoTime
  never auto-submits an application anywhere in the product — confirmed at
  the code level (`README.md`, `docs/qa-test-account.md`, and the confirm
  dialog above).
- **Countries / sponsorship guidance**: `/dashboard/international` renders
  `InternationalModule`, described in its own file header as "an
  evidence-led view of work permission, sponsorship and relocation before
  committing to an application"
  (`apps/web/app/dashboard/international/page.tsx`).
- **In-app user feedback**: there is **no working in-app feedback submission
  route or form for normal users**. See "Onboarding blockers" below — this is
  why the welcome email asks Annie to reply by email instead.
- **Beta scope and disclaimer language**: reused verbatim/near-verbatim from
  [`../early-user-beta-onboarding-checklist.md`](../early-user-beta-onboarding-checklist.md)
  (What Not To Promise / How To Explain Beta Limitations), which is an
  existing, approved source for this product's beta messaging.

## Onboarding blockers found

### 1. ~~No working in-app feedback mechanism for normal users~~ — RESOLVED 2026-09-30

- `beta_feedback` is a real Postgres table
  (`supabase/migrations/20260801190000_admin_operations_foundation.sql`,
  `create table public.beta_feedback (...)`) and is read by the admin panel
  at `/admin/feedback` (`apps/web/lib/admin-feedback.ts`,
  `apps/web/app/admin/feedback/page.tsx`).
- It originally granted `select, insert, update` to `service_role` only, with
  no RLS policy letting an authenticated non-admin user insert their own row,
  and no route anywhere in `apps/web` wrote to it.
- **Fixed**: `supabase/migrations/20260930160000_beta_feedback_user_insert.sql`
  adds a column-scoped `insert` grant plus an RLS policy
  (`beta_feedback_insert_own`, `with check (auth.uid() = user_id)`) letting an
  authenticated user insert their own row only — no read/update/delete.
  `apps/web/app/api/feedback/route.ts` is the new `POST /api/feedback` route
  (same auth + same-origin pattern as `/api/beta/redeem-invite`), and
  `apps/web/components/FeedbackWidget.tsx` is a small floating "Send
  feedback" form mounted in `DashboardShell.tsx` on every chrome'd dashboard
  page. Testers can now submit feedback in-app; replying to the welcome
  email still works too.
- **Known gap**: no automated test covers this route yet (the repo has no
  existing pattern for unit-testing a simple authenticated Next.js route
  handler at this granularity — existing tests target domain logic, not
  HTTP routes). Worth adding if this becomes a template for future routes.

### 2. The invite code is a single shared secret, not a per-tester value

- `BETA_INVITE_CODE` is one environment variable shared by every beta tester
  (`apps/web/lib/env.server.ts`). This pack does not know its value and does
  not invent one. Before sending the welcome email, retrieve the current
  value from your own environment/secret manager (Vercel production env
  vars) and insert it into the `[INVITE CODE]` placeholder in
  [`welcome-email-annie.md`](welcome-email-annie.md).
- Minor consequence for the guide: because sign-in is OAuth-only, "use the
  email address you replied from" means Annie must sign in with the Google
  or GitHub account associated with that email — there is no separate email
  field to type into. The welcome email says this explicitly.

### 3. Reward activation (three months of Pro) is a manual step, not automated

- No code path was found that automatically grants a Pro-plan period on beta
  completion. `apps/web/app/api/stripe/*` handles paid billing; nothing
  there references beta rewards. Activating Annie's reward once she
  completes testing will be a manual admin action (e.g. a seeded/admin
  billing override) — not something this pack can verify further without
  reading billing/admin internals, which was out of scope for this task.
  Tracked as an open field in [`tracker.md`](tracker.md).
