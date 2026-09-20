# Release Summary — Private Beta v1.0.1 (2026-09-19 → 2026-09-20)

**Plain-English entry point.** Everything here is backed by evidence in
`docs/quality-assurance.md` (the exhaustive day-by-day log) and the other
reports in this folder - this document exists so a human can understand
what actually happened across two days of work without reading thousands
of lines of log first. If this summary and the detailed logs ever
disagree, the detailed logs are correct and this file needs updating.

## Where things stand right now

**Decision: GO WITH LIMITATIONS.** Production is live at commit
`c791e7f2aacd246d8768ab239f76b1edf43fd564`, deployment
`dpl_GWJbTExcaRD1TpFHb7HDGrMJwvKb`, verified two ways: Vercel confirms the
live domain resolves to this exact deployment, and a real request against
the live site was checked (homepage, login, an authenticated-only route
correctly redirecting, and a couple of today's specific fixes).

Two things remain genuine, disclosed, accepted risks - not oversights,
not silently shipped:

1. **No database backup coverage.** The Supabase project is on the Free
   plan: zero scheduled backups, no point-in-time recovery. If the
   database is lost or corrupted right now, there is no way to restore
   it. Accepted in writing by the founder on 2026-09-19/20.
2. **No leaked-password protection.** Supabase's check against known
   compromised passwords (HaveIBeenPwned) is a Pro-plan-only feature and
   isn't available on the Free tier at all - not something that can be
   toggled on. Accepted in writing by the founder on 2026-09-20.

Both are the same underlying limitation (the Supabase Free plan) and both
are resolved together by a single Pro-plan upgrade. Full formal
risk-acceptance statements, with exact wording of what's being accepted,
are in `external-manual-signoff-record.md`.

Everything else that a private-beta release needs - authentication,
authorization, cross-user data isolation, accessibility, rollback
readiness, named ownership, privacy/beta-terms/support confirmation - is
a genuine **Pass with real, live evidence**, not a checkbox. See
`testing-categories-coverage-v1.0.1-2026-09-19.md` for the full
category-by-category breakdown.

## The story, in order

### 2026-09-19: building the release-readiness framework from scratch

The day started from "we need to release" and ended with a real,
evidence-based go/no-go process instead of a vibe. Along the way:

- A real Stripe billing bug (pricing shown inconsistently across the
  app) and a webhook idempotency gap were found and fixed - not
  theoretical, found by actually testing the billing flow.
- A security-advisor sweep found and fixed 2 real Postgres RLS/RPC
  bugs: excess `EXECUTE` grants on functions that shouldn't have been
  publicly callable, and ~119 RLS policies re-evaluating `auth.uid()`
  once per row instead of once per query.
- A rollback was actually rehearsed live against production (not just
  documented as a procedure) - rolled back one deployment, confirmed it
  worked, rolled forward again. Full round trip under a minute.
- Checking the Supabase dashboard directly surfaced the backup/PITR gap
  for the first time: the project has been on the Free plan, with zero
  backup coverage, this whole time.
- The first production-release-dossier was written and signed **GO WITH
  LIMITATIONS**, with backup/PITR as the one accepted risk.

### 2026-09-20 (morning): closing the loop on yesterday's open items

- Built and shipped a real, tracked beta-terms acceptance feature
  (a server-timestamped checkbox, not just a page of text) - and while
  verifying it live, found a real deployment bug: the production domain
  alias hadn't been reclaimed after the previous day's rollback
  rehearsal, so the live site was silently serving a stale build despite
  every deploy workflow reporting success. Fixed by explicitly
  reassigning the alias. **This exact failure mode recurred later the
  same day (see below) - it's a real, repeatable gap in this project's
  deploy tooling, not a one-off.**
- Closed cross-user data isolation with a genuine two-real-account live
  test (previously only verified by reading the code, not by actually
  trying it) - confirmed a second real account correctly cannot see the
  first account's data.
- The founder explicitly instructed the backup/PITR risk be accepted in
  writing rather than the plan being upgraded - the first formal,
  written risk-acceptance record of this release cycle.
- A live, costed OpenAI API test ($0.000509, not a mock) closed the last
  gap in AI/integration testing.
- WebKit browser compatibility, which had been written off as "a known
  Windows platform limitation," was actually investigated: the real
  cause was a Playwright/Windows driver bug (WebKit itself launches
  fine, but hangs indefinitely on the next call). Proven by running the
  identical check on Linux CI instead, where it passed cleanly in ~8
  seconds - closing the gap with real evidence instead of an assumption.

### 2026-09-20 (afternoon): a systematic search for real logical bugs

Rather than keep testing more input combinations against logic that was
already believed correct, the method shifted: trace what a UI label, a
field name, or a documented claim *promises*, then verify the code
actually *delivers* on it. This found real bugs no amount of "test more
countries" would have surfaced:

**The mobility/sponsorship decision engine - 5 bugs, all silent false
negatives** (the tool told a candidate "no concern here" when there
genuinely was one):
- A candidate who confirmed work permission for *one* target country got
  that treated as blanket permission for *every* country they applied
  to.
- The same bug, for EU/EEA/Swiss citizens applying to the UK specifically
  (which left the EU/EEA free-movement zone after Brexit).
- The same bug again for "locally work-authorised" candidates - confirmed
  with the founder this was genuinely a bug, not intentional, since a
  pre-existing test had asserted the buggy behaviour as correct.
- A candidate who said "I'm not sure if I'll need sponsorship" got
  *less* caution than one who said "yes, I need it" - backwards, since
  "unsure" is exactly who most needs the warning.
- A work-permit expiry date the candidate themselves entered was
  collected by the form and then never actually checked by anything -
  an expired permit was treated as still valid.

**The country/location fit-scoring engine - 5 bugs, all silent false
positives** (the tool said "strong match" when the job was in the wrong
country entirely):
- A Kyiv, Ukraine vacancy scored as a strong match for a candidate
  targeting the **United Kingdom** - "UK" is a substring of "Ukraine."
- A Belfast, Northern Ireland (UK territory) vacancy scored as a strong
  match for Ireland - same substring problem.
- Real US cities that share a name with European cities - Dublin,
  California; Paris, Texas; Manchester, New Hampshire - each scored as a
  strong match for Ireland, France, and the UK respectively.

**The interview pipeline** - a smaller data-model gap: cancelling an
interview never actually recorded a "cancelled" outcome, leaving that
value permanently unreachable (no live user impact today, since nothing
reads the stale field without also checking status first, but a real
gap in the data model).

**Areas checked and found to already be solid**: Stripe billing state
transitions, the AI-content-generation credit/rate-limit gating logic,
and the browser extension's job-capture/ATS-detection registry - all
already built with the same rigor this session was applying elsewhere,
so nothing to fix.

### 2026-09-20 (evening): the GDPR finding, and a full "fix everything checkable" pass

The single most consequential finding of the entire two days:

- Querying the live production database directly (not trusting any
  document's claim of completeness) found **10 real tables holding
  genuine personal data** - including one with 3,118 rows for a real
  user - that were completely missing from the GDPR account-data export.
- Worse: **4 of those tables would have made account deletion itself
  fail outright** for any user with a row in them, due to a database
  foreign-key setting that didn't cascade the way the code's own
  comments claimed it did. This is a live Article 17 ("right to
  erasure") bug - a specific, confirmed real user in production could
  not have deleted their account through this route today. Both fixed
  and verified live.

Following that, the session took on an open-ended "find and fix
everything objectively checkable" pass:

- Found that `eslint` (the code-quality linter) had been installed but
  could never actually run, due to a real version mismatch between it
  and its own plugins - not an oversight, a genuine incompatibility.
  Fixed the version pin, then worked through the resulting 55 real
  findings: 43 fixed properly, 12 left deliberately with a documented
  reason each (mostly places where "fixing" the linter's suggestion
  would have introduced a real behavioural risk, like breaking image
  display or changing login-redirect behaviour, for no real gain).
- Closed a database performance gap: 30 RLS policies were only half
  fixed by an earlier optimization (only their read-side clause was
  sped up, not their write-side clause), and 76 foreign keys had no
  index at all, confirmed and fixed against the live database.
- Found and fixed one more real security finding during a final
  pre-deploy check: a database function had broader execute permissions
  than it needed (though, checked carefully, not actually exploitable -
  fixed for hygiene anyway).
- Signed a second formal, written risk acceptance for the
  leaked-password-protection gap, matching the same rigor as the
  backup/PITR one.
- Deployed all of the above to production - and the exact same
  stale-alias bug from that morning **recurred**, this time on an
  ordinary forward deployment rather than after a rollback. Confirmed
  this is a real, repeatable gap in the deploy workflow itself, not a
  fluke, fixed it the same way, and verified the live site was actually
  serving the new code with real HTTP requests, not just trusting the
  deployment tool's own "success" report.

## What this means going forward

- **Before scaling past the current small invited cohort**: revisit the
  two accepted Supabase Free-tier risks (backup/PITR, leaked-password
  protection) - one Pro-plan upgrade resolves both.
- **The deploy workflow needs a fix, not just a workaround**: the
  stale-alias bug has now happened twice, in two different trigger
  scenarios. The current mitigation (always manually verify the live
  domain's actual deployment after every deploy) works, but it's a
  process fix, not a tooling fix - the workflow itself should reliably
  claim the alias without a human needing to check.
- **`local-work-authorised`'s exact intended semantics** were confirmed
  once, but the underlying data model still doesn't structurally capture
  "which specific country does this candidate's permission apply to" -
  today's fix uses `currentCountry` as a reasonable proxy, which is
  correct for the common case but not a complete model.
- **Component-level testing is new and thin**: only one component
  (`OnboardingWizard`) has real test coverage; the rest of the app is
  still verified only through end-to-end tests. Not urgent, but a real
  gap.

## Where to look for more detail

- **This file** - the story, for a human.
- `release-evidence-index.md` - the canonical current-state pointer
  (artefact SHA, deployment ID, decision, links to every other document).
- `testing-categories-coverage-v1.0.1-2026-09-19.md` - the 24-category
  testing framework, category by category.
- `external-manual-signoff-record.md` - the two formal written
  risk-acceptance statements, in full.
- `docs/quality-assurance.md` - the exhaustive, dated, evidence-linked
  log of literally everything - every bug, every fix, every verification
  step, every reproduction case. The source of truth this summary was
  written from.
