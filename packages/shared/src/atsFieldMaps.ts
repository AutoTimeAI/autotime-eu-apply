// Best-known CSS selectors for the standard profile fields (first name,
// last name, email, phone) on each ATS's own hosted application form,
// keyed by the same atsKey used in platform-coverage.ts / ats-detector.ts.
//
// STATUS: unverified. These selectors are written from public knowledge of
// each platform's typical DOM structure, not from live-tested fixtures -
// there are none in the repo yet. Extend
// scripts/verify-platform-coverage-live.mjs's Playwright pattern to check
// these against real hosted application forms before flipping any
// platform's `autofill` status in platform-coverage.ts from "partial" to
// "verified".
//
// Design is fail-safe by construction: getAtsFieldMap() only ever supplies
// candidate selectors, and the caller in contents/autofill.ts only fills a
// field if querySelector actually resolves AND the input passes the normal
// canFill() checks. A wrong, stale, or missing selector here just falls
// through to the existing generic label-text detector - it cannot cause a
// regression, only a missed optimisation.
import { detectATS } from "./ats-detector.ts"

export type AtsProfileFieldKey = "firstName" | "lastName" | "email" | "phone"

export type AtsFieldMap = Partial<Record<AtsProfileFieldKey, readonly string[]>>

/**
 * ATS platforms whose hosted form asks for ONE combined "full name" field
 * rather than separate first/last inputs (Lever, Ashby). Filling only
 * `firstName` into that field would silently drop the candidate's surname -
 * worse than not autofilling at all - so firstName/lastName are
 * deliberately omitted from ATS_FIELD_MAPS for these platforms until a
 * dedicated combined-name fill path exists. Tracked here so the gap is a
 * documented decision, not a silent omission.
 */
export const SINGLE_NAME_FIELD_ATS: readonly string[] = ["lever", "ashby"]

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
  ashby: {
    // Single "Name" field - see SINGLE_NAME_FIELD_ATS above.
    email: ["input[name='_systemfield_email']", "input[type='email']"],
    phone: ["input[name='_systemfield_phone']", "input[type='tel']"]
  },
  smartrecruiters: {
    firstName: ["input[name='firstName']", "[data-test='firstName-input'] input", "input[autocomplete='given-name']"],
    lastName: ["input[name='lastName']", "[data-test='lastName-input'] input", "input[autocomplete='family-name']"],
    email: ["input[name='email']", "[data-test='email-input'] input", "input[type='email']"],
    phone: ["input[name='phoneNumber']", "[data-test='phoneNumber-input'] input", "input[type='tel']"]
  },
  recruitee: {
    firstName: ["input[name='candidate[first_name]']", "input[autocomplete='given-name']"],
    lastName: ["input[name='candidate[last_name]']", "input[autocomplete='family-name']"],
    email: ["input[name='candidate[email]']", "input[type='email']"],
    phone: ["input[name='candidate[phone]']", "input[type='tel']"]
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
