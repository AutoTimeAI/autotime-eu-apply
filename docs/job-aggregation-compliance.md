# Job aggregation and outreach compliance

Only these sources are permitted for automated listing ingestion: EURES, published ATS APIs (Greenhouse, Lever, Ashby and Personio), and licensed aggregator APIs configured by the operator (Adzuna and Jooble).

- Do not scrape LinkedIn, Indeed, national job boards, or any site whose terms prohibit automated collection.
- Do not automate LinkedIn connections, messages, profile lookup, or page scraping.
- The browser extension extracts page content only for Workday, iCIMS, and generic/unknown company career sites. API-covered sources save URL/platform references only; LinkedIn and other restricted boards are manual-only.
- Outreach drafts are editable and human-sent. Copying a draft may record a user-declared send; it must never send externally.
- Contact discovery is limited to manually supplied contacts at the company attached to the tracked job. Do not add cross-company or open-ended people search.
- Target-role peer messages are informational networking requests for a short role/team conversation. They must not ask about an application, referral, or hiring decision.
- `job_listings` and `company_ats_slugs` contain listing metadata only. Candidate records remain in user-owned tables (`applications`, profiles, CV data and `outreach_messages`) protected by row-level security.
- Provider credentials stay server-side. Confirm current provider terms and quotas before enabling scheduled production sync.
