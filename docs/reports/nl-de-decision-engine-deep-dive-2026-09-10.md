# Netherlands/Germany Decision-Engine Deep Dive

**Date:** 10 September 2026
**Method:** the frozen first vertical slice from `docs/reports/moat-rd-synthesis-2026-09-10.md`
(Netherlands + Germany) was meant to get a real evaluation scenario corpus. Building the first
scenario — a low-salary Netherlands candidate, meant purely as a realistic test input — surfaced a
genuine defect in the live decision engine instead. This report documents what was found, what was
fixed, and what the scenario-corpus exercise still needs, rather than presenting 20 illustrative
scenarios that would have obscured the one that actually mattered.

## The headline finding

`assessInternationalJob` (`packages/shared/src/international/assessment.ts`), the shared
cross-border decision engine behind all three live callers (`InternationalModule.tsx`,
`job-application-workflow.ts`, `decision-adapter.ts`), treats "a salary figure was supplied" as
positive evidence toward an `Apply` decision — without ever checking whether that figure actually
clears the country's real legal minimum for the pathway in question.

**Proof, run directly against the live code:**

```
Input:  Netherlands, sponsorship-required candidate, salary €1,200/month,
        vacancy supports sponsorship, employer on official register,
        contract duration and occupation mapping both confirmed.
Output: decision: "Apply", pathwayStatus: "potentially-viable",
        stamp4Verified: false
```

The Netherlands' real 2026 Highly Skilled Migrant threshold — verified against `ind.nl` directly
earlier the same session — is **€5,942/month for age 30+** (€4,357/month under 30). A candidate
stating a salary less than a quarter of the real minimum got told to proceed, with nothing in the
output disclosing that the number itself was never checked against anything.

## Why this happened

This isn't an oversight so much as a structural gap between two deliberate, individually-correct
design decisions:

1. **Country packs deliberately never embed real threshold numbers.** `germany.ts`'s own
   `limitations` field says so explicitly: "Salary thresholds are deliberately not embedded... they
   change and must be verified at the source." This is the right call — hardcoding a number this
   session's own France/Sweden research (Section 15 of the Claude Code independent moat report)
   proved varies by route within a single country would be worse than not hardcoding one at all.
2. **Stamp4's external statutory-threshold check is the only mechanism that ever compares a real
   number to a real threshold**, and it only covers four countries, only when actually invoked.

The gap: with no embedded threshold and no Stamp4 result, the function has *no way* to verify a
supplied salary — and instead of surfacing that as a genuine unknown, it silently counted the
salary's mere presence as `evidenceUsed`, contributing to a confident `Apply`.

## The fix, and why it stops short of "fixing" it fully

`packages/shared/src/international/assessment.ts` now adds an explicit disclosure to
`cannotConfirm` whenever a salary figure was supplied but not Stamp4-verified: *"Whether the
stated salary clears the current published minimum for this pathway — verify the exact figure at
the official source before relying on this result."*

Deliberately **not** fixed by embedding a real threshold number into the code. That would repeat
the exact mistake Section 15.1 of the Claude Code independent report already documented (a single
number per country is wrong the moment a country has more than one route with different
thresholds) and would require capability #1/#2 from the moat framework (versioned sources,
change detection) to keep it from going stale — neither exists yet. The correct fix, available
today without that infrastructure, is honesty: say the number wasn't checked, rather than imply it
was.

## Is this reachable by a real user today?

**Not yet, and that's worth being precise about.** Checked all three live callers directly:

| Caller | Passes `salary` to `assessInternationalJob`? |
| --- | --- |
| `InternationalModule.tsx` (`/dashboard/international`) | No |
| `job-application-workflow.ts`'s `assessMobilityBlockers` (`JobApplicationWorkspace`) | No |
| `decision-adapter.ts`'s `assessWithInternational` (browser extension via `/api/ai/content`) | No |

None of the three currently collect or pass a candidate's stated salary into this function at all.
Every live call today falls into the adjacent `missingEvidence.push("Salary with currency and pay
period")` branch instead, which correctly keeps `pathwayStatus` at `"verification-required"` and
the decision at `"Investigate first"` rather than a false `"Apply"`. **This is a real, proven
defect in a shared function three live surfaces depend on, fixed ahead of it becoming
exploitable** — not a defect actively misleading users right now. The natural next step that would
make it live-reachable is adding salary collection to any of the three callers (a very plausible
near-term enhancement, e.g. asking the candidate their target salary once, the way
`buildApplicationKitRequest` already collects other profile facts) — at which point this fix is
already in place waiting for it, rather than needing to be remembered later.

