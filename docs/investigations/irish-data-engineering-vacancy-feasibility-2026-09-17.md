# Irish data-engineering vacancy feasibility check

**Checked:** 17 September 2026  
**Purpose:** Test whether the provisional Ireland/data-engineering slice has real employer postings suitable for a later, versioned evaluation corpus. This is a rapid desk check, **not** a vacancy-volume estimate, a 30–50-case corpus, sponsorship verification, or candidate validation. Listings may change after the check.

## Source triage

| Employer posting | Direct evidence seen | Status for a pilot corpus |
| --- | --- | --- |
| [Fin / Intercom — Staff Data Engineer, GTM](https://job-boards.greenhouse.io/intercom/jobs/8132076-4) | Direct Greenhouse application page opened on check date; Dublin is an offered location. The application says Fin sponsors immigration for **some roles**, not necessarily this one. Requirements combine data engineering with GTM identity resolution and production LLM work. | **Live-page candidate.** Preserve posting snapshot and ask employer about vacancy-specific sponsorship; do not infer it from the form. |
| [Qumulo — Senior Data Engineer](https://jobs.ashbyhq.com/qumulo/bd690668-00bf-49b7-8228-45c5cd81008a/) | Employer Ashby search result described Cork, hybrid, senior data-platform work. The page could not be fully inspected through the text fetch because it requires JavaScript. | **Needs browser confirmation** before inclusion; location and continued availability cannot be treated as independently verified here. |
| [Whatnot — Staff Software Engineer, Data](https://jobs.ashbyhq.com/whatnot/9fd6fef1-619f-48dd-97b0-c91063432df3/) | Employer Ashby search result listed Ireland among company hubs and described a data-engineering role; direct text fetch returned a JavaScript shell. | **Adjacent-role / location-uncertain**; not a clean Irish data-engineer case yet. |
| [SoSafe — Data Engineer](https://jobs.ashbyhq.com/sosafe/21e70865-0cef-4013-a95f-92871b3427e6/) | Employer Ashby search result listed Ireland Remote among multiple locations; direct text fetch returned a JavaScript shell, and the indexed result was several months old. | **Freshness and Ireland-employment check required**; do not count as live. |
| [Nearform — Senior Data Engineer](https://job-boards.greenhouse.io/nearform/jobs/7693681003) | Search index retained the vacancy text, but opening the link redirected to Nearform's general openings page, where this role was absent. | **Exclude as stale.** |
| [Expleo — Senior Data Engineer](https://expleo-jobs-ie-en.icims.com/jobs/54340/senior-data-engineer/job) | Search index retained a Dublin role, but the employer page returned 410 Gone. | **Exclude as closed/stale.** |

Two search-result traps were also rejected: [Dun & Bradstreet's board](https://jobs.lever.co/dnb?team=Technology) lists “Data Engineer I” in Hyderabad, not Dublin, and [Jobgether's board](https://jobs.lever.co/jobgether?location=Ireland) is an intermediary with many repeated country-labelled remote listings, not proof of a direct Irish employing entity.

## What can and cannot be concluded

The Fin posting demonstrates that a real, direct-employer Irish data role can expose exactly the uncertainty LandWell should handle: location is clear, the skills are specialized, and the sponsorship statement is **company-/some-role-level rather than vacancy-specific**. That makes it a useful adversarial decision case, not evidence that the vacancy sponsors a particular applicant.

This search **did not establish** that 30–50 current, distinct, direct-employer, mid/senior Irish data-engineering vacancies can be assembled quickly. One opened live page is insufficient for a corpus or a market-size claim. The provisional slice remains a hypothesis. An employer-owned posting with an application form is still not a legal employer-entity verification or a guarantee of permit support.

## Next corpus acceptance rule

For each candidate case, require: direct employer URL; live application page verified on capture day; Irish employing location or explicit Ireland-remote eligibility; posting capture time and immutable snapshot/hash; role-family and seniority classification; contract and entity ambiguity; explicit sponsorship wording or “not stated”; and a separate **unknown** state for all unverified claims. Reject expired, duplicated, recruiter-only, UK/Northern Ireland, or merely Ireland-labelled remote listings from the *core* slice; retain interesting rejects as negative test cases.

Before committing to this slice, repeat the same live-page search across more employers and compare with at least one alternative role family/corridor. Candidate interviews and qualified mobility review remain independent gates.
