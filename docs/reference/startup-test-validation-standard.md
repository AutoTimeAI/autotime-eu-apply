# Startup-Level Test & Validation Standard

What "properly tested" actually means for AutoTime EU Apply at its current
stage: a pre-revenue/early-beta startup with one founder and AI-agent
engineering support, not a funded company with a QA team, a compliance
function, or an SLA to enterprise customers. This document exists because
the release-assurance material already in this repo (the End-to-End
Release Assurance Pack, the production release dossier) is written at a
formality level suited to a regulated or enterprise release process. That
process is not wrong to have as a reference, but treating every release as
if it needs full sign-off from a release owner, incident lead, and
rollback operator - roles that don't exist yet because there's one person
- creates paperwork that nobody is actually going to complete, which is
worse than no checklist at all: it trains everyone to skim past "Open"
rows instead of trusting them.

This document sets the bar that is actually appropriate right now, and
says explicitly when to raise it.

## Principle

**Automate everything that can be automated. Reserve human time only for
what genuinely requires a human.** A startup's advantage is speed; a test
process that can't keep up with a solo founder shipping multiple times a
day is a process that will get bypassed, not followed.

## The right-sized bar for *every* production deploy

This is the bar the existing GitHub Actions workflow
(`.github/workflows/production-deploy.yml`) already enforces automatically
and should keep enforcing. Nothing below this bar ships:

1. **Typecheck + lint** clean.
2. **Full automated unit/integration suite** (`pnpm test:unit`) passing -
   this already covers decision-logic correctness, RLS/ownership checks,
   Stripe webhook logic, security-boundary behavior, and migration safety
   as unit-level assertions, which is the highest-leverage form of testing
   for a small team because it costs nothing to rerun.
3. **Production build succeeds.**
4. **Post-deploy smoke check** (`pnpm smoke:web`) against the real
   deployed URL - proves the app actually serves, not just that it built.
5. **Automatic rollback** on smoke failure - already wired in, keep it.

If these five pass, the deploy is *safe to ship*. That is a materially
different question from "is this release fully validated for a public
launch," which is the next tier.

## The right-sized bar for a beta/release milestone (not every deploy)

Run this before inviting a new cohort of real users, not before every
commit:

1. Everything above, plus:
2. **A real, live walkthrough of the core journey** by a human or an
   AI-agent session with actual browser access - not just unit tests.
   This is what caught the profile-edit race condition and the Stripe
   price-display gap this session; unit tests alone did not.
3. **Automated accessibility scan** (axe) on the handful of screens a new
   user actually touches first (login, dashboard, the primary workflow).
   Already exists in `tests/e2e/*.spec.ts` via `expectNoSeriousViolations`.
4. **A skim of the Supabase security/performance advisors** - two tool
   calls, catches real issues (this session found and fixed two).
5. **A skim of recent production error logs** (Vercel/Sentry) for
   anything new since the last release.

This is roughly 30-60 minutes of actual work, most of it delegatable to an
AI-agent session with production access. It is not a 12-section signed
document.

## What to explicitly *not* do at this stage

- **Do not require a named "release owner," "incident lead," and
  "rollback operator" as three distinct people or roles.** There is one
  founder. Write "founder" once, in one place, and move on. Re-derive this
  the moment there are 2+ people who could plausibly be on call.
- **Do not require a formal restore-from-backup rehearsal** before every
  release. Do check, once, that Supabase's default backup/PITR settings
  are what you think they are (this is a five-minute dashboard check, not
  a rehearsal) - see the checklist below for when a real rehearsal
  actually matters.
- **Do not require a manual keyboard-only accessibility pass for every
  release.** Automated axe scans catch the large majority of real issues
  for a small user base. A manual pass is worth doing *once*, thoroughly,
  as a one-time investment - not repeated per release until there's a
  legal/compliance reason to (a public launch with a stated accessibility
  commitment, an actual user complaint, or a paying enterprise customer
  asking for a VPAT).
- **Do not draft a formal signed decision record for a private beta with
  a handful of invited users.** A dated Slack/notes-app line from the
  founder ("shipped X, checked Y, going ahead") is proportionate evidence
  at this stage. Reserve a formal signed document for the actual public
  launch decision.

## When to raise the bar (explicit triggers, not vibes)

Move a given item from "skip" to "required" when one of these becomes
true - not preemptively:

| Trigger | What becomes required |
|---|---|
| Taking real payment from real users (even test-mode Stripe with real cards) | A genuine end-to-end Stripe transaction test, not just webhook unit tests |
| More than ~50 real invited users, or any paying user | A real (not just checked-once) backup/PITR verification, and a real rollback rehearsal |
| A second person joins who could plausibly be on call | Actually name an incident lead / rollback operator, distinct from the founder |
| Any public launch (not invite-only) | Full public-launch gate: UAT with real users, ICO registration, ToS/privacy legal review, Chrome Web Store manual pass, Sentry alerting verified live, ADA/accessibility legal exposure reassessed |
| A user reports an accessibility barrier, or a customer asks for a VPAT | Manual keyboard/focus/contrast pass, properly documented |
| A security incident occurs | Real incident-response process, not a template |
| Outside investment / a compliance-driven customer | Formal signed release records become worth the overhead |

## How this maps onto the existing documents

- `docs/reference/testing/public-launch-gate-checklist.md` and the
  End-to-End Release Assurance Pack describe the **triggered, heavier**
  process from the table above. Keep them - they're the right shape for
  when a trigger fires. Don't run them for every private-beta release.
- `docs/reports/release-evidence-index.md` should keep pointing at
  whichever single document is current, but for day-to-day private-beta
  releases that current document can be this standard's lighter bar, not
  the full dossier.
- `docs/reference/claude-code-pre-release-runbook.md` already matches this
  document's philosophy reasonably well (automated gates, explicit
  BLOCKED/NO-GO on missing evidence) and needs no change.

## Bottom line

For where this product actually is today - a private, invite-only beta
with one founder - "properly tested" means: the automated gates above all
pass, a real human (or AI-agent-with-browser-access) walkthrough of the
core journey happened recently, and nothing in the Supabase/Vercel/Sentry
dashboards shows a new problem. That is a real, defensible, honestly-
achievable bar. Insisting on the full enterprise dossier for every release
at this stage doesn't make the product safer; it makes the checklist
theater that gets rubber-stamped.
