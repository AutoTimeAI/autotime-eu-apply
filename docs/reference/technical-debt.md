# Technical debt

Debt discovered during the September 2026 modernization/acceptance-gate work, documented so it
stays tracked instead of being rediscovered from scratch next time someone touches this area. Not
a general-purpose backlog - only debt found through direct code investigation, with the evidence
that established it.

## `DashboardExperience.tsx` is mostly, but not entirely, dead code

**Origin:** discovered while closing acceptance gate 19 (one continuous E2E journey from vacancy
capture through approved kit to outcome status - see
[acceptance-gate-audit-2026-09-10.md](../reports/acceptance-gate-audit-2026-09-10.md)). Writing
that spec required knowing which UI actually runs the journey in production, which turned into a
full route-by-route trace of `DashboardExperience.tsx` - the original monolith this year's
modernization plan has been extracting domains out of. **Intentional migration debt, not a bug**:
each tab was meant to be replaced by its own dedicated live component one at a time
(`JobApplicationWorkspace`, `CVWorkspace`, `OutreachWorkspace`, `InterviewsWorkspace`, …), with
the old tab's route left as a `redirect()` shim once its replacement shipped - and that pattern
was followed correctly for most tabs. It was never finished for two of them, and the resulting
dead code was never itself tracked, which is what this entry fixes.

### The actual route map (verified 10 September 2026)

`DashboardExperience` is rendered by exactly two page files:

