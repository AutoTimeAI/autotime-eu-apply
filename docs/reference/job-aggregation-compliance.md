# Job aggregation and outreach compliance

Only these sources are permitted for automated listing ingestion: EURES, published ATS APIs (Greenhouse, Lever, Ashby and Personio), and licensed aggregator APIs configured by the operator (Adzuna and Jooble).

- Do not scrape LinkedIn, Indeed, national job boards, or any site whose terms prohibit automated collection.
- Do not automate LinkedIn connections, messages, profile lookup, clicks, form interaction, search-result collection, or background page scraping.
- The browser extension extracts page content automatically only for Workday, iCIMS, and generic/unknown company career sites. API-covered sources save URL/platform references only.
- Product-owner exception (2026-08-15): after a user clicks the extension icon on one `linkedin.com/jobs/` page and accepts a clear one-time risk notice, the extension may read only that page's job title and description for an ephemeral ESCO match. This is knowingly outside LinkedIn's terms and may risk the user's LinkedIn account. It never runs on page load, scans lists, reads poster/profile data, persists raw LinkedIn content, or performs any page action. The base automatic overlay continues to exit on LinkedIn.
- Outreach drafts are editable and human-sent. Copying a draft may record a user-declared send; it must never send externally.
- Contact discovery is limited to manually supplied contacts at the company attached to the tracked job. Do not add cross-company or open-ended people search.
- Target-role peer messages are informational networking requests for a short role/team conversation. They must not ask about an application, referral, or hiring decision.
- `job_listings` and `company_ats_slugs` contain listing metadata only. Candidate records remain in user-owned tables (`applications`, profiles, CV data and `outreach_messages`) protected by row-level security.
- Provider credentials stay server-side. Confirm current provider terms and quotas before enabling scheduled production sync.
