# shared

Domain types, Zod schemas, and pure decision-logic shared between `apps/web`
(Next.js) and `apps/extension` (Chrome extension). Both apps depend on it as
a workspace package (`"shared": "workspace:*"`) and import it directly:

```ts
import { evaluateAutoTimeFitScore, candidateProfileSchema } from "shared"
```

There's a single entry point, `src/index.ts`, which re-exports every module
below. Consumers should always import `from "shared"`, not from a file path
inside `packages/shared/src/`.

## Why this package exists

AutoTime EU Apply has two clients (a browser extension that captures job
postings and works local-first, and a web app that syncs data to the cloud
and calls AI providers) that both need to agree, byte-for-byte, on:

- what a candidate profile, job posting, and application record look like
- how a job's fit score and country/sponsorship viability are computed
- what "AutoTime supports this job board/ATS" actually means

Putting that logic here instead of duplicating it per-app means a fit score
computed in the extension's content script and one computed in a web API
route are guaranteed to agree, and a schema change only has to happen once.

## What lives where

| File | Purpose |
| --- | --- |
| `src/schemas.ts` | Zod schemas for every persisted/synced domain object (candidate profile, job analysis, application record, evidence, outcomes, dashboard state). The source of truth for shape validation. |
| `src/types.ts` | TypeScript types derived from `schemas.ts` via `z.infer`. What consumers actually import for type annotations. |
| `src/fit-model.ts` | The local (non-AI) role/skill fit-scoring engine (`evaluateAutoTimeFitScore`), plus the mock/offline EU-fit summary and application-positioning content generators used when no live AI provider is configured. Also holds the **deprecated** legacy country-fit evaluator (`evaluateCountryFit`). |
| `src/country-rules.ts` | Legacy, keyword-based country rulebook (UK/Ireland/Germany/Netherlands/France/EU) used only by the deprecated `evaluateCountryFit` path. |
| `src/profile-bridge.ts` | Cheap "is this profile complete enough to use" checks, independent of running the full fit engine. |
| `src/ats-detector.ts` | Detects which ATS a job URL belongs to and whether it's API-covered, built on `platform-coverage.ts`. |
| `src/platform-coverage.ts` | Hand-maintained, honesty-first registry of every job board/ATS/network AutoTime claims to support, with per-capability status and public limitation text. |
| `src/role-pathways.ts` | The "Career Direction" feature: ESCO occupation catalogue (bundled offline fixture + live API client + resilient fallback wrapper), the capability/market scoring algorithm, and schemas for a saved lane selection / in-progress discovery state. |
| `src/international/` | The current (non-deprecated) cross-border mobility module — see below. |

### `src/international/`

The successor to the legacy `country-rules.ts` + `evaluateCountryFit` path.
Evidence-first by design: it only ever reports what evidence was supplied or
is missing, and never asserts a visa/permit outcome.

| File | Purpose |
| --- | --- |
| `types.ts` | Schemas/types for `MobilityProfile` (candidate's own mobility situation), `InternationalAssessmentInput` (per-job evidence), `CountryPack`, and the resulting `InternationalAssessment`. |
| `assessment.ts` | `assessInternationalJob` — the rule-based engine that turns a mobility profile + job evidence into an Apply/Investigate/Skip decision, routed through the matching `CountryPack`. |
| `migration.ts` | One-way adapter from the legacy `CandidateProfile` shape to the newer `MobilityProfile`, so existing onboarding data doesn't need a destructive migration. |
| `orchestration.ts` | `orchestrateJobDecision` — the **only** place allowed to combine role/skill fit (`fit-model.ts`) with international evidence (`assessment.ts`) into one final job decision. |
| `country-packs/` | One file per supported country (`ireland.ts`, `germany.ts`, `netherlands.ts`) with pathways, required evidence, and cited official government/EU sources, plus `european-explorer.ts` as the generic fallback for countries without dedicated coverage. |

## How each app consumes it

- **`apps/web`** imports `shared` throughout its API routes (`app/api/ai/*`,
  `app/api/sync/*`, `app/api/role-pathways/*`) and components
  (`components/international/*`, `components/RolePathwaysExperience.tsx`,
  `components/JobApplicationWorkspace.tsx`) to validate synced data
  (`schemas.ts`), run fit scoring server-side, and drive the International
  and Role Pathways UI. `apps/web/lib/cloud-sync.ts` persists
  `CompanionDashboardState` (the aggregate schema in `schemas.ts`) to
  Supabase.
- **`apps/extension`** imports it in `sidepanel/main.tsx` and
  `lib/v2-dashboard.ts` / `lib/job-page.ts` to score jobs and detect ATS
  coverage locally, and to keep its local-storage dashboard state in the same
  shape the web app syncs to the cloud — so a profile or application saved in
  the extension is immediately valid input for the web app, and vice versa.

Both apps compile this package straight from TypeScript source
(`"types": "./src/index.ts"`, no separate build step consumed at import
time) via the workspace link, so changes here are picked up without a
publish step.
