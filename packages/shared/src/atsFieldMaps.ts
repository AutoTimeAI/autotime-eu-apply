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
// real DOM evidence. SmartRecruiters is deliberately absent from
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
//     pointed there; Agate Software's didn't).
//
//     Investigating how to trigger this at all surfaced a much bigger,
//     separate finding: NOTHING in the actually-shipped extension could
//     trigger AUTOTIME_AUTOFILL_PROFILE. Its only sender was
//     sidepanel/main.tsx, which isn't a registered WXT entrypoint (no
//     entrypoints/sidepanel/, no HTML output, no sidePanel manifest
//     permission) - deliberately removed in commit 483e00c4
//     ("keep draggable job panel only", 2026-05-10). Autofill had had no
//     reachable trigger in the real product since then. Fixed by adding an
//     AUTOFILL button to the widget that IS shipped
//     (getWidgetMarkup/bindWidgetEvents in contents/autofill.ts) instead of
//     reviving the side panel.
//
//     Closed via getAtsApplicationFormUrl() below, called from that
//     button's click handler. When navigation is needed, the click can't
//     drive it itself (see the function's own comment: navigating destroys
//     the content script's execution context), so it hands off to
//     entrypoints/background/index.ts's navigateAndAutofill(), which
//     navigates, waits for load, re-injects the content script, runs the
//     fill, and relays the result to the widget on the new page via
//     AUTOTIME_AUTOFILL_RESULT. Re-verified through the real built
//     extension, clicking the actual widget button, for both employers -
//     promoted to `autofill: "verified"` in platform-coverage.ts.
//   - Recruitee: 1 clean pass (Resourceful Talent Group: email filled
//     correctly; phone correctly left untouched because it already had a
//     non-empty default value - canFill() properly refusing to clobber
//     existing input, not a failure), 1 inconclusive result (Novakid
//     Teachers: the same "Apply" simulation that worked in isolated
//     testing didn't reveal filled values in the full run - not yet root
//     -caused). Left at "partial"; the inconclusive result isn't strong
//     enough evidence either way.
//   - Ashby (2026-09-02, second pass): initially misdiagnosed as blocked by
//     a cross-origin iframe (embedded-media.ashbyhq.com) - that iframe is
//     real but irrelevant, confirmed empty of input fields via Playwright's
//     cross-frame API. The actual form is reached the same way as Lever:
//     "Apply for this Job" is a real navigation (confirmed: a window-global
//     marker didn't survive the click) to a same-origin `/application`
//     suffix. jobs.ashbyhq.com added to host_permissions alongside
//     jobs.lever.co for the same navigateAndAutofill reason. Once there,
//     hit a second real bug: the email field existed, was visible, and was
//     empty immediately after chrome.tabs.onUpdated reports "complete", yet
//     autofillProfile() still found nothing - the ATS's client-side render
//     hadn't settled at that exact instant even though the browser's own
//     load signal had fired. Fixed with a 1.2s settle delay in
//     navigateAndAutofill() after waitForTabLoad() resolves (the extension
//     has no network-idle-equivalent signal to wait on instead, unlike a
//     test script). This same class of bug, once found, is worth checking
//     for on Lever too if problems ever surface there - Lever just happened
//     not to need it. 2/2 real employers (Ashby's own careers posting,
//     Inductive Automation LLC) filled correctly after the fix - promoted
//     to `autofill: "verified"` in platform-coverage.ts.
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

