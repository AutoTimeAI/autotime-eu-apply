# Release Readiness Documentation Audit — 2026-09-19

## Verdict

The repository has more than enough release, validation, verification, UAT,
security, smoke, and checklist documentation. The material is not yet complete
as a single auditable release record because it is duplicated, several status
documents are stale, and the newest mandatory release gate still contains open
or partially evidenced items.

This audit changes no test status. “Document exists” is not treated as “test
passed,” and code inspection or unit coverage is not relabelled as deployed
end-to-end evidence.

Current defensible position:

- **Engineering deployment readiness:** strong; a production deployment and
  post-deploy smoke are recorded for commit `88b8eb4453062315d2897445fbf5a855f4f25071`.
- **Controlled private beta:** GO WITH LIMITATIONS, pending explicit founder
  acceptance/sign-off of the limitations.
- **Unqualified release GO:** not evidenced because mandatory gates remain open.
- **Public launch:** not ready; external/manual validation remains incomplete.

## Documents that should be treated as authoritative

| Purpose | Canonical document | Required action |
|---|---|---|
| Current v1.0.1 mandatory gate | `docs/reports/release-gate-checklist-v1.0.1-2026-09-19.md` | Update after every remaining gate is closed; release owner must sign. |
| Detailed v1.0.1 evidence | `docs/reports/release-assurance-pack-v1.0.1-evidence-2026-09-19.md` | Correct stale intermediate claims and link final evidence. |
| Public-launch gate | `docs/reference/testing/public-launch-gate-checklist.md` | Refresh from August evidence; keep public-launch-only gates separate from private-beta gates. |
| Operational procedure | `docs/reference/claude-code-pre-release-runbook.md` and `.github/workflows/production-deploy.yml` | Keep as procedure, not evidence that a particular release passed. |
| UAT evidence | `docs/reference/qa/UAT-Run-Log-v1.md` and `docs/reference/testing/uat-signoff-summary.md` | Populate only after real participant sessions. |
| Sentry live evidence | `docs/reference/testing/sentry-live-dashboard-verification.md` | Populate only from an actual controlled production event and dashboard inspection. |

All older release-run, founder-validation, QA, readiness, and duplicated status
documents should be labelled `historical`, `template`, or `superseded`, with a
link to the canonical documents above. They should not independently assert the
current release decision.

## Mandatory v1.0.1 gaps still open

| Gate | Honest current status | What must happen | Evidence to record |
|---|---|---|---|
| Supabase backup/PITR | Not verified | Human checks the production Supabase backup page and records retention/PITR state; ideally perform a restore rehearsal into a non-production project. | Date, operator, configuration summary, backup identifier, restore result and duration. Do not include secrets. |
| Accessibility critical path | Not run for this release cycle | Run automated axe coverage on login/invite, dashboard, profile, job analysis, application gate, country workspace, pricing and sign-out; perform keyboard/focus and contrast checks for the critical path. | Exact SHA, browser/viewports, commands, serious/critical issue count, accepted exceptions and fixes. |
| Incident ownership | Partial | Name the release owner, incident lead and rollback operator; define notification route and response window. | Names/roles, date accepted, contact channel reference, escalation rule. |
| Rollback rehearsal | Not run | Rehearse Vercel rollback using a safe non-production deployment or a controlled production exercise approved by the owner. | Starting deployment, rollback target, commands/workflow, smoke result, recovery time and operator. |
| Privacy/beta terms/support readiness | Founder confirmation absent | Founder confirms the actual privacy notice shown to users, beta acknowledgement/limitations, support channel and response expectations. | Signed/date-stamped checklist with URLs or screenshots. |
| Release-owner approval | Pending | Founder reviews the remaining limitations and records GO, NO-GO or risk acceptance. | Name, decision, signature/date and exact release SHA/deployment ID. |

Until these rows are closed or explicitly risk-accepted by the authorised
release owner, the structured gate's own rule does not support a clean GO.

## Evidence claims that need correction

1. The v1.0.1 gate says all ten critical-path tests were exercised live, but:
   - E2E-06 is documented as structural source/RLS inspection, not a two-user
     deployed access test.
   - E2E-09 is documented as an existing unit test, not a deployed provider
     fallback test.
   These may be acceptable forms of evidence, but must not be labelled “10/10
   live E2E.” Use `Pass — structural`, `Pass — unit`, or run the real tests.

2. The assurance narrative contains intermediate counts and recommendations
   from earlier in the same session (for example, four directly re-verified
   critical-path cases and six outstanding), while later appended sections
   claim closure. Add a prominent final-state summary and mark the earlier
   sections as historical checkpoints to prevent contradictory readings.

