// Best-known CSS selectors for the standard profile fields (first name,
// last name, email, phone) on each ATS's own hosted application form,
// keyed by the same atsKey used in platform-coverage.ts / ats-detector.ts.
//
// STATUS as of the first live run (scripts/verify-ats-field-maps-live.mjs,
// 2026-09-02): Greenhouse and Lever's selectors are live-confirmed correct.
// Recruitee's were live-confirmed WRONG (see the `recruitee` entry below -
// the original guess assumed separate bracket-notation first/last fields;
// the real form is one dot-notation `candidate.name` field) and have been
// corrected from real DOM evidence. Ashby and SmartRecruiters are
// deliberately absent from ATS_FIELD_MAPS - see the comment directly above
// it for why. Personio remains untested (no fixture set). Do not flip any
// platform's `autofill` status in platform-coverage.ts from "partial" to
// "verified" based on this map alone; that's a broader claim than "these
// four fields have a selector."
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
