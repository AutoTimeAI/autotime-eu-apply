# User-content injection audit — 15 August 2026

## Outcome

PASS after hardening. No executable HTML or SQL injection path was found. User and external text is rendered through React text nodes, textareas, plain-text downloads, DOCX text nodes, or explicitly escaped email/extension HTML. Backend bounds were added where nested CV and outreach payloads had been unbounded.

## Surface results

| Surface | Result | Evidence |
| --- | --- | --- |
| CV builder and PDF print | Pass | `CVRenderer.tsx` uses React children and contains no raw-HTML API. Script, image-handler, Markdown/HTML, and SQL-meta payloads therefore remain literal text in the printable DOM. The print/save-PDF path prints that same DOM. |
| Cover letter | Pass after hardening | Display/edit uses a controlled textarea and export is `text/plain`. Creation/update already capped content; nested source CV fields and arrays now have server-side bounds. |
| Outreach | Pass after hardening | Drafts render in controlled inputs/textareas. Create and update APIs now cap every text/list field, including subject at 500 and body at 20,000 characters. Supabase queries bind values and scope reads/writes to `user_id`. |
| ESCO questionnaire | Pass | Answer is capped at 10,000 characters, stored via Supabase bindings, and echoed through React. Candidate lookup uses the Supabase query builder rather than concatenated SQL. |
| Profile | Pass after defence-in-depth change | Profile fields render through React. The API accepts only `http:`/`https:` professional URLs and the view now revalidates stored/legacy URLs before creating links, rejecting `javascript:` and `data:` schemes. Profile text fields have backend limits. |
| Alert email | Pass | Name, title, company, missing-skill labels, and link values are passed through `escapeHtml` before HTML interpolation. |

Payload coverage includes `<script>alert('xss')</script>`, `<img src=x onerror=alert('xss')>`, `javascript:`/`data:` URLs, 10,001-character text, 101-item arrays, Markdown/HTML-like text, and `'; DROP TABLE profiles; --`.

## Raw HTML inventory

- No `dangerouslySetInnerHTML` exists in application source.
- `apps/extension/lib/match-overlay.ts` uses shadow-root `innerHTML` for fixed extension markup. Dynamic labels and missing-skill strings pass through `escapeHtml`; match counts are numeric API fields. No raw user text is interpolated.
- `apps/extension/contents/autofill.ts` assigns fixed widget markup to a shadow root. Its job-page and status values pass through the local `escapeHtml` helper or safe list renderer.
- `supabase/functions/sync-job-alerts/index.ts` builds email HTML strings; every external/profile text insertion is escaped.

## Database isolation and SQL injection

Application queries use the Supabase query builder/RPC parameter objects; no user text is concatenated into SQL. Questionnaire `ilike` patterns are passed as bound client values. RLS policies scope profiles, outreach messages, questionnaire answers, and skill profiles to `auth.uid() = user_id`. API routes using the service client independently require an authenticated identity and add `.eq("user_id", user.id)` on reads/updates. An injection payload from User A therefore remains data and does not broaden access to User B.

## Bounds added

- CV contact/title/date/skill values: 500 characters each.
- CV summary and individual bullets: 5,000 characters each.
- CV experience, education, bullet, and skill arrays: 100 items.
- Outreach job description: 50,000; summary: 5,000; generated/edited body: 20,000; subject: 500; names/roles: 200; strengths: 100 items of 500.

The onboarding source CV retains its existing 100,000-character server cap. ESCO answers retain their existing 10,000-character cap. Cover-letter edits retain their existing 20,000-character cap.

## Automated verification

- `pnpm.cmd test:web:content-security`: PASS.
- `pnpm.cmd --filter web typecheck`: PASS.
- `git diff --check`: PASS.

The regression test is included in `test:unit`. It verifies HTML escaping, dangerous URL rejection, CV size/list bounds, email escape coverage, outreach edit bounds, and absence of raw HTML in the CV renderer.

## Manual gates still open

The owner-account checks in the supplied runbook remain manual and are not marked complete: unpacked extension testing in the owner's Chrome profile, delivery/rendering to a real inbox, and Stripe test-account checkout/webhook verification. No email, payment, or third-party action was initiated during this audit.
