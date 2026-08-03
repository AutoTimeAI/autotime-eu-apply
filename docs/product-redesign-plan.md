# Product redesign delivery plan

## Completed through Phase 3A

- Phase 1 route, workflow, duplication, design-system and state audit.
- Seven-destination authenticated navigation architecture.
- Shared shell accessibility improvement with skip link.
- Shared design tokens and page/status/evidence/empty-state primitives.
- Baseline desktop and mobile screenshots.
- Typed feature-specific readiness and contextual missing-information states.
- Deterministic Home next action and value-led progressive onboarding.
- Removal of the universal 90% navigation and dashboard execution gate.

## Phase 3: primary workflow

1. ~~Replace the Home locked-workflow presentation with a next-action brief.~~
2. Combine Role Pathways and lane/evidence summaries under Career Direction.
3. ~~Extract Jobs and Job Analysis from `DashboardExperience` into one
   job-context workspace.~~
4. ~~Create one application workspace and map legacy CV/answers routes to the consolidated destination.~~
5. ~~Present Applications as a compact pipeline plus attention list.~~
6. ~~Add resumable progressive onboarding without weakening evidence safeguards.~~

## Phase 4: supporting workflow

1. Link every interview pack to a selected application.
2. Reframe International as Countries and reuse mobility facts automatically.
3. Consolidate profile, preferences and evidence confirmation.
4. Move extension diagnostics and learning/audio behind contextual utilities.

## Analytics event plan

Extend the existing typed analytics abstraction with: onboarding started,
evidence confirmed, pathway selected, job added, job analysed, application
prepared, application submitted, interview added and outcome recorded.
Properties must be enumerated workflow metadata only—never CV text, identity,
mobility facts, answers or generated content.

## Known gaps

- Jobs, Applications and Interviews still use the legacy large component even
  though their readiness checks are now capability-specific.
- Primary pages still share the legacy large client component.
- Cross-module source-of-truth consolidation needs a separately reviewed data
  plan; no migration was applied.
- Before screenshots exist; after screenshots are recorded with Phase 2
  verification in `docs/product-responsive-verification.md`.
