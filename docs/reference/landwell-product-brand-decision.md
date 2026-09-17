# LandWell Product Brand Decision

**Decision date:** 16 September 2026  
**Decision owner:** Founder  
**Product brand:** **LandWell**  
**Domain:** **Undecided**  
**Legal company:** AutoTime AI Ltd.  
**Implementation status:** Brand chosen; public rebrand not yet implemented

## Decision

The founder has chosen **LandWell** as the product's customer-facing brand.
This supersedes `Wayfound` as the preferred name. It does not rename AutoTime AI
Ltd., approve a particular domain, or authorise a production cutover.

The brand and domain are separate decisions:

| Item | Decision |
|---|---|
| Product name | **LandWell** — chosen |
| Capitalisation | **LandWell** in product copy; test the wordmark before finalising visual treatment |
| Legal operator | AutoTime AI Ltd. — unchanged |
| Main domain | Open; do not assume `landwell.tech` or any other domain is final |
| Current production identity | AutoTime EU Apply / EU Apply until a controlled transition |
| Geographic scope | Planned 32 European markets with clearly tiered coverage; `EU` is not part of the product brand |

## Why LandWell

`Land` communicates the desired career outcome. `Well` distinguishes quality
and considered choices from high-volume auto-application. Together they support
the product's central idea: use evidence to decide which opportunity deserves
effort, then prepare properly.

LandWell is a brand, not a promise that every user will obtain a job. Public
copy must not imply guaranteed hiring, more interviews, permit eligibility or
equal mobility depth across all markets without evidence.

### Working positioning

> **LandWell**  
> Evidence-backed decisions for cross-border technology careers.

Alternative shorter customer-facing line to test:

> Know which European tech opportunities are worth your time—and why.

Legal attribution where appropriate:

> LandWell is a product of AutoTime AI Ltd.

## What is decided versus still to validate

The founder's product-name preference is decisive for product direction. It
does not replace legal clearance or external-user evidence. The following are
still required before major public investment in the brand:

1. UKIPO and EUIPO trademark searches, including similar marks and relevant
   software, employment, education, mobility and advisory classes; seek
   qualified advice for material ambiguity.
2. Companies, app-store, search and social-handle collision review.
3. Pronunciation, spelling, comprehension and recall with target users.
4. Domain selection and acquisition under a separate decision record.
5. Review of customer-facing claims and legal company attribution.

A preliminary web screen found unrelated exact-name uses in property, health
and key-management software. That is **not** legal clearance. It did not reveal
the same obvious direct job-search-name saturation seen with `Landed`, but
formal searches remain necessary.

## Domain decision rule

Do not alter the brand spelling to fit a domain. Choose the domain around the
product name and actual market positioning.

Evaluate candidates for memorability, spelling, renewal cost, registrar
security, potential confusion, geographic accuracy and future expansion.
The 32-market strategy includes five non-EU countries, so an `EU` suffix can
create avoidable scope confusion even if used only in the URL.

`landwelleu.com` is registered according to the `.com` registry record checked
on 16 September 2026; it is not available for ordinary registration. Domain
registration or availability never establishes trademark rights. No domain is
approved by this document.

## Sector-scope decision (16 September 2026, addendum)

The founder has decided the product will **deliberately focus on technology
professions for the current phase**, rather than positioning as multi-sector
from the outset. Healthcare and other professions remain a genuine future
direction, not a current commitment. This is a considered choice, not a
default left over from how the code happens to be built.

This decision was checked against a direct codebase audit before being
recorded here, to confirm committing to tech now does not quietly foreclose
expansion later:

- **Genuinely sector-agnostic, no cost to keeping this decision reversible**:
  the occupation-module contract (`packages/shared/src/occupations/module-contract.ts`),
  the live ESCO occupation API client, the ATS/job-board integrations
  (Greenhouse, Lever, Adzuna, etc.), and the country-pack occupation-category
  lists (which already include finance, business, science and engineering
  alongside technology) are all built to support any profession, not just tech.
- **Hardcoded as data, in a reusable shape**: the only implemented occupation
  module (`packages/shared/src/occupations/tech-fintech.ts`) and its bundled
  ESCO fixture rows are tech-specific content, but follow a pattern designed
  to be copied for a future sector — adding a module later is additive, not a
  rewrite.
- **Hardcoded in logic, the one real generalisation cost**: `role-pathways.ts`'s
  "specialised gates" and preference-scoring function key directly to literal
  tech category names (`cybersecurity`, `cloud-infrastructure`,
  `ai-data-science`, keyword matches like `"software"`/`"web"`/`"ai"`) rather
  than a generic per-sector lookup. Expanding to a second sector later will
  require generalising this specific function, not just adding a module. Not
  urgent given the current tech-focused decision, but recorded here so it
  isn't rediscovered as a surprise when expansion is eventually considered.

Because this is a deliberate, evidence-checked scope decision rather than an
accident, a domain that reads as technology-specific (e.g. `landwell.tech`) is
now a truthful signal rather than a premature lock-in — it should be evaluated
on that basis under the domain decision rule above, not ruled out purely for
matching the current phase's positioning.

This addendum settles *that* the product stays tech-focused for now. It does
**not** settle *which* tech role family or country corridor to validate first
— see `docs/reference/landwell-tech-system-validation-plan.md` §3, which
requires real candidate interviews before that choice is made.

## Implementation boundaries

Once clearance and a domain decision are recorded, change customer-facing
identity through a staged rollout. Do not globally replace strings.

Keep these unchanged unless separately authorised:

- AutoTime AI Ltd. as the legal entity;
- repository and local directory names;
- database schemas, migrations, historical decision records and audit logs;
- API contracts, environment-variable keys and analytics event identities;
- existing production domain until redirects, auth callbacks, email, payments
  and extension origins have been verified.

The first code step should be an exact occurrence inventory, classifying every
use of `AutoTime EU Apply`, `EU Apply`, `AutoTime`, `Wayfound` and `LandWell` as
public product branding, legal entity, internal identifier, infrastructure,
test fixture or historical evidence. Then introduce one canonical brand
configuration for public UI and metadata before editing individual surfaces.

## Claude Code Plan Mode brief

> Read `docs/reference/landwell-product-brand-decision.md` as the current
> founder decision. LandWell is the selected product brand; the domain is
> undecided; AutoTime AI Ltd. remains the legal company. Work in Plan Mode
> only. Do not edit code, purchase a domain, change external services, commit,
> push or deploy. Inspect the live repository and produce: (1) a complete
> brand occurrence inventory; (2) a minimum-risk customer-facing rebrand
> architecture with exact files and tests; (3) a separate domain decision and
> migration checklist; (4) legal, user and operational validation gates;
> (5) an ordered rollout and rollback plan. Do not use global search-and-
> replace. Report any conflict between this decision and the codebase.

## Immediate next step

Continue operating the product under its current production identity while
performing LandWell clearance and user testing. Select the primary domain
separately. Only then approve the public-brand implementation and cutover.
