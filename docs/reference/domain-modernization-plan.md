# Domain modernization plan

**Adopted:** 10 September 2026
**Status:** Official engineering direction. Cross-reference [roadmap-execution-status.md](roadmap-execution-status.md)
for what is implemented versus what still needs product/exit-gate evidence, and
[repository-organization-policy.md](repository-organization-policy.md) for where
code, config, docs and generated output belong.

## Objective

Incrementally reorganize the code around the three core product domains:

1. EU Fit
2. Evidence integrity
3. Application preparation

The goal is to reduce risk and improve ownership without performing a dangerous
full rewrite.

## Target architecture

```text
apps/web/
├── app/                         Next.js routes and pages
├── domains/
│   ├── eu-fit/
│   │   ├── model/
│   │   ├── policies/
│   │   ├── services/
│   │   ├── schemas/
│   │   ├── components/
│   │   └── tests/
│   ├── evidence/
│   │   ├── model/
│   │   ├── provenance/
│   │   ├── claim-validation/
│   │   ├── services/
│   │   ├── components/
│   │   └── tests/
│   └── application-preparation/
│       ├── model/
│       ├── generation/
│       ├── review/
│       ├── export/
│       ├── components/
│       └── tests/
├── platform/
│   ├── ai/
│   ├── auth/
│   ├── billing/
│   ├── persistence/
│   ├── observability/
│   └── email/
└── components/                  Truly shared UI only
```

Shared, runtime-independent domain contracts can remain under:

```text
packages/shared/src/
├── evidence/
├── eu-fit/
├── applications/
└── platform-coverage/
```

### Dependency direction

```text
Pages and API routes
          ↓
Application use cases
          ↓
Core domain policies
          ↓
Typed platform interfaces
          ↓
Supabase / OpenAI / Stripe / Resend / Sentry
```

Domain rules should not directly depend on React, Next.js, Supabase or OpenAI.

## Phase 0 — protect existing behavior

Before moving code:

- Add characterization tests around current behavior.
- Record expected EU Fit results for representative scenarios.
- Record evidence-support and unsupported-claim behavior.
- Record application-kit generation and approval behavior.
- Capture current public types and API response shapes.
- Establish baseline browser journeys.
- Add real ESLint execution.
- Add coverage reporting.

No behavior should intentionally change in this phase.

## Phase 1 — extract EU Fit

Start with `packages/shared/src/fit-model.ts`.

Suggested decomposition:

```text
packages/shared/src/eu-fit/
├── types.ts
├── normalize-input.ts
├── requirement-matching.ts
├── evidence-strength.ts
├── mobility-assessment.ts
├── hard-blockers.ts
├── scoring.ts
├── recommendation.ts
├── explanation.ts
└── index.ts
```

Extraction order:

1. Move types without changing exports.
2. Extract pure input normalization.
3. Extract hard-blocker evaluation.
4. Extract evidence-strength calculation.
5. Extract scoring.
6. Extract recommendation selection.
7. Extract explanation formatting.
8. Keep the original `fit-model.ts` as a compatibility facade.
9. Migrate callers gradually.
10. Remove the facade only after all imports are migrated.

**Critical rule:** Hard blockers must remain deterministic and must not be
averaged away by numeric scoring.

## Phase 2 — extract evidence integrity

Create a single evidence model shared by EU Fit and application preparation.

```text
packages/shared/src/evidence/
├── types.ts
├── fact-status.ts
├── provenance.ts
├── conflicts.ts
├── claim-support.ts
├── validation.ts
└── index.ts
```

Canonical fact states:

```ts
type EvidenceStatus =
  | "verified"
  | "user_declared"
  | "inferred"
  | "conflicting"
  | "stale"
  | "missing";
```

Every important claim should contain:

- Claim text or structured value
- Evidence reference
- Evidence status
- Source
- Confirmation time
- Candidate approval
- Applicable vacancy requirement
- Conflict or uncertainty state

Application generation must consume this evidence model instead of reading
loosely structured profile text.

## Phase 3 — extract application preparation

Create an application workflow independent of UI and providers:

```text
apps/web/domains/application-preparation/
├── use-cases/
│   ├── prepare-application.ts
│   ├── review-application.ts
│   ├── approve-application.ts
│   └── export-application.ts
├── generation/
│   ├── prompt-builder.ts
│   ├── response-parser.ts
│   └── generation-policy.ts
├── review/
│   ├── claim-review.ts
│   ├── risk-classification.ts
│   └── approval-policy.ts
├── ports/
│   ├── ai-provider.ts
│   ├── application-repository.ts
│   └── audit-repository.ts
└── tests/
```

