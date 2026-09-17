# Completion Audit and Engineering Handoff

**Audit date:** 10 September 2026  
**Audience:** founder, Claude Code, engineering, product, legal/compliance reviewers

## Executive determination

The requested **startup-level desk-research and product-foundation package** has been hardened into a
production-development and business-validation blueprint. It is not proof of legal correctness,
product-market fit, payment demand, production reliability or a durable moat. Those outcomes require
the external and production evidence listed below.

The central recommendation is stable across the package:

> Focus AutoTime on evidence-backed, vacancy-level cross-border application decisions. Validate
> Germany and the Netherlands first. Treat the evidence/replay/correction system—not generic AI,
> autofill or a visa checker—as the moat hypothesis.

## Requested deliverable audit

| Requested area                  | Authoritative artifact                        | Delivered evidence                                                     | Honest status                                                |
| ------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| 15–20 European markets          | `country-dossiers.md`, `market-readiness.csv` | 20 market dossiers with route facts, source status and blockers        | R1 desk research; zero production-ready                      |
| Reliable source base            | `source-ledger.csv`                           | 72 traceable source rows with dates, class, claims and gaps            | Structured; unresolved chains remain visible                 |
| Competitive/substitute analysis | `competitive-landscape.md`                    | Candidate tools, mobility operators, experts and free substitutes      | Public/vendor evidence; no mystery-shopping benchmark yet    |
| Moat analysis                   | `moat-defensibility-and-falsification.md`     | Compounding assets, threats, copy test and kill criteria               | Testable hypothesis, not proven advantage                    |
| Market-entry decision           | `market-prioritisation-model.md`              | Safety gates separated from opportunity bands                          | Portfolio decision; commercial inputs partly unknown         |
| Market/commercial analysis      | `market-and-commercial-model.md`              | Primary market signals, bottom-up equation and paid experiments        | No fabricated TAM or forecast; payment pending               |
| Regulatory boundaries           | `regulatory-boundaries.md`                    | Immigration-advice, AI, privacy, claims and discrimination issues      | Issue spotting; written counsel opinions pending             |
| Technical/data/governance spec  | `technical-and-governance-specification.md`   | Models, deterministic boundary, versioning, replay, SLOs and migration | Build-ready design intent; architecture review pending       |
| Ten moat capabilities           | Technical spec and implementation roadmap     | Each requested capability mapped into data/workflow controls           | Some foundations exist; live reachability/build work remains |
| User and business validation    | `validation-programme.md`                     | UAT, comprehension, reliance, behaviour, payment and expert protocols  | Protocol complete; execution external and pending            |
| Contradictions/unknowns         | `contradictions-and-unknowns.md`              | Material conflicts, risk, owner/action and release consequence         | Open items intentionally block unsafe claims                 |
| Claim confidence                | `confidence-and-claim-register.md`            | Claim status, evidence, falsifier and permitted wording                | Governed baseline; must update with observations             |
| Sequenced delivery              | `implementation-roadmap.md`                   | Evidence-gated phases, owners and exit evidence                        | Ready for implementation planning                            |

## What engineering can start now

Claude Code or another implementation agent should begin with the following bounded work:

1. Trace live user entry points to the existing decision implementations and document which code is
   reachable before adding another engine.
2. Establish one canonical decision contract and an adapter/migration plan for the second
   implementation.
3. Implement source revisions, atomic route-rule versions, immutable decision records and
   claim-to-evidence links behind internal flags.
4. Implement replay (`as_decided` and `as_current`), source-change triage, corrections and expert
   sign-off records.
5. Build Germany and Netherlands research-only rule packs with fixtures; do not expose supported
   verdicts until the release gates pass.
6. Build a precision-first employer/entity benchmark and preserve `unknown`/`ambiguous` outcomes.
7. Instrument comprehension, user action, correction, payment and delivery-cost events with consent
   and purpose limitation.
8. Add CI checks for orphan evidence, mutable decisions, expired sources, unsigned production rule
   versions and unsupported claims.

Engineering should cite the relevant package section in each issue or pull request. A schema or API
name may change during implementation; the invariants and acceptance evidence may not be silently
dropped.

## Work that must not be marked complete by Claude Code or any research agent

- Founder-led sessions with real target users.
- Evidence that users understand uncertainty and resist deliberately flawed recommendations.
- Observed behaviour or outcomes, including any “more interviews” claim.
- Real willingness-to-pay, refunds, repeat use, CAC and contribution margin.
- Written immigration/advice, privacy and AI-regulatory opinions.
- Named jurisdiction-expert sign-off on exact rule-pack hashes.
- Real Stripe checkout/webhook, Resend delivery, Sentry alert and extension-store verification.
- Production retention, deletion-cascade, restoration and incident drills.
- Production secrets and configuration.

These are external/production dependencies, not missing prose. Simulated tests help engineering but do
not substitute for them.

## Handoff acceptance checklist

Before implementation begins, the recipient should confirm in its own report:

- repository branch/commit and dirty-worktree state inspected;
- live decision entry points and duplicate implementations identified;
- proposed changes mapped to the technical invariants;
- existing user edits preserved;
- research-only versus production behaviour explicit;
- tests and rollback plan stated before migrations;
- no vendor claim treated as independent evidence;
- no country promoted above its recorded evidence level;
- no legal, outcome or Europe-wide coverage claim introduced.

## Founder decisions now required—but not required to read this package

The research recommends, and implementation should assume until changed:

- Germany–Netherlands as the first validation corridor;
- candidate-side pre-application decision quality as the product centre;
- information/evidence outputs with conservative abstention until advice boundaries are signed off;
- evidence integrity and replay ahead of broader career/outreach/interview features;
- no “more interviews,” “verified,” “eligible,” or “Europe covered” language without the relevant
  release evidence.

## Definition of the next completed tranche

The next tranche is complete only when the repository contains the canonical decision/evidence
foundation and Germany/Netherlands private-evaluation packs, and the evidence room contains real
user, payment, expert, operational and regulatory records. At that point the founder can make a
go/narrow/partner/stop decision using observed evidence rather than confidence in a report.