- `apps/web/app/dashboard/autofill-profile/page.tsx` -
  `<DashboardExperience focus="autofill-profile" view="profile" />`. **Live.** Linked from
  `HomeExperience.tsx` (an "Add evidence in Profile" CTA, plus a `router.push` fired from
  `onNeedsCvEvidence`), `ProfileSummary.tsx` (`/dashboard/profile`'s own "Review evidence &
  readiness" button), `InterviewsWorkspace.tsx` ("Proof Library"), `JobApplicationWorkspace.tsx`
  ("Review profile evidence"), and `apps/web/app/dashboard/settings/page.tsx` ("Profile
  Evidence"). This is a real, heavily cross-linked page - the profile-evidence/readiness surface
  real users reach from several other live pages.
- `apps/web/app/dashboard/insights/page.tsx` -
  `<DashboardExperience focus="insights" view="applications" />`. **Orphaned.** The primary nav's
  "Applications" item (`apps/web/components/UserNav.tsx`) has `href="/dashboard/applications"`
  (which renders `JobApplicationWorkspace`, not `DashboardExperience`) and lists
  `/dashboard/insights` only in that item's `aliases` array, used purely for nav-highlighting -
  not a clickable destination. The only in-app link to `/dashboard/insights` is inside
  `DashboardExperience` itself (line ~4493, a "Review progress" button), gated by
  `activeFocus === "follow-ups"`, which no route ever sets (see below) - so even that link cannot
  be reached by a real click-through. `/dashboard/insights` is a working route that 404s for
  no one, but nothing in the product points a real user at it.

`currentTab`/`activeFocus` inside the component are derived purely from the `view`/`focus` props
(`currentTab = view === "overview" ? "profile" : view`; `activeFocus = focus ?? default`) - there
is no client-side tab-switching state, so reachability is fully determined by which of the two
page files above rendered the component and what it passed. That makes the following blocks dead
regardless of which page renders them, since no page ever supplies these `view`/`focus` values:

- `currentTab === "jobs"` - `/dashboard/jobs` and `/dashboard/match-score` (a redirect shim to it)
  both render `JobApplicationWorkspace`, not `DashboardExperience`. Contains: the dead "jobs" tab's
  own EU-Fit-engine job analysis UI (`state.jobAnalysis`, `euFitEngineResult` - a full parallel
  decision engine whose *conclusions are never displayed to a production user*, though the
  underlying computation may still run whenever `DashboardExperience` mounts on the live
  autofill-profile route, since it wasn't verified whether it's tab-gated at the `useMemo`/state
  level too), the official-sources freshness panel (gate 3), and the
  `saveApplicationFromJob`/`decision_override` tracking call (half of gate 5).
- `activeFocus === "application-answers"` - `/dashboard/application-answers` and
  `/dashboard/documents` are both redirect shims to `/dashboard/applications`
  (`JobApplicationWorkspace`), not this focus value. Contains: the entire "Application Kit
  workspace" section, including both `regenerateKitDraft`/`saveApplicationKitSnapshot` call sites
  (gate 17's kit-preparation tracking).
- `activeFocus === "follow-ups"` - `/dashboard/follow-ups` renders `OutreachWorkspace`, not this
  focus value.

### What's still genuinely live inside `DashboardExperience`

Everything gated by `currentTab === "profile" && activeFocus === "autofill-profile"` (roughly
lines 4645-5761 as of this writing): the profile edit form including high-risk-field reason notes
(gate 10), the CV-context review panel, and `updateProductContext`'s `fact_correction` tracking
(the other half of gate 5). This is real, live surface area - not dead code - and any future
`DashboardExperience` decomposition work should treat it as such rather than assuming the whole
component is safe to delete wholesale.

### Recommendation

Two independent, low-risk cleanups, each doable as its own bounded change set per this repo's
"one domain per change set" rule:

1. Add a `redirect()` shim for `/dashboard/insights` → `/dashboard/applications`, matching the
   pattern already used for `/dashboard/application-answers`, `/dashboard/documents`,
   `/dashboard/inbox`, `/dashboard/match-score`, and `/dashboard/interview`. This closes the one
   remaining unshimmed legacy URL.
2. Once nothing renders `currentTab === "jobs"` or `activeFocus === "application-answers"` (true
   today, confirmed above), those two blocks - along with `state.jobAnalysis`/`euFitEngineResult`
   and any helper code that exists only to feed them - can be deleted from
   `DashboardExperience.tsx` outright. This is the largest remaining reduction available in that
   file (it is still ~8,300 lines) and, unlike the extractions already completed this
   modernization pass, is a deletion rather than a relocation, since `JobApplicationWorkspace`
   already covers the live equivalent of the "jobs" tab's user-facing purpose.

Neither of gates 3 or 17 needs re-implementing to close this debt - deleting their dead call
sites is the correct fix, not porting them to a live surface (unlike gates 1 and 4's
`decision-adapter.ts`/shared-schema fixes, which were already live via the browser extension and
the shared evidence model respectively, or the live decision-engine work below, which addressed
the same underlying product need through the live workspace directly rather than by resurrecting
dead code).

## Two independent live decision engines for cross-border/hard-blocker logic

**Origin:** discovered while implementing the live decision-engine enhancements described in
[quality-assurance.md](../quality-assurance.md)'s "Live decision-engine enhancement - 2026-09-10"
entry (commit `a63d9c2a`).

There are now two separate, live, non-unified code paths that assess a candidate's cross-border/
mobility hard blockers:

- `apps/web/platform/application-preparation/decision-adapter.ts`'s `assessApplicationDecision`,
  reached via `/api/ai/content` - called by the browser extension
  (`apps/extension/lib/openai.ts`) and by `DashboardExperience`'s now-dead "application-answers"
  kit workspace (redundantly, per above).
- `apps/web/lib/job-application-workflow.ts`'s `analyseJob`, called from
  `JobApplicationWorkspace.tsx` - the live jobs/applications workspace most users actually use.

Both ultimately call the same underlying engine (`assessInternationalJob` in
`packages/shared/src/international/assessment.ts`), so their conclusions should already be
consistent in principle, but they are wired up independently: `decision-adapter.ts` resolves a
target country from the candidate's saved profile, while `job-application-workflow.ts` resolves it
from the vacancy's own extracted country fact first. Nothing currently tests that the two paths
would reach the same conclusion given the same candidate and job. Unifying them (or at minimum
adding a cross-path consistency test) is future work, not done as part of either fix, to keep each
change set scoped to one call site per this repo's modernization rules.

## Extension

- Treat `docs/mvp-spec-alignment.md` as the product backlog source before
  adding new feature work.
- `apps/extension/sidepanel/main.tsx` now acts mainly as the side-panel
  orchestrator. Shared constants, small helpers, side-panel response types,
  navigation, saved-data view sections, the applications list, and edit forms
  have been extracted; form state, persistence calls, tracker import logic, and
  active-section routing still live in the main component.
- Consider extracting side-panel state and persistence handlers into focused
  hooks before adding larger workflows.
- Keep background code under `apps/extension/entrypoints/background/index.ts`.
  WXT discovers that entrypoint for the generated MV3 background script.

## Shared Package

- `packages/shared` now contains V2 domain schemas and types. Keep future
  backend/web/extension sync work aligned to those contracts instead of
  creating parallel schema shapes.
