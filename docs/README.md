# AutoTime EU Apply — documentation index

Single entry point into the product's system, journey, and QA documentation. Every
file below already exists elsewhere in this repo — nothing was moved — this page
just organizes and links to it by category so the whole documentation set is
reachable from one place.

Last consolidated: 2026-08-21.

## Product & system architecture

| Doc | Covers |
| --- | --- |
| [product-information-architecture.md](product-information-architecture.md) | Overall product IA |
| [product-design-system.md](product-design-system.md) | Authenticated design system |
| [product-status-terminology.md](product-status-terminology.md) | Status/terminology dictionary |
| [product-readiness-policy.md](product-readiness-policy.md) | Capability readiness policy |
| [product-security-protocols.md](product-security-protocols.md) | Security protocols |
| [product-sync-wiring.md](product-sync-wiring.md) | Sync wiring |
| [product-redesign-plan.md](product-redesign-plan.md) | Redesign delivery plan |
| [product-responsive-verification.md](product-responsive-verification.md) | Responsive verification |
| [product-ux-audit.md](product-ux-audit.md) | UX audit |
| [product-home-next-actions.md](product-home-next-actions.md) | Home next-action rules |
| [product-onboarding-workflow.md](product-onboarding-workflow.md) | Progressive onboarding workflow |
| [cloud-sync-production-spec.md](cloud-sync-production-spec.md) | Cloud sync production spec |
| [technical-debt.md](technical-debt.md) | Known technical debt |

## Feature modules & product journey

| Doc | Covers |
| --- | --- |
| [role-pathways.md](role-pathways.md) | Role pathways |
| [international-module.md](international-module.md) | International applicants module |
| [international-mobility-persistence.md](international-mobility-persistence.md) | Authenticated mobility persistence |
| [international-phase2-navigation-map.md](international-phase2-navigation-map.md) | Dashboard navigation map |
| [esco-phase-9-deployment.md](esco-phase-9-deployment.md) | ESCO data setup |
| [job-aggregation-compliance.md](job-aggregation-compliance.md) | Job aggregation & outreach compliance |
| [job-ingestion-deployment.md](job-ingestion-deployment.md) | Production job-ingestion deployment |
| [phase-1-home-migration-report.md](phase-1-home-migration-report.md) | Phase 1: foundations & Home |
| [phase-3b-core-workflow.md](phase-3b-core-workflow.md) | Phase 3B core workflow |
| [phase-3c-interview-workflow.md](phase-3c-interview-workflow.md) | Phase 3C: interview prep & outcomes |
| [v2-product-surface.md](v2-product-surface.md) | V2 product surface |
| [v2-completion-report.md](v2-completion-report.md) | V2 completion report |
| [mvp-spec-alignment.md](mvp-spec-alignment.md) | MVP spec alignment |
| [autotime-feature-spec-audit.md](autotime-feature-spec-audit.md) | Feature-spec implementation audit |
| [competitive-feature-audit-verified-2026-08-18.md](competitive-feature-audit-verified-2026-08-18.md) | Competitive feature audit (verified) |
| [remaining-gaps-reconciliation-2026-08-18.md](remaining-gaps-reconciliation-2026-08-18.md) | Remaining gaps — reconciliation |
| [strategic-synthesis-reconciliation-2026-08-18.md](strategic-synthesis-reconciliation-2026-08-18.md) | Strategic synthesis — repo reconciliation |
| [verify-feature-implementation.md](verify-feature-implementation.md) | Manual verification, phases 1–10 |

## QA strategy & living test matrices

| Doc | Covers |
| --- | --- |
| [quality-assurance.md](quality-assurance.md) | QA overview + pre-release validation log |
| [testing/qa-strategy.md](testing/qa-strategy.md) | Overall QA strategy |
| [qa/AutoTime-EU-Apply-QA-Documentation.xlsx](qa/AutoTime-EU-Apply-QA-Documentation.xlsx) | Full QA workbook — 123 test cases + 58 embedded screenshots across the user & product journey ([generator script](qa/generate-qa-documentation.mjs)) |
| [qa/MVP-Test-Matrix-v1.md](qa/MVP-Test-Matrix-v1.md) | MVP test matrix (manually tracked scenarios) |
| [qa/Bug-Log-v1.md](qa/Bug-Log-v1.md) | Bug log |
| [qa/UAT-Run-Log-v1.md](qa/UAT-Run-Log-v1.md) | UAT run log |
| [qa/Dashboard-Stability-Audit-v1.md](qa/Dashboard-Stability-Audit-v1.md) | Dashboard stability audit |
| [testing/automated-test-case-matrix.md](testing/automated-test-case-matrix.md) | Automated test case matrix |
| [testing/all-test-cases.csv](testing/all-test-cases.csv) / [.json](testing/all-test-cases.json) | All test cases, machine-readable |
| [testing/e2e-test-details.csv](testing/e2e-test-details.csv) / [.json](testing/e2e-test-details.json) | E2E test details, machine-readable |
| [testing/manual-test-checklist.md](testing/manual-test-checklist.md) | Manual test checklist |
| [testing/outcome-quality-test-matrix.md](testing/outcome-quality-test-matrix.md) | Outcome quality test matrix |
| [testing/outcome-validation-summary.md](testing/outcome-validation-summary.md) | Outcome validation summary |
| [testing/platform-coverage.md](testing/platform-coverage.md) | Platform coverage evidence |
| [testing/autotime-670-test-plan-alignment.md](testing/autotime-670-test-plan-alignment.md) | Test-plan alignment |
| [mvp-testing-automation.md](mvp-testing-automation.md) | MVP testing automation |
| [extension-smoke-test.md](extension-smoke-test.md) | Extension smoke test |
| [v2-smoke-test.md](v2-smoke-test.md) | V2 smoke test |