3. The v1.0.1 checklist records deployed SHA `88b8eb44`, while repository HEAD
   is now later because documentation commits followed the deployment. This is
   valid only if the release artefact is deliberately `88b8eb44`. State both
   `release artefact SHA` and `documentation HEAD` explicitly.

4. Claims such as “zero Critical/High defects” need a dated defect-register
   query or explicit scoped statement. Passing tests alone cannot prove no open
   defects exist.

5. “Environment values and secrets verified” currently combines presence,
   successful use, and broad key inventory. Split it into required-variable
   presence, runtime functional verification, and build-only observability
   credentials. Sentry source-map upload was previously observed without its
   auth token and remains a distinct evidence item.

## Public-launch work not started or not completed

These are not necessarily blockers for a controlled private beta, but they do
block the repository's own public-launch definition:

| Area | Repository evidence | Status |
|---|---|---|
| Founder-led UAT with 3–5 users | UAT log remains Draft/Not started; signoff summary says pending. | Not started/completed |
| Outcome usefulness and trust | Outcome summary says real-user evidence is required. | Not completed |
| Sentry live production event inspection | Live-dashboard checklist remains Pending Manual Evidence. | Not completed |
| Sentry alert configuration | Sentry report says dashboard alerts are not verified in the repository. | Not verified |
| ICO registration/reference | Public-launch and readiness tables say pending. | Not completed |
| Chrome Web Store manual pre-publication pass | Code/build evidence exists; real installed-extension/manual publication pass remains separate. | Partially complete |
| Real alert/welcome email delivery | Send path exists; actual delivery/domain evidence is not recorded in the canonical public-launch gate. | Not completed |
| Stripe end-to-end transaction | Unit/webhook and pricing work improved, but the August public gate still says no real/test-mode full transaction. Reconcile with any newer evidence or run it. | Status conflict; needs proof |
| Feedback loop with real users | Templates exist; participant evidence does not. | Ready to start, not completed |

## Stale or duplicated documents to touch

Do not delete evidence history. Add a visible status banner and canonical link
to these groups:

- `docs/reference/testing/release-gate-checklist.md` — May private-beta snapshot.
- `docs/reference/testing/readiness-status-table.md` — August snapshot.
- `docs/reference/testing/public-launch-gate-checklist.md` — August status and
  potentially stale Stripe/extension claims.
- `docs/reference/testing/private-beta-v1-readiness-report.md`,
  `final-qa-report.md`, `qa-verification-report.md`,
  `e2e-run-verification-report.md`, and
  `private-beta-v1-flaw-closure-report.md` — overlapping readiness summaries.
- `docs/reports/founder-validation-runs/*` — many generated reports contain
  `Pending` or `Not run`; label abandoned/incomplete runs so they cannot be
  mistaken for current evidence.
- `docs/reports/release-runs/*` — automated reports correctly leave manual
  checks pending, but need linkage to the manual evidence that eventually
  closed them, or an explicit “automated-only” label.
- Sentry documents dated May — retain the procedure but separate it from a
  dated, per-release evidence record.

## Documentation that is actually missing

Creating more broad checklists would increase ambiguity. Only three focused
documents are missing:

1. **Release evidence index** — one short canonical page mapping release
   version, artefact SHA, deployment ID, mandatory gate, latest evidence file,
   owner and status. This prevents old reports from becoming accidental truth.
2. **External/manual sign-off record** — founder-owned record for backup/PITR,
   privacy/beta terms/support, ICO, Chrome publication, email, Stripe, Sentry,
   UAT and outcome validation. It should reference evidence rather than repeat
   procedures.
3. **Incident and rollback exercise record** — named owners plus a dated
   rehearsal result and recovery time.

The existing UAT, Sentry, accessibility tooling, operations runbook, deployment
workflow, and public-launch checklist should be completed or updated rather
than replaced by new documents.

## Recommended completion order

1. Correct the v1.0.1 gate's live-E2E wording and distinguish artefact SHA from
   documentation HEAD.
2. Create the release evidence index and mark duplicate status documents as
   historical/superseded.
3. Run and record the accessibility critical-path pass.
4. Confirm backup/PITR and perform a restore rehearsal if feasible.
5. Name incident/release/rollback owners and rehearse rollback.
6. Obtain founder privacy/beta-terms/support confirmation and sign the release
   decision.
7. Before public launch, complete Sentry live verification, email delivery,
   Stripe end-to-end transaction, Chrome manual pass, ICO registration, UAT and
   outcome validation.

## Completion rule

A gate is complete only when the repository contains all of the following:

- exact artefact SHA and environment;
- dated command or manual procedure;
- result and relevant output/evidence reference;
- reviewer/operator;
- defect or exception disposition;
- owner approval where the gate is business, compliance or risk acceptance.

Absent any of these, use `Not run`, `Not verified`, `Partial`, or `Open`; do not
infer `Pass` from the existence of code, a template, or an older release run.
