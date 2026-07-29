# International applicants module

## Scope

The pilot adds an optional, evidence-led workspace at `/dashboard/international`. Ireland, Germany and the Netherlands have full country-pack structures. Other listed European countries use restricted explorer mode and never receive a permit-pathway or eligibility conclusion.

AutoTime provides job-search decision support. It is not an immigration adviser and does not decide whether a user qualifies for a visa or permit.

## Architecture

`packages/shared/src/international` owns validated schemas, migration, deterministic assessment and country packs:

- `types.ts` — Zod schemas and inferred domain types.
- `assessment.ts` — evidence classification and apply/investigate/skip decisions.
- `migration.ts` — non-destructive conversion from the legacy candidate profile.
- `country-packs/` — reviewed sources, evidence requirements, recruiter questions and limitations.

The UI reads those models without embedding country rules. Mobility data uses schema version 1 and user-scoped browser storage. On first use, legacy work-right details, countries, sponsorship, relocation, notice-period and salary text are copied into the structured model. Legacy data remains untouched. Free-text salary is retained as a migration note because a numeric salary without currency and pay period is not valid evidence.

## Source governance

Every official source has a publisher, URL, jurisdiction, reviewed date and rule version. To update a country:

1. Review the current official government page.
2. Update the country pack rather than a UI component.
3. Advance `reviewedAt` and `ruleVersion`.
4. Add or update an assessment test.
5. Do not encode a changing threshold unless it is required, sourced, dated and tested.

To add a country safely, create a country pack, add it to the full-country registry only after its rules and sources have been reviewed, and add incomplete/negative/positive assessment cases. Until then, route it explicitly through explorer mode.

## Assessment boundaries

The engine keeps sponsorship evidence, salary, contract, occupation duties, employer evidence and missing information separate. Negative vacancy wording can be a confirmed blocker when sponsorship is required. Positive wording is only evidence to investigate. An employer on an official register is entity-level evidence and never proves that an individual vacancy will be sponsored.

AI may explain these results later, but must not override deterministic rules, official evidence, user-confirmed facts or employer-confirmed information.

## Privacy and migration

Mobility and permission-expiry data is sensitive. It is stored under the authenticated user ID, is not logged, and is not placed in environment variables. The form does not collect nationality. The current pilot stores locally, matching the dashboard's local-first profile architecture; cloud-schema support for structured mobility data is a follow-up before multi-device sync is advertised.

## Concept transfer

Generic concepts transferred from the referenced prototype are mobility readiness, sponsor evidence levels, country workspaces, evidence-led job decisions, official sources and recruiter questions.

Personal configuration, names, salary targets, target roles, proof assets, branding, shared-secret access, old styling, hardcoded immigration conclusions and unsupported thresholds were deliberately excluded.

## Remaining phases

- Persist structured mobility fields through the authenticated cloud-sync profile table.
- Add legitimate official sponsor datasets and entity matching with checked dates.
- Feed assessments into saved jobs and application outcomes.
- Add reviewed country packs beyond the initial three.
- Validate all new flows with pilot users before adding more legal detail.

## Phase 2 entry gate

### Authoritative engine ownership

The International engine exclusively owns applicant position, work-authorisation and sponsorship evidence, employer/register evidence, country/pathway support, pathway salary and contract/occupation evidence, relocation facts and official-source governance. The fit engine owns role and skill match, ATS/CV evidence, seniority, general job quality and application readiness.

`orchestrateJobDecision` is the only boundary that combines those domains into Apply, Investigate first, Stretch application, Skip or Insufficient evidence. It retains one role-fit score and an explainable evidence ledger; it does not create an immigration score. International evidence is optional when marked not relevant, including local work-authorised flows. Missing required evidence produces Insufficient evidence, unsupported countries produce Investigate first, and deterministic International blockers take precedence. AI may explain but cannot mutate the result.

`evaluateCountryFit` remains available for compatibility, but its country, work-right, sponsorship and relocation output is explicitly deprecated and legacy-advisory. Consumers migrate by producing an `AutoTimeFitReview`, producing International evidence only where relevant, and passing both to the orchestrator.

### Persistence and components

The additive mobility schema, RLS, authenticated API, consent-aware reconciliation and local-data controls are implemented behind the server-only `AUTOTIME_MOBILITY_SERVER_SYNC_ENABLED` flag. Production remains inactive; the server becomes authoritative only after explicit consent and a confirmed response. See `docs/international-mobility-persistence.md` for transition, retention, deletion and rollback rules.

The UI controller now coordinates state and deterministic assessment. Rendering is divided into `InternationalOverview`, `CountryWorkspace`, `MobilityProfileForm`, `SponsorEvidenceGuide`, `OfficialSourcesPanel`, `InternationalSectionNavigation` and a shared evidence grid.

### Navigation and entry criteria

The primary dashboard navigation is Overview, Jobs, Applications, International, Profile and Insights. Existing URLs remain pages and are mapped as aliases; Extension, Settings and Plans are in the account menu. The exact compatibility map is in `docs/international-phase2-navigation-map.md`.

Authenticated mobility persistence may be activated only after the migration is applied in preview, cross-user RLS is verified with two authenticated identities, consent and local-to-server reconciliation UI exists, account deletion invokes the mobility deletion path, and desktop/mobile UAT passes with the flag enabled. Sponsor datasets, job feeds, new country packs and analytics remain outside this entry gate.