## QA & verification reports (point-in-time)

| Doc | Covers |
| --- | --- |
| [testing/final-qa-report.md](testing/final-qa-report.md) | Final QA report |
| [testing/qa-verification-report.md](testing/qa-verification-report.md) | QA verification report |
| [testing/core-e2e-and-smoke-report-2026-08-15.md](testing/core-e2e-and-smoke-report-2026-08-15.md) | Core E2E & deploy-smoke — 2026-08-15 |
| [testing/e2e-run-verification-report.md](testing/e2e-run-verification-report.md) | E2E run verification |
| [testing/sentry-test-report.md](testing/sentry-test-report.md) | Sentry test report |
| [testing/sentry-live-dashboard-verification.md](testing/sentry-live-dashboard-verification.md) | Sentry live dashboard verification |
| [testing/sentry-product-coverage-matrix.md](testing/sentry-product-coverage-matrix.md) | Sentry product coverage matrix |
| [testing/sentry-product-observability-report.md](testing/sentry-product-observability-report.md) | Sentry observability report |
| [beta-release-qa-2026-08-15.md](beta-release-qa-2026-08-15.md) | Beta release QA — 2026-08-15 |

## Beta / UAT program

| Doc | Covers |
| --- | --- |
| [testing/founder-led-uat-plan.md](testing/founder-led-uat-plan.md) | Founder-led UAT plan |
| [testing/uat-session-guide.md](testing/uat-session-guide.md) | UAT session guide |
| [testing/uat-feedback-log-template.md](testing/uat-feedback-log-template.md) | UAT feedback log template |
| [testing/uat-signoff-summary.md](testing/uat-signoff-summary.md) | UAT signoff summary |
| [testing/private-beta-feedback-questions.md](testing/private-beta-feedback-questions.md) | Private beta feedback questions |
| [testing/private-beta-v1-readiness-report.md](testing/private-beta-v1-readiness-report.md) | Private beta v1 readiness report |
| [testing/private-beta-v1-flaw-closure-report.md](testing/private-beta-v1-flaw-closure-report.md) | Private beta v1 flaw closure report |
| [testing/private-beta-v1-next-session-handoff.md](testing/private-beta-v1-next-session-handoff.md) | Private beta v1 handoff |
| [testing/early-user-beta-onboarding-checklist.md](testing/early-user-beta-onboarding-checklist.md) | Early-user beta onboarding checklist |

## Release readiness & launch gates

| Doc | Covers |
| --- | --- |
| [release-readiness.md](release-readiness.md) | Release readiness |
| [market-ready-mvp-procedure.md](market-ready-mvp-procedure.md) | Market-ready MVP procedure |
| [founder-validation-report.md](founder-validation-report.md) | Founder validation report |
| [founder-first-realtime-testing-guide.md](founder-first-realtime-testing-guide.md) ([.docx](Founder-First-Realtime-Testing-Guide.docx)) | Founder-first real-time testing guide |
| [testing/readiness-status-table.md](testing/readiness-status-table.md) | Readiness status table |
| [testing/release-gate-checklist.md](testing/release-gate-checklist.md) | Release gate checklist |
| [testing/public-launch-gate-checklist.md](testing/public-launch-gate-checklist.md) | Public launch gate checklist |

## Operations & environment

| Doc | Covers |
| --- | --- |
| [admin-operations.md](admin-operations.md) | Admin operations |
| [admin-owner-bootstrap.md](admin-owner-bootstrap.md) | Owner bootstrap |
| [operations-runbook.md](operations-runbook.md) | Operations runbook |
| [environment-operations.md](environment-operations.md) | Environment operations |
| [environment-strategy.md](environment-strategy.md) | Environment strategy |
| [staging-seed-data.md](staging-seed-data.md) | Staging seed data |
| [extension-connection-observability.md](extension-connection-observability.md) | Extension connection observability |
| [qa-test-account.md](qa-test-account.md) | QA test account bootstrap mechanism |

## Demo & walkthrough

| Doc | Covers |
| --- | --- |
| [first-time-user-demo-video.md](first-time-user-demo-video.md) | First-time user demo video |
| [demo-video/](demo-video/) | First-user demo (`autotime-first-user-demo.mp4` + viewer page) |
| `apps/web/public/demo/autotime-walkthrough-2min-voiced.mp4` | Dashboard Home product walkthrough (added 2026-08-21) |

## Dated run archives

These directories hold one file per historical run rather than living documents —
browse the directory for the run you need rather than looking for individual links here:

| Directory | Contents |
| --- | --- |
| [release-runs/](release-runs/) | 28 dated release-verification run logs |
| [founder-validation-runs/](founder-validation-runs/) | 9 dated founder validation sessions |
| [automation-runs/](automation-runs/) | 19 dated automation/smoke run logs (plus `python-smoke-*` sub-runs) |
| [qa/Test-Evidence/](qa/Test-Evidence/) | Ad hoc QA evidence attachments |

## Related, outside `docs/`

- [../screenshots/](../screenshots/) — screenshot evidence referenced by QA/release docs, organized by phase.
- [../.github/workflows/](../.github/workflows/) — CI: PR checks, nightly/weekly scheduled smoke, security scans, and manual-dispatch-only diagnostics (e.g. `verify-ai-billing-fix.yml`).
