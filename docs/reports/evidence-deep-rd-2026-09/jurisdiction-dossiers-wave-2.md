# Jurisdiction dossiers — Wave 2

**Audit date:** 11 September 2026  
**Scope:** France, Spain, Austria and Denmark.

## France — Talent EU Blue Card

The duration chain is now resolved. CESEDA Article L421-11 changed from one year to six months on 3 May 2025, and current Service-Public guidance also says six months. France-Visas still exposes one-year wording, so it is retained as a stale-source regression fixture rather than treated as an equal current authority.

The salary chain is not clean. CESEDA R421-21 A sets a 1.5 multiplier, and the ministerial order of 21 August 2025 sets the reference salary at EUR 39,582, mathematically producing EUR 59,373. Current Service-Public guidance instead displays EUR 53,836.50. Until the applicable regulatory history or an official correction reconciles those values, exact salary decisions remain `source_conflict`. Article 3 of the 2025 order expressly repeals the 2016 predecessor orders from 1 September 2025.

Candidate predicates still include a highly qualified job lasting at least six months, three-year higher education or five years comparable experience, or the route-specific three-in-seven professional-experience branch. Regulated professions and experience comparability remain review points.

## Spain — EU Blue Card

Order PJC/44/2026 commenced 31 January 2026. It sets 1.4 times INE average annual gross earnings and a reduced value of 80% for either qualifying hard-to-fill CNO 1/2 occupations or a qualifying education award obtained within three years. A new INE annual earnings survey changes the applicable threshold one month after publication. Applications already filed remain under the prior rules unless the applicant requests the new order and proves compliance.

INE's 2024 value was published 28 May 2026. The ministry calculates EUR 41,356.36 general and EUR 33,085.09 reduced. The product must version the INE release, calculation publication and application cohort separately; it must also retain the hard-to-fill catalogue version.

## Austria — EU Blue Card

Federal migration guidance gives a 2026 amount of EUR 55,678, described as annual salary plus special payments. It requires a relevant three-year tertiary course or, for ICT professionals/service managers, three relevant years within the prior seven comparable to a degree; a binding offer for at least six months; work corresponding to education; and an AMS labour-market test with no equally qualified registered jobseeker.

The AMS result is employer/authority-side evidence and cannot be inferred from candidate data. Salary normalization must model special payments explicitly. The current consolidated NAG section 42, effective 7 August 2026 after BGBl. I 81/2026, requires the regional AMS written notification under AuslBG section 20d and normally issues the Blue Card for two years, or contract duration plus three months for a shorter contract.

AuslBG section 12c now closes the employment-law link: it anchors the latest Statistik Austria full-time annual salary formula, qualification-related work and the ICT ISCO-08 groups 133/25 three-in-seven exception. The federal income page identifies EUR 55,678 as the 2024 full-time median used for the 2026 route amount. The chain can therefore support a conditional candidate-side result, but never an inferred AMS approval.

## Denmark — Pay Limit routes

Denmark does not participate in the EU Blue Card regime. For applications from 1 January 2026, the Pay Limit Scheme uses DKK 552,000 annually (DKK 46,000 monthly), while the Supplementary Pay Limit Scheme uses DKK 446,000. Both are distinct schemes with additional conditions. Salary and employment terms must correspond to Danish standards even where the number is met.

The amount changes each 1 January. An extension may retain the threshold tied to the original application, making application type and original decision provenance mandatory. A single `current_denmark_threshold` field would produce incorrect extension decisions.
