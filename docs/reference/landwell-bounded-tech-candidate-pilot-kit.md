# LandWell bounded tech-candidate pilot kit

**Status:** Ready-to-run protocol; no participant or outcome evidence has been collected by this document.  
**Owner:** Founder  
**Prepared:** 17 September 2026  
**Parent plan:** [LandWell tech-system validation plan](landwell-tech-system-validation-plan.md)

## Boundary and objective

Test whether LandWell helps a specific cross-border tech candidate make a safer, clearer, more useful **real vacancy decision**. This is not a test of all tech roles, all European countries, interview outcomes, or general product satisfaction.

The pilot has two sequential parts:

1. **Slice selection:** 8–12 short discovery interviews to choose one candidate circumstance, one role family and one hiring-country corridor. Record the selection score and rejected alternatives before product testing.
2. **Observed pilot:** 3–5 non-founder candidates from that slice, each with at least one real vacancy. Five is preferable because the proposed comprehension and behavior gates are expressed as counts out of five.

Do not quietly combine different role families or visa circumstances to fill the quota. If recruitment for one slice fails, record that as a distribution finding.

## Recruitment screen

Invite candidates who are actively considering cross-border applications within the next 30 days and can bring a real vacancy. Confirm role family, target country, current work-right situation, seniority, and whether the application decision is still open. Exclude cases requiring regulated-profession advice or unsupported definitive immigration guidance. Participation must be voluntary; explain what data is retained and obtain consent before recording.

Recruitment message:

> I am testing LandWell, a tool that helps people assess whether a cross-border tech job is worth applying to and what evidence is missing. I am looking for people actively considering [role family] roles in [country]. In a 30–45 minute session, you would use one real job posting and tell me where the recommendation is helpful, confusing or wrong. This is research, not immigration or hiring advice. There is no obligation to buy. Would you be open to participating?

## Session script (30–45 minutes)

1. **Consent and context, 5 minutes.** Confirm the candidate may stop, skip questions, and request deletion. Record only the minimum candidate facts needed for the decision.
2. **Unaided baseline, 5 minutes.** Show the vacancy without LandWell. Ask: “Would you apply, investigate, improve your evidence first, or skip? Why? What would you verify?” Capture the answer before showing the product.
3. **Uncoached journey, 15 minutes.** Candidate enters or checks their profile, imports the vacancy, corrects extraction, reads the decision and evidence, and attempts the next action. Observe silently. Log failed routes, corrections, latency, and any point requiring intervention.
4. **Comprehension and trust, 5 minutes.** Ask: “What is LandWell recommending? What fact supports it? What remains uncertain? What would you do next?” Require an explanation in the candidate's own words. Record disagreements verbatim but do not treat agreement as accuracy.
5. **Behavior and value, 5 minutes.** Ask whether the intended action changed and what specifically changed. Present a concrete price for the narrow service and ask for a real purchase or explicitly priced commitment. Do not count polite praise as payment evidence.
6. **Follow-up, 5 minutes.** Agree on a 7–14 day check for whether they applied, investigated, deferred or skipped and what happened. Do not suggest the product caused any later interview.

## Private case record (one per candidate × vacancy)

Keep identifiable details and consent records in access-controlled storage, **not** this repository. An anonymised analysis row should contain:

| Field | Record |
| --- | --- |
| IDs and scope | Participant code, case ID, session date, selected slice and corridor |
| Vacancy provenance | URL, capture time, posting snapshot/hash, employer/entity certainty |
| Candidate evidence | Minimum work-right, experience and constraints used; provenance and uncertainty |
| Baseline | Unaided action, rationale, time and facts they would verify |
| Product output | Action, blockers, missing evidence, source/version links, record/replay ID |
| Journey | Steps completed, corrections, errors, coaching required, elapsed time |
| Comprehension | Candidate's own explanation of recommendation, evidence and limitation; correct/incorrect against the output |
| Behavior | Post-session action and exact change from baseline; later observed action |
| Trust | Specific agreement, disagreement, surprise, missing context and severity |
| Commercial | Price shown, purchase/commitment/refusal, reason; no invented revenue |
| Review | Role reviewer, mobility expert if needed, disagreement, safety classification |

## Precommitted decision rules

Before the first observed session, freeze the slice, the price offered, the case rubric and the pilot date window. For the first five-user cohort:

- **Stop and repair:** Any critical false certainty, unsupported definitive mobility claim, privacy breach, or uncorrectable wrong employer/country identity. Do not continue ordinary recruitment until contained.
- **Narrow claim candidate:** No critical false certainty; at least 4/5 independently explain the recommendation and key limitation; at least 3/5 make a concrete change to a real application decision or preparation step; at least two non-founder users pay or make an explicitly priced purchase commitment; specialist case-review gate in the parent plan is met.
- **Hold:** Safety is acceptable but comprehension, observed behavior, priced demand or independent review is insufficient. Fix only evidenced problems, then repeat.
- **Pivot or stop:** Repeated safe-but-obvious advice, no reachable recruitment channel, or no willingness to pay after the offer is understood.

With only three or four participants, report counts and treat positive results as preliminary. Do not adjust thresholds after seeing results. Keep the 30–50-case independent evaluation set and blind holdout from the parent plan separate from these user sessions; a small usability pilot cannot replace specialist accuracy review.

## Founder deliverables

Publish only privacy-safe summaries: the slice-selection memo, dated case index, baseline-versus-product action table, comprehension counts, trust and safety incidents, price-offer outcomes, root-cause/fix ledger, and a signed GO/HOLD/NO-GO note with permitted public wording. Keep the raw consent and candidate data private.
