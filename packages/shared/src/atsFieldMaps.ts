// Best-known CSS selectors for the standard profile fields (first name,
// last name, email, phone) on each ATS's own hosted application form,
// keyed by the same atsKey used in platform-coverage.ts / ats-detector.ts.
//
// STATUS as of the selector-presence live run
// (scripts/verify-ats-field-maps-live.mjs, 2026-09-02): Greenhouse and
// Lever's selectors are live-confirmed correct. Recruitee's were
// live-confirmed WRONG (see the `recruitee` entry below - the original
// guess assumed separate bracket-notation first/last fields; the real form
// is one dot-notation `candidate.name` field) and have been corrected from
// real DOM evidence. Ashby and SmartRecruiters are deliberately absent from
// ATS_FIELD_MAPS - see the comment directly above it for why. Personio
// remains untested (no fixture set).
//
// A second, deeper pass (2026-09-02) went beyond selector-presence: built
// the real extension, loaded it in a real browser via Playwright, seeded a
// real profile, and drove the actual shipped fillProfileFieldsViaAtsMap
// code path (not a standalone re-implementation) against 2 different real
// employers per platform, checking real post-fill DOM values.
//   - Greenhouse: 2/2 employers (PlanetScale, Cloudflare) filled all 4
//     fields correctly. Promoted to `autofill: "verified"` in
//     platform-coverage.ts on this evidence.
//   - Lever: 1/2 at first. ERG filled correctly; Agate Software's base
//     posting URL had zero <input> elements because Lever's application
//     form only exists at the sibling `/apply` path (ERG's fixture already
//     pointed there; Agate Software's didn't). Closed via
//     getAtsApplyNavigationUrl() below plus navigate-then-reinject
//     orchestration in sidepanel/main.tsx's handleAutofillCurrentPage -
//     see that function's comment for why this lives in the side panel
//     rather than as an in-page click (a real navigation destroys the
//     content script's execution context, so nothing after a click that
//     navigates can ever run there). Still `autofill: "partial"` in
//     platform-coverage.ts pending live re-verification of both employers
//     through the fixed flow.
//   - Recruitee: 1 clean pass (Resourceful Talent Group: email filled
//     correctly; phone correctly left untouched because it already had a
//     non-empty default value - canFill() properly refusing to clobber
//     existing input, not a failure), 1 inconclusive result (Novakid
//     Teachers: the same "Apply" simulation that worked in isolated
//     testing didn't reveal filled values in the full run - not yet root
//     -caused). Left at "partial"; the inconclusive result isn't strong
//     enough evidence either way.
//
// Do not flip any platform's `autofill` status based on selector-presence
// alone (this map, or its live-check) - that's a narrower claim than
// "verified." A promotion needs the deeper real-extension-flow evidence
// described above, across more than one real employer.
//
// Design is fail-safe by construction: getAtsFieldMap() only ever supplies
// candidate selectors, and the caller in contents/autofill.ts
// (fillProfileFieldsViaAtsMap) only fills a field when a selector resolves
// to EXACTLY ONE fillable input on the page (querySelectorAll + canFill(),
// not querySelector's first-match). A selector matching zero inputs, a
// disabled/readonly/hidden one, or - critically - more than one (e.g. the
// generic `input[type='email']` fallback matching both the applicant's own
// email and an unrelated "referred by" email field) is never guessed at;
// it's skipped and falls through to the next selector or, ultimately, the
// existing generic label-text detector. A wrong, stale, ambiguous, or
// missing selector here cannot cause a regression, only a missed
// optimisation.
import { detectATS } from "./ats-detector.ts"

export type AtsProfileFieldKey = "firstName" | "lastName" | "email" | "phone"

export type AtsFieldMap = Partial<Record<AtsProfileFieldKey, readonly string[]>>

/**
 * ATS platforms whose hosted form asks for ONE combined "full name" field
 * rather than separate first/last inputs (Lever, Ashby, Recruitee - the
 * Recruitee case live-confirmed 2026-09-02: `candidate.name`, not separate
 * `candidate.first_name`/`candidate.last_name` as originally guessed).
 * Filling only `firstName` into that field would silently drop the
 * candidate's surname - worse than not autofilling at all - so
 * firstName/lastName are deliberately omitted from ATS_FIELD_MAPS for
 * these platforms until a dedicated combined-name fill path exists.
 * Tracked here so the gap is a documented decision, not a silent omission.
 */
export const SINGLE_NAME_FIELD_ATS: readonly string[] = ["lever", "ashby", "recruitee"]

