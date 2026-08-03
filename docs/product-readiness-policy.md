# Product capability readiness policy

Phase 3A replaces the overall 90% execution gate with typed, feature-specific
readiness in `apps/web/lib/capability-readiness.ts`.

Every evaluation separates required information from recommended improvements
and returns `ready`, `ready_with_limitations` or `needs_information`.
Recommended information never blocks an action. Overall profile readiness is a
guidance indicator only.

| Capability          | Required information                                                           |
| ------------------- | ------------------------------------------------------------------------------ |
| View Home           | Authenticated user                                                             |
| Discover pathways   | Credible experience, education or project evidence; basic preferences          |
| Analyse job         | Job description; candidate evidence; target or vacancy country                 |
| Assess mobility     | Target country; structured work-authorisation or sponsorship facts             |
| Prepare application | Selected job; candidate evidence; explicit confirmation of supporting evidence |
| Use autofill        | Verification of every field required by the current form                       |
| Approve answers     | Generated answer; supporting evidence; explicit user review                    |
| Manage tracking     | Existing selected user-owned job                                               |
| Prepare interview   | Selected job and candidate evidence, followed by existing input guardrails     |

Authentication, user isolation, governed mobility conclusions, unsupported
claim prevention and explicit application review remain hard boundaries.

## Former gate disposition

- Removed: sidebar redirects, disabled dashboard sections and action rejection
  based only on an overall percentage.
- Replaced: job, application, tracking and interview handlers now call their
  own typed capability policy.
- Retained: the percentage as qualitative guidance, authentication, evidence
  guardrails, application confirmation and Proof Library rules.