// SmartRecruiters is deliberately NOT mapped below. Its "oneclick-ui" apply
// flow was live-checked 2026-09-02 and its real form renders inside a
// same-origin <iframe> whose src is "" (about:blank at capture time) with
// zero <input> elements - the check never actually reached the real form,
// because the attempt was blocked by a DataDome CAPTCHA challenge iframe
// before the form loaded. Unlike Ashby (see the `ashby` entry below),
// SmartRecruiters' real form structure remains genuinely unverified, not
// just unmapped - re-adding it needs a way past that CAPTCHA wall (a real
// user's non-automated browser session may not trigger it the same way;
// automating a bypass is out of scope) before anything else here is
// possible.
//
// Workday and iCIMS are also deliberately NOT mapped, for the same class of
// reason, each live-checked 2026-09-08 with Playwright against a real
// posting:
//   - Workday (workday.wd5.myworkdayjobs.com, the platform's own tenant):
//     "Apply" opens a "Start Your Application" modal offering Autofill with
//     Resume / Apply Manually / Use My Last Application. Apply Manually
//     leads straight to an account gate (Sign in with Apple / Google /
//     email) - zero candidate-profile inputs exist on the page before that
//     sign-in completes. There is no unauthenticated form to map selectors
//     against.
//   - iCIMS (careers-vhb.icims.com, a real employer, req #6300
//     "Transportation Data Analytics Lead"): clicking "Apply" on a real
//     job posting navigates to a login page gated behind an hCaptcha
//     challenge. The only inputs present are the email field and the
//     CAPTCHA's own hidden response textarea - no name/phone fields, no
//     path to the real candidate form without passing the CAPTCHA first.
// Both are structurally blocked before any candidate-profile field is ever
// rendered, not merely unmapped - the same "needs a way past the wall
// first" situation as SmartRecruiters above, not a selector-writing task.
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
    // Single "Name" field (`_systemfield_name`) - see SINGLE_NAME_FIELD_ATS
    // above. Live-confirmed 2026-09-02 via Playwright's cross-frame API
    // (contentDocument access is blocked - see the header comment on why
    // that matters - Playwright's automation protocol isn't). No phone
    // field was present on the one real posting checked; omitted rather
    // than guessed (`_systemfield_phone` would match Ashby's naming
    // convention, but that's an inference, not evidence).
    email: ["#_systemfield_email", "input[name='_systemfield_email']", "input[type='email']"]
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
 * ATSes whose base posting URL never has the application form on it - only
 * a sibling path does. Some postings are already linked/fixtured with that
 * path (Lever's ERG example), so the form is present immediately; others
 * (confirmed 2026-09-02: Lever's Agate Software, Ashby's own careers
 * posting) are not, and the extension finds zero fields to fill unless
 * something navigates there first.
 *
 * Ashby's case was initially misdiagnosed as a cross-origin-iframe problem
 * (its job page does embed an unrelated cross-origin iframe at
 * embedded-media.ashbyhq.com, but that's not the application form -
 * verified 2026-09-02 it's empty of input fields). The real form only
 * appears after clicking "Apply for this Job", which - like Lever's
 * "Apply for this job" - is a real navigation (confirmed via a
 * window-global marker that didn't survive the click, plus Playwright's
 * framenavigated event firing for the main frame), landing on the same
 * origin at a `/application` suffix.
 *
 * This was originally going to be solved with a generic "click a button
 * matching this text" reveal mechanism, modelled on Recruitee's
 * click-to-reveal form. That doesn't work here: the "Apply" controls on
 * both platforms are real navigations, not JS toggles - clicking one
 * destroys the content script's execution context before anything after
 * the click can run (a runtime-registered content script isn't
 * manifest-declared and doesn't re-inject itself into the new document).
 * Because both suffixes are fixed, predictable, same-origin conventions
 * rather than something that needs discovering by clicking around the
 * page, resolving the target URL directly and having the caller navigate +
 * re-inject is both simpler and doesn't depend on guessed button text.
 *
 * jobs.lever.co and jobs.ashbyhq.com are in host_permissions specifically
 * so this works: the navigation is triggered by
 * entrypoints/background/index.ts's navigateAndAutofill() calling
 * chrome.tabs.update(), not by a fresh user gesture, and activeTab's grant
 * is documented to survive user-initiated same-origin navigation but not
 * documented either way for an extension-initiated one - an explicit grant
 * removes that ambiguity rather than betting on it.
 */
const ATS_APPLICATION_FORM_PATHS: Partial<Record<string, string>> = {
  lever: "apply",
  ashby: "application"
}

/**
 * The real application-form URL for `jobUrl`'s ATS, if its base posting URL
 * isn't already there, or null if this ATS doesn't need navigating (or
 * `jobUrl` is already on the form's own path). In practice: the widget's
 * Autofill button (see contents/autofill.ts's bindWidgetEvents) calls this,
 * and when it returns non-null, hands off to
 * entrypoints/background/index.ts's navigateAndAutofill() - the click
 * itself can't drive the navigation, since navigating destroys its own
 * execution context before anything after the click could run.
 */
export function getAtsApplicationFormUrl(jobUrl: string): string | null {
  const suffix = ATS_APPLICATION_FORM_PATHS[detectATS(jobUrl)]
  if (!suffix) return null
  try {
    const url = new URL(jobUrl)
    const trimmedPath = url.pathname.replace(/\/+$/, "")
    if (new RegExp(`/${suffix}$`, "i").test(trimmedPath)) return null
    url.pathname = `${trimmedPath}/${suffix}`
    return url.toString()
  } catch {
    return null
  }
}
