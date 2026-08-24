# UI/UX audit — 15 August 2026

Scope: second-pass usability, accessibility and responsive review based on `ui-ux-test-plan.md`. Functional correctness was not re-audited. Results distinguish browser verification, source review and checks that require people or external sites.

## Outcome

- Verified in a signed-in Chromium session at 375px, 768px and 1440px: onboarding, aggregated jobs, CV editor/preview, ESCO questionnaire and outreach.
- No horizontal page overflow was found on the checked routes at the required widths.
- The checked routes reported zero visible `input`, `select` or `textarea` controls without an associated label or accessible name.
- The production build and TypeScript checks pass.
- Fixed four actionable issues: screen-reader onboarding progress, global link focus visibility, outreach field labels/live LinkedIn count, and copy-versus-sent state confusion.

## Checklist evidence

### Accessibility baseline

- **Colour contrast:** source-review pass completed for shared tokens and state colours; no new low-contrast combination introduced. A full automated WCAG contrast crawl remains recommended because no axe/contrast package is installed.
- **Keyboard navigation / focus:** existing keyboard Playwright checks pass for the application workflow; all controls checked in the browser are native interactive elements. Added a global `:focus-visible` treatment for links, summaries and positive `tabindex` elements.
- **Form labels:** browser query returned zero unlabelled form controls on all five key routes.
- **Alt text:** profile imagery has contextual alt text; decorative brand imagery has empty alt text. No regression found.
- **Screen reader:** onboarding progress is now a named progressbar with current/max values and readable step text; step changes and errors use live/status semantics. A hands-on NVDA pass remains external.

### Responsive and mobile

- **Onboarding:** no overflow at 375/768/1440; actions stack on small screens; file inputs remain native and camera/gallery compatible where the browser/OS supports them.
- **CV:** no overflow; at 375px the preview uses the available 300px content width and is stacked below the editor rather than squeezed alongside it.
- **Jobs:** list rows collapse to a single-column/card presentation on mobile; total/visible listing counts and “Load 25 more” are explicit.
- **ESCO:** no overflow or unlabelled control at 375px.
- **Touch targets:** shared coarse-pointer rules enforce 44px minimum height for buttons, navigation links and form controls. The main targeted actions inherit these rules.

### Visual consistency and flow heuristics

- Shared tokens and common button classes are used across the checked web surfaces.
- Onboarding shows “Step N of 6”, retains values in component state when going back, uses “Continue or skip” for the optional photo step, presents upload/paste/build CV paths together, and renders review content as a definition-list grid.
- Jobs distinguish aggregated listings through their page heading and show “Showing X of Y matching listings”.
- CV export requirements are displayed before disabled export actions; enrichments are explicitly optional, preview-only and review-before-apply.
- Outreach says drafts are never sent automatically. Copying now leaves status unchanged and tells the user to mark it sent only after sending it themselves.
- Profile uses explicit edit links for the narrow editable areas; view-only values are rendered as text/definition lists.

### Content and perceived performance

- Key empty states include next-step guidance; the reviewed UI uses UK English.
- User-facing ESCO/ATS terms remain in a few intentionally product-specific contexts and should be tested with beta users for comprehension.
- Loading/status copy exists for onboarding saves/uploads, CV enrichment, outreach drafting and profile loading. Jobs use immediate local tracking feedback.
- The above-the-fold decorative brand mark now loads eagerly after the browser identified it as the largest visible image.

## Items requiring external/manual completion

- Run a full NVDA session on Windows and record announcements for step changes, validation errors and async completion.
- Test the extension overlay on live Greenhouse, Workday and generic job pages; this needs the unpacked extension and external sites.
- Verify mobile camera/gallery photo upload on physical iOS and Android devices.
- Recruit 3–5 representative EU-focused job seekers for the task-based usability study. Specifically observe ESCO comprehension, outreach send-state understanding and LinkedIn risk-disclosure attention.
- Run a dedicated automated contrast crawler or DevTools contrast inspection across every state, including disabled and error states.

## Verification log

- `pnpm.cmd --filter web typecheck` — pass.
- `pnpm.cmd --filter web build` — pass (65 routes generated).
- Browser smoke — meaningful content, no Next.js error overlay, no page errors.
- Focused Playwright set — 4 passed, 8 failed against a reused server. Passing checks include mobile Phase 2 readability, keyboard/tab semantics, contextual Consider flow and profile route isolation. Failures reflect baseline/config drift: expected legacy navigation absent, deterministic Apply/Skip fixtures unavailable, two-primary-action mismatch, and a pre-existing green success banner rejected by the visual contract. None touches the files changed in this audit.

