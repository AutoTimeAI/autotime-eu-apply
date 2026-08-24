# AutoTime authenticated design system

## Principles

Calm, evidence-led, compact and trustworthy. Interface hierarchy should come
from typography, spacing and grouping rather than gradients, nested cards or
decorative charts.

## Foundation tokens

`globals.css` defines semantic surfaces, text, borders and status colours,
plus a 4/8/12/16/20/24/32 spacing scale, 6/10/14 radii, shared content widths,
focus ring and restrained elevation.

Use:

- `--ink` for primary text;
- `--text` for body copy;
- `--muted` only for supporting copy;
- `--accent` for the primary action and active navigation;
- semantic status tokens for evidence and decisions;
- `--reading-width` for explanatory content;
- `--content-width` for application workspaces.

## Shared primitives

`components/product-ui.tsx` provides:

- `ProductPageHeader`;
- `ProductSectionHeader`;
- `ProductStatusBadge`;
- `ProductEmptyState`;
- `ProductEvidencePanel`.

New workflow pages must use these primitives before introducing a new panel,
status badge or empty-state pattern.

## Interaction rules

- One filled primary action per working region.
- Secondary actions use the existing secondary treatment.
- Touch targets are at least 44px on coarse pointers.
- Visible focus is required; focus may not rely on colour alone.
- Generated results use a live status announcement.
- Sources and scoring detail use progressive disclosure.
- Reduced-motion preferences remain authoritative.

## Content rules

Use concise UK English and user-facing actions: Add a job, Analyse job, Prepare
application, Review application, Mark as applied, Prepare for interview.
Avoid provider/model/schema language in normal product copy.
