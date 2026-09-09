# Job aggregation and outreach compliance

This repo has two separate mechanisms for getting job listings, governed by
different rules. Conflating them was the source of a real compliance-doc/code
mismatch found and corrected on 2026-08-21 (this doc said "do not scrape
Indeed"; the extension's platform-coverage table had deliberately and
recently added Indeed to its selector-extraction list) - keep the two
distinct going forward.

## 1. Server-side automated listing ingestion (`job_listings` table)

Only these sources are permitted for automated, unattended, bulk ingestion
into `job_listings`: EURES, ATS APIs with a verified native public feed
(currently Greenhouse, Lever, Ashby, SmartRecruiters, Recruitee, Personio,
BambooHR, Teamtailor, Jobvite, and Workday - see the `nativeFeed: "verified"`
entries in `packages/shared/src/platform-coverage.ts`; the last four are the
reverse-engineered-endpoint exception below, not officially published APIs),
iCIMS's feed for the subset of deployments where it actually works
(`nativeFeed: "partial"`, same exception, see below for why it isn't
`"verified"`), and licensed aggregator APIs
configured by the operator (Adzuna and Jooble). Provider credentials stay
server-side. Confirm current provider terms and quotas before enabling
scheduled production sync.

Do not add a new automated bulk-ingestion source without a published API,
native feed, or licensed aggregator agreement - the exception below is a
deliberate, logged, product-owner call, not a precedent to extend casually.

### Reverse-engineered feed exception (BambooHR, Teamtailor, Jobvite, Workday, iCIMS)

- Product-owner exception (2026-09-08, extended 2026-09-09): BambooHR's
  `careers/list`, Teamtailor's `jobs.json`, Jobvite's `CompanyJobs/Xml.aspx`,
  Workday's `wday/cxs/.../jobs`, and iCIMS's `api/jobs` are undocumented,
  unauthenticated endpoints - not officially published APIs - each
  confirmed live against real employers before building (2 each for
  BambooHR/Teamtailor/Jobvite/Workday; iCIMS specifically tested against 5,
  see below). Mirrored in `apps/web/lib/ats-feeds/*.ts` and
  `supabase/functions/sync-job-sources/index.ts`. Approved knowingly as an
  exception to the published-API rule above because all are read-only,
  return only already-public job listing data (no auth bypass, no scraping
  of gated content), and are stable enough that multiple independent
  third-party tools or the platform's own live career site already rely on
  the same shapes. If any endpoint starts returning errors or a materially
  different shape, that's a signal it changed or was intentionally closed
  off - stop syncing that platform and re-evaluate, don't work around the
  change.
- Jobvite specifically: its old JSON endpoint
  (`api/company/{slug}/jobs`) is confirmed dead. The working XML endpoint
  needs an opaque per-company `companyEId` that is NOT the public
  careers-page slug - originally logged as an unsolved blocker, then
  resolved the same pass: the id is embedded directly in the public
  careers page's own HTML/JS (`companyEId: '<id>'`), readable with a plain
  unauthenticated fetch of `jobs.jobvite.com/{slug}/jobs`, no browser
  rendering needed. `JobviteFeed.fetchJobs()` does this as an explicit
  two-step lookup.
- Workday specifically: this is the same public CXS API a real Workday
  career site's own search box calls (discovered by capturing a real site's
  own network requests) - entirely separate from the account-gated
  application form that blocks autofill (see the separate Workday autofill
  writeup in `atsFieldMaps.ts` - job listings and applying are different
  surfaces with different access rules). The API rejects any page limit
  above 20 (HTTP 400, confirmed live), so `WorkdayFeed` paginates by
  `offset`. `company_ats_slugs.ats_slug` for Workday is
  `"{tenantHost}:{site}"` (e.g. `"ubc.wd10:ubcstaffjobs"`), both read
  directly off the company's real public careers URL - Workday's numbered
  tenant host isn't guessable from the company name alone.
