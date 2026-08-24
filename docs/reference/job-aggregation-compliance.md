# Job aggregation and outreach compliance

This repo has two separate mechanisms for getting job listings, governed by
different rules. Conflating them was the source of a real compliance-doc/code
mismatch found and corrected on 2026-08-21 (this doc said "do not scrape
Indeed"; the extension's platform-coverage table had deliberately and
recently added Indeed to its selector-extraction list) - keep the two
distinct going forward.

## 1. Server-side automated listing ingestion (`job_listings` table)

Only these sources are permitted for automated, unattended, bulk ingestion
into `job_listings`: EURES, published ATS APIs with a verified native public
feed (currently Greenhouse, Lever, Ashby, SmartRecruiters, Recruitee, and
Personio - see the `nativeFeed: "verified"` entries in
`packages/shared/src/platform-coverage.ts`), and licensed aggregator APIs
configured by the operator (Adzuna and Jooble). Provider credentials stay
server-side. Confirm current provider terms and quotas before enabling
scheduled production sync.

Do not add a new automated bulk-ingestion source without a published API,
native feed, or licensed aggregator agreement.

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
  reviewed and intentionally kept manual (currently BambooHR, Teamtailor,
  Jobvite). No automatic capture at all.
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
