# Production migration Phase 1: foundations and Home

## Decision

Founder visual review approved on 3 August 2026 using the cache-busting evidence set in `screenshots/phase-1-home/corrected-final-apps-v3/`.

## Scope

Phase 1 changes only the authenticated dashboard shell, shared visual foundations used by that shell, and Home composition. It does not change business priority logic, routes, APIs, authentication contracts, storage, migrations, admin behaviour, or Phase 2 screens.

## Production implementation

- `apps/web/app/dashboard/layout.tsx`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/dashboard/phase-1-foundations.css`
- `apps/web/app/dashboard/phase-1-brand.css`
- `apps/web/app/dashboard/phase-1-home-states.css`
- `apps/web/app/dashboard/phase-1-shell-correction.css`
- `apps/web/app/dashboard/phase-1-system-states.css`
- `apps/web/app/dashboard/phase-1-touch-targets.css`
- `apps/web/app/globals.css` (shared button shadow token only)
- `apps/web/components/HomeExperience.tsx`
- `apps/web/components/UserNav.tsx`
- `apps/web/next.config.ts` (development indicator disabled)

## Approved visual result

- Desktop uses a compact sidebar and a 66.98px authenticated header; the 1024px header also passes the 72px maximum.
- Mobile uses Home, Jobs, Apps, Interviews, and More in a fixed bottom navigation.
- `Apps` is the compact visual label; its accessible name remains `Applications`.
- The Apps/Interviews label gap is asserted at 12px or more.
- Account targets and primary actions remain at least 44px.
- The duplicated Home journey grid and full-width upgrade banner are absent.
- Home exposes one dominant next action with task-specific application or interview context.
- Loading and unavailable states retain structure, safe copy, navigation, and deterministic test fixtures.
- The rendered Phase 1 states contain no green-family colour, including gradients and shadows.
- Development badges, visible unfocused skip links, CTA underlines, obstruction, and horizontal overflow are rejected before capture.

## Automated state coverage

`tests/e2e/23-phase-1-home-states.spec.ts` covers all ten required states and the interview priority boundaries: just inside 72 hours, exactly 72 hours, just outside 72 hours, cancelled, completed-awaiting-outcome, and competing application/interview states.

`tests/e2e/24-phase-1-corrected-evidence.spec.ts` gates and captures the five founder-review states. The exact evidence mapping and hashes are in `docs/phase-1-home-screenshot-manifest.md`.

## Verification

Final closeout passed:

- focused five-state Chromium evidence suite;
- ten-state Home and 72-hour priority suite;
- Phase 3A readiness safeguards;
- Phase 3C interview safeguards;
- full unit suite;
- typecheck and lint;
- production build with non-production placeholder secrets;
- privacy checks;
- `git diff --check`.

## Remaining scope

Phase 2 has not started. Jobs, Applications, Interviews, Countries, Career Direction, Profile, Pricing, Admin, and authentication screens remain outside this migration phase.