The workflow should enforce:

```text
Accepted/overridden EU Fit decision
              ↓
Supported evidence map
              ↓
Draft application
              ↓
Unsupported-claim validation
              ↓
Human review
              ↓
Explicit approval
              ↓
Export or reviewed autofill
```

OpenAI should generate only through a typed provider interface. It should not
determine whether unsupported content is acceptable.

## Phase 4 — reduce dashboard concentration

Do not split `DashboardExperience.tsx` by arbitrary line ranges.

Extract one complete product capability at a time:

1. EU Fit state and actions
2. Evidence-review state
3. Application-preparation state
4. Role outcome state
5. Dialogs and forms
6. Navigation and shell

For each extraction:

- Add or preserve tests.
- Move state transitions into a hook or use case.
- Move view code into a domain component.
- Keep the old component as the temporary coordinator.
- Verify behavior.
- Remove migrated state and callbacks from the coordinator.

Initial target:

- Below 7,000 lines after the first cycle
- Below 3,000 lines after core extraction
- Ultimately below 500–800 lines as a dashboard shell

These are risk indicators, not arbitrary release gates.

## Phase 5 — divide styling

Split `apps/web/app/globals.css` into:

```text
apps/web/styles/
├── tokens.css
├── reset.css
├── typography.css
├── layout.css
├── accessibility.css
└── domains/
    ├── eu-fit.css
    ├── evidence.css
    ├── applications.css
    └── dashboard.css
```

Before moving selectors:

- Identify selector usage.
- Add visual baselines for core states.
- Move one domain at a time.
- Compare desktop and mobile screenshots.
- Remove selectors only after verifying they have no consumers.

## Phase 6 — simplify API routes

API route responsibilities should be limited to:

```text
Authenticate
    ↓
Parse and validate request
    ↓
Call one use case
    ↓
Map domain result to safe response
```

Move reconciliation, persistence and policy logic out of
`apps/web/app/api/sync/dashboard/route.ts`.

Target structure:

```text
domains/sync/
├── sync-dashboard.ts
├── reconcile-jobs.ts
├── reconcile-applications.ts
├── conflict-policy.ts
└── sync-repository.ts
```

## Phase 7 — extension decomposition

Split extension autofill into:

```text
apps/extension/lib/autofill/
├── field-detection.ts
├── field-classification.ts
├── value-mapping.ts
├── safe-fill-policy.ts
├── dom-adapter.ts
├── platform-adapters/
└── index.ts
```

Keep the content-script entry point thin:

```text
Detect page
    ↓
Select adapter
    ↓
Map confirmed evidence
    ↓
Apply safe-fill policy
    ↓
Present review
```

No platform adapter should independently bypass the safe-fill policy.

## Non-negotiable migration rules

- No full rewrite.
- No folder-only reorganization without clearer boundaries.
- Preserve public exports during migration.
- One domain extraction per change set.
- Tests must pass before and after every extraction.
- No changes to EU Fit conclusions without explicit product approval.
- No weakening of unsupported-claim controls.
- No silent submission behavior.
- No mixing refactoring with unrelated feature development.
- Maintain rollback-friendly commits.

## Completion criteria

The decomposition is successful when:

- EU Fit rules run without React, Next.js or provider dependencies.
- Evidence has one canonical structure.
- Every generated material claim can be traced to evidence.
- Application preparation follows a typed, testable workflow.
- Dashboard components mostly render state and dispatch use cases.
- API routes contain little business logic.
- Platform integrations implement typed domain interfaces.
- Core modules have named owners.
- Tests are organized by unit, contract, integration and E2E scope.
- Large-file concentration is materially reduced without changing behavior.

## Current implementation status

See [roadmap-execution-status.md](roadmap-execution-status.md) for the living
record of what is implemented versus what remains. As of this plan's adoption,
Phases 0–3 have working code and passing tests (EU Fit decision policy,
canonical evidence model, application-preparation policy and use case, typed
platform adapters). Phases 4–7 remain open: finishing the `DashboardExperience.tsx`
capability-by-capability split, extension autofill decomposition, dashboard
sync route simplification, and the `globals.css` split.