// Ashby and SmartRecruiters are deliberately NOT mapped below. Both were
// live-checked 2026-09-02 and their actual application forms render inside
// an <iframe> (Ashby: its embedded apply widget; SmartRecruiters: its
// "oneclick-ui" apply flow) - confirmed via zero top-level <input> elements
// plus a live iframe count on both. contents/autofill.ts's
// fillProfileFieldsViaAtsMap only ever queries the top-level `document` (or
// the LinkedIn Easy Apply modal), so no selector - however correct its text
// - can ever match there. Re-adding entries for either platform requires
// frame-aware querying in the caller first, not just better selector
// guesses.
export const ATS_FIELD_MAPS: Partial<Record<string, AtsFieldMap>> = {
  greenhouse: {
    firstName: ["#first_name", "input[name='job_application[first_name]']", "input[autocomplete='given-name']"],
    lastName: ["#last_name", "input[name='job_application[last_name]']", "input[autocomplete='family-name']"],
    email: ["#email", "input[name='job_application[email]']", "input[type='email']"],
    phone: ["#phone", "input[name='job_application[phone]']", "input[type='tel']"]
  },
  lever: {
    // Single "Full name" field - see SINGLE_NAME_FIELD_ATS above.
    email: ["input[name='email']", "input[type='email']"],
    phone: ["input[name='phone']", "input[type='tel']"]
  },
  recruitee: {
    // Single "Full name" field (`candidate.name`) - see
    // SINGLE_NAME_FIELD_ATS above. Fields are hidden until the page's own
    // "Apply" control is clicked; a real candidate reaches that state
    // before invoking AutoTime, and verify-ats-field-maps-live.mjs
    // simulates the click for the same reason.
    email: ["input[name='candidate.email']", "input[type='email']"],
    phone: ["input[name='candidate.phone']", "input[type='tel']"]
  },
  personio: {
    // Personio forms are configured per-employer with dynamic field IDs -
    // only autocomplete-attribute selectors are reliable across tenants.
    firstName: ["input[autocomplete='given-name']"],
    lastName: ["input[autocomplete='family-name']"],
    email: ["input[autocomplete='email']", "input[type='email']"],
    phone: ["input[autocomplete='tel']", "input[type='tel']"]
  }
}

/** True if `jobUrl`'s ATS asks for one combined name field rather than first/last. */
export function isSingleNameFieldAts(jobUrl: string): boolean {
  return SINGLE_NAME_FIELD_ATS.includes(detectATS(jobUrl))
}

/** The field map for `jobUrl`'s ATS, or null if unmapped/unrecognised. */
export function getAtsFieldMap(jobUrl: string): AtsFieldMap | null {
  return ATS_FIELD_MAPS[detectATS(jobUrl)] ?? null
}

/**
 * Lever's base posting URL (`jobs.lever.co/<company>/<id>`) never has the
 * application form on it - only the sibling `/apply` path does. Some
 * postings (e.g. ERG) are already linked/fixtured with `/apply`, so the
 * form is present immediately; others (confirmed 2026-09-02: Agate
 * Software) are not, and the extension finds zero fields to fill unless
 * something navigates there first.
 *
 * This was originally going to be solved with a generic "click a button
 * matching this text" reveal mechanism, modelled on Recruitee's
 * click-to-reveal form. That doesn't work for Lever specifically: Agate
 * Software's "Apply for this job" control is a real `<a href=".../apply">`,
 * not a JS toggle - clicking it triggers a full page navigation, which
 * destroys the content script's execution context before anything after
 * the click can run (a runtime-registered content script isn't
 * manifest-declared and doesn't re-inject itself into the new document).
 * Because Lever's `/apply` suffix is a fixed, predictable, same-origin
 * convention rather than something that needs discovering by clicking
 * around the page, resolving the target URL directly and having the
 * caller navigate + re-inject (see contents/autofill.ts's comment on
 * fillProfileFieldsViaAtsMap and sidepanel/main.tsx's
 * handleAutofillCurrentPage) is both simpler and doesn't depend on guessed
 * button text.
 */
export function getAtsApplyNavigationUrl(jobUrl: string): string | null {
  if (detectATS(jobUrl) !== "lever") return null
  try {
    const url = new URL(jobUrl)
    const trimmedPath = url.pathname.replace(/\/+$/, "")
    if (/\/apply$/i.test(trimmedPath)) return null
    url.pathname = `${trimmedPath}/apply`
    return url.toString()
  } catch {
    return null
  }
}