- iCIMS specifically, and unlike every other platform in this exception:
  confirmed NOT universal. Tested against 5 real employer career sites -
  2 ("Jibe-powered" deployments: a university's custom-domain site, and
  iCIMS's own `hrjobs.icims.com`) expose a real `/api/jobs` JSON endpoint;
  3 ("classic" iCIMS portals) render everything server-side with no such
  API at all. A classic site hit with the same path returns HTTP 200 with
  its normal HTML page (SPA-style fallback routing, not a real 404) -
  `IcimsFeed` deliberately does NOT special-case this: `response.json()`
  throwing a SyntaxError on that HTML is the correct, honest per-company
  failure (surfaced in `sync-job-sources`'s `failures` array), not
  something to catch and paper over. This inconsistency is why iCIMS is
  `nativeFeed: "partial"`, not `"verified"` - do not promote it to
  `"verified"` off a lucky sample; the split is real and confirmed, not a
  gap in testing.

## 2. Extension-side, user-initiated single-page capture

Separately, the browser extension can capture the *one job page the user is
already voluntarily viewing* when they click the extension icon. This is not
automated background scraping of search results or multiple pages, and it
only ever runs on a page the user opened themselves.

The capture mode per platform is the authoritative, actively-maintained
`expectedCaptureMode` field in `packages/shared/src/platform-coverage.ts`
(enforced by `getJobCaptureMode` in `apps/extension/lib/job-page.ts`) - do
not duplicate that list here, since it will go stale exactly the way this
doc previously did. Check that file directly for the current, reviewed set.
As of its `VERIFIED_AT` date, the three modes are:

- **`manual-only`**: LinkedIn (see the exception below), plus any platform
  reviewed and intentionally kept manual. BambooHR, Teamtailor, and Jobvite
  moved to `api-reference` on 2026-09-08 once their native feed was
  verified; see the exception above.
- **`api-reference`**: the verified-native-feed ATS platforms above, plus
  EURES/Adzuna/Jooble. The extension records only a URL/platform reference -
  no page content is read.
- **`selector-extraction`**: Workday and iCIMS (known ATS platforms without a
  native feed), plus a reviewed list of job boards without a native feed or
  aggregator coverage. On these, the extension reads the currently-open
  page's visible title/company/location/description only, at the user's own
  request - it does not visit other pages, follow links, or run without the
  user clicking the extension.

Do not scrape LinkedIn (outside the narrow exception below), and do not
automate LinkedIn connections, messages, profile lookup, clicks, form
interaction, search-result collection, or background page scraping on any
site. Adding a new job board to the `selector-extraction` list should be a
deliberate, reviewed decision - check that site's current terms first, the
same way the existing list was reviewed, and update `lastVerifiedAt` in
`platform-coverage.ts` when you do.

## LinkedIn

- Product-owner exception (2026-08-15): after a user clicks the extension
  icon on one `linkedin.com/jobs/` page and accepts a clear one-time risk
  notice, the extension may read only that page's job title and description
  for an ephemeral ESCO match. This is knowingly outside LinkedIn's terms and
  may risk the user's LinkedIn account. It never runs on page load, scans
  lists, reads poster/profile data, persists raw LinkedIn content, or
  performs any page action. The base automatic overlay continues to exit on
  LinkedIn.

## Outreach and contacts

- Outreach drafts are editable and human-sent. Copying a draft may record a
  user-declared send; it must never send externally.
- Contact discovery is limited to manually supplied contacts at the company
  attached to the tracked job. Do not add cross-company or open-ended people
  search.
- Target-role peer messages are informational networking requests for a
  short role/team conversation. They must not ask about an application,
  referral, or hiring decision.

## Data separation

`job_listings` and `company_ats_slugs` contain listing metadata only.
Candidate records remain in user-owned tables (`applications`, profiles, CV
data and `outreach_messages`) protected by row-level security.
