# Ireland tech-slice desk comparison

**Checked:** 17 September 2026  
**Question:** Is the first evaluation corpus better anchored on Irish mid/senior data engineering or Irish backend/software engineering for candidates who need employer sponsorship?  
**Status:** Rapid, non-exhaustive employer-posting check. Not candidate research, a market-size estimate, legal review, or evidence of willingness to pay. Recheck every posting before case capture.

## Direct-posting observations

| Candidate case | Direct employer evidence observed | Why it matters | Corpus status |
| --- | --- | --- | --- |
| [Fin — Staff Data Engineer, GTM, Dublin](https://job-boards.greenhouse.io/intercom/jobs/8132076-4) | Direct application page was open. It says the employer sponsors immigration for **some roles**; no promise for this exact vacancy. | Strong data-engineering test of vacancy-specific uncertainty and unusually specialist GTM/data requirements. | Candidate case; sponsorship remains unknown. |
| [Dun & Bradstreet — Senior Software Engineer, Dublin](https://jobs.lever.co/dnb/15b7a0ec-2c39-469a-b0e2-4bb756a13f8e) | Direct, open Lever posting for hybrid API/Java/Spring work. No sponsorship commitment in the job description inspected. | Ordinary mid/senior backend case where silence must remain “unknown,” not “no” or “yes.” | Candidate case; sponsorship unknown. |
| [Gong — Senior Backend Engineer, Dublin](https://job-boards.greenhouse.io/gongio/jobs/4684215006) | Direct, open application page for senior Java backend work. It says applicants must be eligible to work in Ireland **and** separately asks whether they require sponsorship now or later. | Eligibility wording and a sponsorship question coexist. Do not infer that sponsorship is offered or categorically refused without employer clarification. | Candidate case; ambiguity to label and escalate. |
| [Anthropic — Staff Software Engineer, AI Reliability, Dublin](https://job-boards.greenhouse.io/anthropic/jobs/5101169008) | Direct, open application page explicitly says the employer sponsors visas but cannot do so for every role and candidate. | Positive employer-level signal with explicit limitations; also a staff-level specialist role, not representative of all backend jobs. | Adversarial positive/conditional case; not a generic mid-level sample. |
| [Anthropic — Staff Software Engineer, Inference, Dublin](https://job-boards.greenhouse.io/anthropic/jobs/5150472008) | Direct, open application page with the same qualified sponsorship statement, for a distinct specialist role. | Useful near-duplicate employer-policy control; do not count two Anthropic postings as two independent employer policies. | Distinct vacancy, shared employer-policy cluster. |
| [Fanatics — Software Engineer III, Trading](https://job-boards.greenhouse.io/fanaticsfbg/jobs/4290936009) | Direct page lists **Leeds** as the role location, says Ireland-based remote candidates may apply, and explicitly says this position has no visa sponsorship. | Good hard-negative test; must be flagged as Ireland-remote/UK-posted, not incorrectly treated as a Dublin vacancy. | Boundary case, outside strict Dublin core. |

The [earlier data-engineering feasibility check](irish-data-engineering-vacancy-feasibility-2026-09-17.md) also found stale and JavaScript-only leads. In this rapid pass, backend/software engineering supplied more directly inspectable employer pages and richer sponsorship-language variation. This is a **search-yield observation**, not evidence of total job volume or candidate demand.

## Decision

Keep **Ireland + sponsorship-required + mid/senior tech candidate** as the corridor/situation hypothesis, but switch the **first corpus-discovery preference** from “data engineers only” to **backend/software engineers**, subject to real interviews. A provisional pilot statement is:

> For an experienced backend/software engineer who needs employer sponsorship and is evaluating an Irish direct-employer role, LandWell helps distinguish evidenced fit, explicit blockers and unresolved employer/work-right questions before spending effort on an application.

This is deliberately narrower than “for tech professionals.” It does **not** mean a sponsor register proves vacancy-level support, that any named employer will sponsor a given candidate, or that LandWell can determine permit eligibility. Cases such as Gong should remain “Investigate” if decisive facts are unknown; cases such as Fanatics need location-aware handling.

## What would falsify this preference

1. Real discovery interviews show the target candidate cannot be recruited, does not face repeated vacancy-level uncertainty, or values a different problem more.
2. A systematic direct-employer search cannot assemble 30–50 fresh, distinct, role-relevant cases without overcounting one employer or loosely related roles.
3. The product repeatedly misreads explicit sponsorship negatives, employer identity or role location in actual end-to-end use.
4. The required qualified review for Irish mobility claims is unavailable and the product cannot safely constrain itself to information-only output.
5. Candidates understand the result but neither change a real decision nor make a priced commitment.

## Next evidence step

Capture a small, frozen **10-case feasibility corpus** across multiple employers before expanding to 30–50. Include direct positive/qualified, explicit no, silence/unknown, conflicting wording, remote-location ambiguity and stale-posting controls. Preserve source URL, capture timestamp, content hash, employing-entity uncertainty, evidence excerpt reference, and role-family classification. Do not pre-label mobility-law correctness without qualified review. Then run the same cases through LandWell's actual UI and record output, provenance, abstention and correction behavior.
