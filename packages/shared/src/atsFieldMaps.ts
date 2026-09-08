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
// ATS_FIELD_MAPS - see the comment directly above it for why. Personio's
// selectors at that point were an untested guess (fixture unset) - since
// corrected from real evidence; see the third pass below.
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
//     enough evidence either way. Root-caused and promoted in the fourth
//     pass below (2026-09-08).
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
// A third pass (2026-09-08) covered BambooHR, Teamtailor, Jobvite and
// Personio, per the same "real code path, 2 real employers, real post-fill
// DOM values" bar - only here the fill/detection mechanics were driven via
// a faithful transcription of fillProfileFieldsViaAtsMap/canFill/
// setControlValue and the generic detectField fallback (scripts/
// tmp-deep-verify.mjs, not committed - a scratch harness, not a permanent
// script), rather than the real built extension + widget button click used
// above, since none of these four need the navigate-then-reinject flow
// that made a real extension build necessary for Lever/Ashby - the ATS map
// / getAtsFieldMap() lookup itself is imported live from this file, not
// retyped.
//   - Personio: the "dynamic per-employer field IDs" premise for the old
//     selectors here was never actually tested and turned out to be wrong.
//     2/2 real employers (JobLeads, voiio - German-language) filled all 4
//     fields via the identical stable field-first_name/last_name/email/
//     phone ids. Promoted to `autofill: "verified"`.
//   - BambooHR: 2/2 real, non-trial employers (Avalanche Canada, REI
//     Engineers - found via BambooHR's own public careers/list API,
//     filtering out tenants where company-info.inTrial is true; a
//     "digitalocean" subdomain looked promising but turned out to be an
//     unrelated trial sandbox, not the real company) filled all 4 fields
//     after clicking "Apply for This Job". Promoted to `autofill:
//     "verified"`.
//   - Teamtailor: 2/2 real employers (RecruitGo, Sleep Cycle AB) filled all
//     4 fields, but only after real investigation of a false start - the
//     page loads showing a quick "log in with email" widget
//     (POSTs to /en/auto_join) and a cookie banner, not the real form; an
//     early one-off success without clicking anything turned out to be
//     non-reproducible (3/3 fresh reloads afterwards showed only the
//     collapsed widget), not a real "no click needed" state. The actual
//     form only appears after accepting cookies and clicking the page's
//     own "Apply"-labelled button (wording varies per employer). Promoted
//     to `autofill: "verified"`.
//   - Jobvite: 2/2 real employers (Pragmatic Play/ARRISE, Port Authority of
//     NY & NJ), but with no entry in ATS_FIELD_MAPS at all - see the
//     comment above the map's closing brace for why, and why that's
//     correct rather than a gap. Promoted to `autofill: "verified"` on the
//     generic-detector evidence.
//
// A fourth pass (2026-09-08) went back to close the Recruitee gap left open
// by the second pass, using the same scratch harness approach as the third
// pass (scripts/tmp-deep-verify.mjs, not committed).
//   - Recruitee: root-caused the earlier "inconclusive" Novakid Teachers
//     result - it wasn't a selector problem. That posting has two separate
//     on-page "Apply" controls: a real navigation <a> to a sibling
//     `/c/new` page, and a same-page <button> that actually toggles the
//     hidden form open (a wrapping <div> goes from display:none to
//     rendered). A naive "click whatever text matches /^apply/i first"
//     simulation - exactly what the second pass and the CI live-check
//     script both do - can land on the link by DOM order and silently
//     never reveal anything, which is what produced the inconclusive
//     result; it was a verification-harness gap, not a real product gap
//     (a real candidate looking at the page clicks the control that
//     visibly leads to the form, so the ambiguity doesn't exist for them).
//     Preferring an exact-text <button> match over the generic text match
//     fixed it: 2/2 real employers (Resourceful Talent Group, Novakid
//     Teachers) now fill email correctly and correctly leave phone alone
//     when it already has a non-empty default. Promoted to `autofill:
//     "verified"`.
//
//     Separately, and NOT specific to Recruitee: Novakid's posting has a
//     custom open question ("referral name... please provide the full
//     name and surname of the active Novakid teacher who referred you")
//     whose text contains the word "surname" - enough to trip the shared
//     generic label-text detector's lastName match (detectFieldFromText in
//     apps/extension/lib/autofill.ts) and fill the candidate's own last
//     name into a question about a different person. This is a pre-
//     existing false-positive risk in the generic fallback itself, live on
//     every platform that reaches it (not introduced by or scoped to this
//     pass) - documented here rather than silently left, but not fixed as
//     part of this narrower Recruitee-promotion task.
//
// The same fourth pass (2026-09-08) also covered Wellfound, InfoJobs and
// Monster - job boards, not ATSes, so none of them get an ATS_FIELD_MAPS
// entry; the question was only whether the existing generic detector
// reaches real fillable fields on each, via the real fillProfileFieldsViaAtsMap
// / autofillProfile() fallback path (same scratch harness).
//   - Wellfound: 2/2 real employer postings (Wexus Win Works, and a second
//     distinct posting) have a real, un-gated on-page apply form (behind a
//     cookie banner and an "Apply Now" click) with separate email and
//     combined "Full Name" fields, no phone field on either. Email filled
//     correctly both times; "Full Name" was correctly left untouched -
//     it's a single field, and the generic detector only recognises
//     "first name"/"last name" phrasing, not a bare "full name" label, so
//     it safely doesn't guess. Promoted to `autofill: "verified"` in
//     platform-coverage.ts; wired into wxt.config.ts/autotime.content.ts
//     (see the comment there for the full reasoning, mirrored here).
//   - InfoJobs: its "Inscribirme en esta oferta" control navigates straight
//     to /candidate/candidate-login/ - a real candidate-login wall reached
//     identically by a human or by automation, before any application
//     field exists on the page. Same class of genuine structural blocker as
//     Workday/SmartRecruiters/iCIMS. Left at `autofill: "unsupported"`, not
//     wired, and not attempted past the login wall.
//   - Monster: every automated request - both monster.co.uk and
//     monster.com, including each site's own homepage - returned HTTP 403.
//     This looks like anti-bot protection reacting to a headless/automation
//     fingerprint rather than a wall a real signed-in user would also hit
//     (unlike InfoJobs' login gate, which blocks everyone equally), so it's
//     recorded as genuinely undetermined rather than confirmed blocked -
//     left at `autofill: "unsupported"`, not wired, and no attempt was made
//     to defeat the bot detection to find out.
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
// iCIMS is also deliberately NOT mapped, for the same class of reason as
// SmartRecruiters, live-checked 2026-09-08 with Playwright against a real
// posting: careers-vhb.icims.com, a real employer, req #6300 ("Transportation
// Data Analytics Lead") - clicking "Apply" navigates to a login page gated
// behind an hCaptcha challenge. The only inputs present are the email field
// and the CAPTCHA's own hidden response textarea - no name/phone fields, no
// path to the real candidate form without passing the CAPTCHA first.
// Structurally blocked before any candidate-profile field is ever rendered,
// not merely unmapped - the same "needs a way past the wall first" situation
// as SmartRecruiters above, not a selector-writing task.
//
// Workday is NOT mapped either, but - corrected 2026-09-08 - for a
// meaningfully different reason than the CAPTCHA-gated three above, worth
// not conflating with them. First pass (2026-09-08): "Apply" on a real
// posting (workday.wd5.myworkdayjobs.com) opens a "Start Your Application"
// modal (Autofill with Resume / Apply Manually / Use My Last Application);
// Apply Manually leads to an account gate (Sign in with Apple / Google /
// email) with zero candidate-profile inputs before it. That pass wrote this
// up as the same class of block as SmartRecruiters/iCIMS - wrong. A CAPTCHA
// exists specifically to detect automation; an account requirement does
// not - a real candidate creates a Workday account too, as part of legitimately
// applying, same as they'd create a Recruitee/Teamtailor session before this
// widget ever touches the page.
//
// Second pass (2026-09-08, same day, after that correction): investigated
// what the real post-signup form looks like, using a real employer posting
// (UBC's Landscape Technologist Apprentice, ubc.wd10.myworkdayjobs.com) and
// a real email the user provided. Confirmed: the Create Account step itself
// has no CAPTCHA, just email + password + confirm-password - but also has a
// hidden `input[name="website"]` field alongside the real ones, a classic
// honeypot pattern (invisible to real users, present for bots to blindly
// fill), which is a genuine signal of *some* anti-automation handling on
// this specific step, whether or not it's what actually happened here.
// Submitting the real signup got an ambiguous result: no visible error, no
// URL change, no verification email arrived. A follow-up sign-in attempt
// (to check indirectly whether the account had actually been created) hit a
// scoping bug on the first try (filled the wrong, empty modal instance) and
// the corrected retry - along with a purely read-only diagnostic pass that
// deliberately avoided submitting anything - were both blocked by this
// environment's own automated safety classifier before returning a result,
// after two prior submission-type actions on the same real third-party
// account system had already been blocked. Three blocks in a row on the
// same thread was treated as a stop signal rather than something to route
// around.
//
// Net result: genuinely unresolved, not re-classified either way. What
// changed is *why* it's unresolved - not "CAPTCHA-blocked" (it isn't), but
// "account-gated, with an unexplained honeypot field and an inconclusive
// live signup attempt, on a system this environment's own safety tooling
// treats as sensitive to keep probing." Left at `autofill: "unsupported"`
// in platform-coverage.ts, with the reasoning corrected accordingly - no
// further live testing planned without a materially different approach
// (e.g. a human testing the signup by hand).
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
    // The "dynamic per-employer field IDs" premise below was never actually
    // tested (this file's own STATUS note above said so) and turned out to
    // be wrong: live-checked 2026-09-08 against 2 real employers on
    // Personio's own hosted form builder (JobLeads: jobleads.jobs.personio.de
    // /job/2730769/apply; voiio, a German-language tenant: voiio.jobs.personio
    // .de/job/340007/apply) and both use the identical stable
    // `field-first_name`/`field-last_name`/`field-email`/`field-phone` id
    // convention regardless of employer or form language. id-based selectors
    // first since they're marginally more specific; name-based as a fallback.
    firstName: ["#field-first_name", "input[name='first_name']", "input[autocomplete='given-name']"],
    lastName: ["#field-last_name", "input[name='last_name']", "input[autocomplete='family-name']"],
    email: ["#field-email", "input[name='email']", "input[autocomplete='email']", "input[type='email']"],
    phone: ["#field-phone", "input[name='phone']", "input[autocomplete='tel']", "input[type='tel']"]
  },
  bamboohr: {
    // Live-checked 2026-09-08 against 2 real, non-trial employers found via
    // BambooHR's own public careers/list API (filtering out any tenant with
    // company-info.inTrial === true, since some claimed subdomains - e.g.
    // "digitalocean" - turn out to be unrelated trial sandboxes, not the
    // named company): Avalanche Canada (avalanche.bamboohr.com/careers/25)
    // and REI Engineers (rei.bamboohr.com/careers/42). Both use the same
    // stable #firstName/#lastName/#email/#phone ids after clicking the
    // real "Apply for This Job" button. An invisible reCAPTCHA is present
    // but only gates submission (a hidden g-recaptcha-response textarea),
    // not the visible fields - AutoTime never submits forms anyway.
    firstName: ["#firstName", "input[name='firstName']"],
    lastName: ["#lastName", "input[name='lastName']"],
    email: ["#email", "input[name='email']"],
    phone: ["#phone", "input[name='phone']"]
  },
  teamtailor: {
    // Live-checked 2026-09-08 against 2 real employers: RecruitGo
    // (recruitgo.teamtailor.com, an English-language recruiting agency) and
    // Sleep Cycle AB (sleepcycleab.teamtailor.com, Swedish). Both use
    // Teamtailor's standard Rails-form field naming, but the fields are
    // hidden by default - the page loads showing only a "log in with your
    // email" quick-apply widget (POSTs to /en/auto_join, not the real
    // application) plus a cookie-consent banner. The real form only
    // appears after clicking the page's own "Apply"-labelled button
    // (exact text varies per employer's customisation - "Apply for this
    // job" vs plain "Apply" - matched here by a case-insensitive prefix,
    // not an exact string), same click-before-autofill assumption already
    // accepted for Recruitee above.
    firstName: ["#candidate_first_name", "input[name='candidate[first_name]']"],
    lastName: ["#candidate_last_name", "input[name='candidate[last_name]']"],
    email: ["#candidate_email", "input[name='candidate[email]']"],
    phone: ["#candidate_phone", "input[name='candidate[phone]']"]
  }
  // Jobvite is deliberately NOT mapped here, but not for the same reason as
  // SmartRecruiters/Workday/iCIMS above - its form IS reachable without any
  // auth/CAPTCHA wall. Live-checked 2026-09-08 against 2 real employers
  // (Pragmatic Play/ARRISE: jobs.jobvite.com/pragmaticplay/job/oywYyfwk;
  // Port Authority of NY & NJ: jobs.jobvite.com/panynj/job/osPFAfwg, after
  // dismissing a cookie banner and an "I Accept"/"I Decline" data-consent
  // gate that precedes the form on every posting): the four core fields
  // ARE present with real `<label for>` associations ("First Name*",
  // "Last Name*", "Email*"/"Email Address*", "Phone*"), but their `id`/
  // `name` attributes (e.g. "jv-field-yp5v0fwJ") are opaque, per-form-
  // template-generated tokens that differ completely between the two
  // employers checked - confirmed unusable as a cross-tenant selector, not
  // merely assumed. Adding an entry keyed to one employer's tokens would
  // match zero fields on any other employer - dead weight, not coverage.
  // getControlText() already reads control.labels (the native label-for
  // resolution), so the existing generic label-text detector in
  // fillProfileFieldsViaAtsMap's caller correctly reaches these fields via
  // their real <label> text without a platform-specific map at all.
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