## What was also fixed the same session, found the same way

Running the full regression suite as part of verifying this fix (standard practice, not specific
to this investigation) caught a second, unrelated, already-live regression: a parallel session's
consolidation of sponsorship-denial detection into a shared `vacancyRejectsSponsorship` helper used
a literal substring list that couldn't match real phrasing like *"No visa sponsorship is
available"* or *"We are unable to provide visa sponsorship"* — both silently produced `Apply`
instead of `Skip` for a sponsorship-required candidate, confirmed via the existing
`decision-quality-evaluation` benchmark regressing from 32/32 to 30/32. Fixed the same way: restored
regex-based flexibility alongside the literal list, verified back to 32/32, added a dedicated
regression test. See commit `8faa691a`.

Unlike the salary-disclosure gap, this one **was** live and reachable — `vacancyRejectsSponsorship`
is called from all three of the same live surfaces listed above, so this was actively producing
wrong `Apply` decisions for real vacancy wording before the fix.

## What a real NL/DE scenario corpus should actually test, given this

The original plan was to write ~20-25 illustrative scenarios crossing Codex's scenario ontology
axes (work-right state, employer state, compensation, occupation, qualification, vacancy language,
evidence state, source state). That plan is still correct in shape, but this investigation changes
what the *compensation* axis specifically needs to prove, and adds one axis Codex's ontology didn't
separately call out:

- **Every compensation-axis scenario must assert not just the decision, but whether `cannotConfirm`
  correctly discloses an unverified figure** — a scenario corpus that only checked
  `decision === expected` would have passed with the bug still in place, since the bug never
  changed the decision output for the cases tested here (missing-salary cases correctly produced
  `Investigate first` throughout; the bug only manifested when salary was present and *not*
  verified, which the original scenario plan didn't specifically isolate as its own case).
- **"Salary supplied, not Stamp4-verified" deserves to be its own scenario family**, independent of
  whether the figure would actually pass or fail a real threshold - the assertion that matters is
  the disclosure appearing, not the amount.
- Two of these scenarios are now permanent, executable regression tests
  (`scripts/international-audit.test.mjs`): one proving the disclosure appears for an unverified
  figure, one proving it correctly does *not* appear when Stamp4 actually checked the number. That
  is two real, running scenarios — a smaller but more load-bearing start than twenty descriptive
  ones would have been.

The remaining scenario-ontology axes (employer-entity ambiguity, occupation-title mismatch,
qualification-recognition-pending, conflicting evidence, regulated-profession exclusion) are still
unbuilt and remain accurately described, not overstated, by Codex's original ontology proposal —
this report does not claim to have completed the corpus, only to have found and closed the one gap
building its first real scenario actually exposed.

## Relationship to the broader moat R&D

This directly strengthens rank-1/rank-2 of `docs/moat-analysis.md` and capability #6
(claim-to-evidence links) / #5 (candidate evidence provenance) from the ten-capability framework:
the product's evidence-integrity discipline ("never invent certainty") now extends to a case the
original design's own comments anticipated (Germany's explicit "thresholds deliberately not
embedded" note) but hadn't fully closed. It also reinforces the practical value of actually
building the frozen slice's evaluation corpus rather than treating it as a documentation exercise —
the first real scenario, five minutes into construction, found something no amount of describing
the *need* for a scenario corpus would have.

## Verification

- `packages/shared/src/international/assessment.ts` — `cannotConfirm` disclosure, additive, no
  decision-output change; `tsc --noEmit` clean.
- `scripts/international-audit.test.mjs` — 2 new tests (disclosure present/absent), full suite
  9/9.
- `scripts/international-module.test.mjs`, `scripts/international-orchestration.test.mjs`,
  `scripts/decision-quality-evaluation.test.mjs`, `scripts/phase-3b-workflow.test.mjs` — all green,
  no regressions from either fix.
- `apps/web/components/international/CountryWorkspace.tsx` — `cannotConfirm` added as a fourth
  "Evidence ledger" group (Used/Missing/Blockers already existed; the disclosures themselves were
  computed but never rendered anywhere before this).
- `tests/e2e/28-phase-5-countries.spec.ts` — new live Playwright test confirming a real user can
  now see the Cannot confirm group; full re-run of specs 09/11/12/28 (16/16), no regressions.

Commits: `8faa691a` (sponsorship-detection fix), `e0fb0a19` (salary-disclosure fix and UI wiring).
