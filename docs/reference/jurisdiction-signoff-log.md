# Jurisdiction sign-off log

Tracks acceptance gate 6 (`docs/reports/acceptance-gate-audit-2026-09-10.md`): *"High-risk
conclusions receive scenario-based QA and human subject-matter review before their jurisdiction
is marketed as supported."* This is the one acceptance gate in this repo that genuinely cannot be
closed by writing code - it requires a named, qualified human (immigration/compliance expertise
for the jurisdiction in question) to actually review AutoTime's country-specific guidance and sign
their name to it. **No entry below has been completed. This file exists to make that fact visible
and trackable, not to imply it has happened.**

## Why this can't be closed the way the other 23 gates were

Every other gate in the acceptance audit was closed by code: adding a field, wiring a check,
writing a test, fixing a bug. This one is structurally different - the thing being certified is
*"a qualified person actually reviewed this and stands behind it,"* and no amount of code can
manufacture that fact. Writing a fake entry into this log would be the exact failure mode
`packages/shared/src/international/assessment.ts`'s own design exists to prevent for end users
(inventing certainty that isn't there) - applied to the meta-process instead of a candidate's own
case. So this file stays honestly empty until a real reviewer fills a row in.

## Scope: which jurisdictions need this

AutoTime makes jurisdiction-*specific* claims (named pathways, required evidence, sponsor
registers, occupation-code mapping) only for the four countries with a dedicated `CountryPack`
(`packages/shared/src/international/country-packs/*.ts`, `supportLevel: "full"`):

- United Kingdom (`uk.ts`)
- Ireland (`ireland.ts`)
- Germany (`germany.ts`)
- Netherlands (`netherlands.ts`)

Every other country - including France - resolves to `european-explorer.ts`'s generic fallback
pack, which is deliberately incapable of producing a jurisdiction-specific conclusion:
`assessInternationalJob`'s explorer branch always returns `"Investigate first"` with
`pathwayStatus: "not-supported"` and an explicit `cannotConfirm` list, never a country-specific
pathway determination. That's a real, code-enforced ceiling on the claim explorer-tier countries
can make, not a promise - so they carry materially lower governance risk by construction and are
listed separately below rather than blocking on the same bar.

## The four full-support jurisdictions

| Jurisdiction | Country pack | Named qualified reviewer | Review date | Scenario-based QA evidence | Sign-off scope/caveats |
| --- | --- | --- | --- | --- | --- |
| United Kingdom | `uk.ts` | _Not yet assigned_ | _Not reviewed_ | _None recorded_ | — |
| Ireland | `ireland.ts` | _Not yet assigned_ | _Not reviewed_ | _None recorded_ | — |
| Germany | `germany.ts` | _Not yet assigned_ | _Not reviewed_ | _None recorded_ | — |
| Netherlands | `netherlands.ts` | _Not yet assigned_ | _Not reviewed_ | _None recorded_ | — |

## What a real reviewer needs to check per jurisdiction

Adapted from the strategy document's own gate wording and `assessInternationalJob`'s actual
claims for a `"full"`-support country pack - a reviewer should be someone with real
immigration/employment-law competence for that specific jurisdiction, and should confirm:

1. **Pathways** (`CountryPack.pathways`) - every named immigration route is real, current, and
   correctly described.
2. **Required evidence** (`CountryPack.requiredEvidence`) - the evidence AutoTime asks the
   candidate to confirm is actually what a real applicant/employer needs for those pathways.
3. **Recruiter questions** (`CountryPack.recruiterQuestions`) - genuinely the right questions to
   surface a real blocker or requirement for that jurisdiction.
4. **Sources** (`CountryPack.sources`, `OfficialSourceCitation[]`) - each citation resolves to a
   real, current official (government/EU) page; `reviewedAt`/`ruleVersion` are accurate as of the
   review date, not stale.
5. **Limitations** (`CountryPack.limitations`) - honestly captures what the pack does *not* cover,
   consistent with `assessInternationalJob`'s own `cannotConfirm` disclosures.
6. **Scenario-based QA** - a concrete set of realistic candidate scenarios (e.g. "non-EU candidate,
   employer without a sponsor licence," "EU candidate switching sectors," "salary just below the
   published threshold") run through the actual live pipeline
   (`assessInternationalJob`/`analyseJob`), with the reviewer confirming each output is the
   correct real-world answer - not just that the code runs without error.

## Recording a completed review

When a real review happens, replace that jurisdiction's row above with the reviewer's name/title,
the organisation they're reviewing on behalf of (if applicable), the date, a link to or summary of
the scenario evidence used, and any caveats or expiry the reviewer attaches (e.g. "valid until the
next UK Immigration Rules update"). Do not mark a jurisdiction reviewed based on this file's
existence alone, an AI-generated summary, or anything short of an actual named person's sign-off.
