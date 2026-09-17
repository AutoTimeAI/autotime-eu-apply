# European Technology Mobility Route Atlas

## Status and interpretation

This atlas tracks research readiness, not product availability. `R1` means a current official administrative source has been structured; it does not mean controlling law, expert review or production tests are complete. `R0` means only discovery evidence exists. No market below `R3` may be marketed as supported.

| Market         | Priority route(s) for initial tech persona                    | Current decisive inputs identified                                                                    | Research level | Critical missing chain                                                                              | Safe product state                                 |
| -------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Germany        | EU Blue Card                                                  | Salary; shortage/new entrant; qualification or ICT experience; job match                              | R1             | Residence Act provisions, BA approval boundaries, qualification recognition and edge cases          | Prototype conditional assessment                   |
| Netherlands    | Highly Skilled Migrant; EU Blue Card                          | Recognised sponsor; age/context salary; market rate; contract                                         | R1             | Aliases/subsidiaries, register history, legal source chain, market-rate evidence                    | Exact sponsor lookup plus provisional screen       |
| Ireland        | Critical Skills Employment Permit                             | Occupation/specialism; degree; remuneration; 2-year offer; employer facts                             | R1-conflicted  | Resolve €40,904/€40,909 and €36,848/€36,849 discrepancy against SI; 50% rule exceptions             | No pass/fail near disputed boundary                |
| France         | Talent—EU Blue Card and qualified employee/innovative company | Route; contract; salary; degree/experience; employer context                                          | R1             | Current decrees, route naming, salary effective history, bilingual expert review                    | Route education and evidence checklist             |
| Sweden         | EU Blue Card                                                  | 180 credits or five years; six-month contract; SEK 53,625 from 15 July 2026; insurance context        | R1             | Legislative chain, ordinary work-permit comparison, employer-deficiency cases                       | Effective-dated prototype screen                   |
| Spain          | HQP national permit; EU Blue Card                             | Route; qualification/experience; ICT 3-in-7 experience; offer; employer submission                    | R1-conflicted  | Exact 2026 salary order/update and applicability; national-v-Blue-Card decision tree                | Evidence readiness only                            |
| Austria        | EU Blue Card; Red-White-Red                                   | Route; salary; degree or ICT experience; matching offer; points/labour test where applicable          | R1             | Legislative provisions, special-payment parsing, points route edge cases                            | Route comparison with provisional calculations     |
| Denmark        | Pay Limit; Supplementary Pay Limit; Positive List; Fast-track | Scheme; annual salary; application date; occupation/list; employer certification                      | R1             | Complete scheme conditions, salary components, Positive Lists, certified employer register          | Route shortlist; no merged eligibility result      |
| Finland        | Specialist; EU Blue Card                                      | Expert duty; EUR 3,937/month; confirmed work; degree/experience                                       | R1             | Blue Card differential, collective-agreement interaction, legal chain                               | Conditional specialist screen                      |
| Belgium        | Regional single permit; EU Blue Card                          | Work region; salary; duration; qualification; federal residence dependency                            | R1-partial     | Complete Brussels/Wallonia 2026 chains, Statbel update dependency and cross-region cases            | Region question then information only              |
| Luxembourg     | EU Blue Card                                                  | Six-month contract; EUR 65,652; qualification; ADEM vacancy declaration                               | R1             | Current grand-ducal regulation and change history                                                   | Provisional high-confidence checklist              |
| Portugal       | Highly Qualified Activity; Tech Visa; EU Blue Card            | Route; occupation; salary; employer; administrative status                                            | R1-stale-risk  | Current legal salary values; Tech Visa certified firms; operational/backlog validation              | Document navigation only                           |
| Estonia        | Top specialist; EU Blue Card; start-up pathway                | Top-specialist 1.5× salary coefficient; employer register/age/capital conditions; route               | R1-partial     | Current Statistics Estonia value, administrative guidance, Blue Card/start-up chains                | Formula/checklist only; no numeric result          |
| Poland         | EU Blue Card                                                  | Six-month contract; 150% prior-year average; PLN 160,264.08 for 2026; qualification/experience        | R1             | 2026 regulations, local surplus lists, full electronic MOS workflow, employer annex                 | Prototype with local-list unknown                  |
| Czechia        | EU Blue Card; Employee Card                                   | Route; vacancy identifier; qualification/experience; 1.5× average salary; contract                    | R1             | Exact 2026 salary value, statistical source/effective date, legislation and vacancy dataset history | Provisional checklist; no numeric threshold result |
| Italy          | EU Blue Card                                                  | Offer; qualification or five-year experience/ICT 3-in-7; employer clearance                           | R1-partial     | Current salary formula/value, collective agreement and employer procedure chain                     | Evidence checklist only                            |
| Lithuania      | EU Blue Card/high-skilled permit                              | 1.2× shortage or 1.5× wage; six-month offer; qualification or ICT 3-in-7 experience                   | R1-partial     | Current wage value, shortage list, Migration Department workflow and law-version review             | Formula/checklist only; no numeric result          |
| Norway         | Skilled worker                                                | Qualification; offer; job-skill match; normal terms; degree-level pay benchmarks; employer confirmation | R1           | Sector/collective rules, benchmark history, legal chain and exception evidence                      | Conditional screen; review below benchmark          |
| Switzerland    | Third-country highly qualified permit                         | Qualification; employer labour-market proof; customary terms; quota; canton                           | R1             | Cantonal procedures, quota state, precedence evidence and sector practice                           | Manual/expert review required                      |
| United Kingdom | Skilled Worker                                                | Licensed sponsor; occupation; salary/going rate; candidate facts                                      | R1-regulated   | Written IAA scope opinion, current rules/occupation tables, permitted output language               | General information and sponsor facts only         |

## Cross-market rule primitives

The atlas reduces country prose into reusable, versionable primitives:

| Primitive                | Examples                                                              | Data requirement                                                              |
| ------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Fixed threshold          | Netherlands, Finland, Luxembourg                                      | Currency, period, qualifying components, effective dates                      |
| Statistical multiple     | Sweden, Poland, Portugal                                              | Published statistic, multiplier, reference period and rounding                |
| Age/graduate reduction   | Netherlands, Germany, Ireland                                         | Exact event/date, qualifying institution/award and application timing         |
| Experience substitute    | Germany, Spain, Austria, Poland, Italy                                | Duration, lookback window, occupation, level and evidence quality             |
| Occupation list          | Germany shortage list, Ireland Critical Skills, Denmark Positive List | Taxonomy version, exact specialism, valid-from/to and mapping confidence      |
| Sponsor register         | Netherlands, UK                                                       | Authority snapshot, legal identifier, status, match method and retrieved time |
| Employer certification   | Denmark Fast-track and route-specific schemes                         | Certification scope, validity and legal entity                                |
| Labour-market test       | Switzerland and selected national routes                              | Applicable exemption, employer evidence and authority outcome                 |
| Regional rule            | Belgium, Switzerland                                                  | Work location, authority hierarchy and shared federal dependencies            |
| Contract duration        | Commonly six months; Ireland CSEP normally two years                  | Start/end, guaranteed duration, hours and employer identity                   |
| Compensation composition | Netherlands, Denmark, Austria, Ireland, Finland                       | Base, fixed allowances, bonuses, equity, holiday pay, pension, frequency      |
| Regulated profession     | Cross-market                                                          | Profession, competent body, recognition state and jurisdiction                |

## Why one generic eligibility score fails

A single score hides categorical gates and different authorities. A candidate may exceed salary but lack a recognised Dutch sponsor; have enough Austrian points but no matching offer; appear on an Irish broad occupation family but lack the required specialism; or meet Swiss qualifications while the employer cannot satisfy labour-market priority. AutoTime should return route-specific states and decisive reasons, never average incompatible gates into one reassuring number.

## Promotion requirements

To promote a market from R1 to R2:

1. complete controlling-law and administrative-source chains;
2. resolve or explicitly govern every material contradiction;
3. version all amounts, lists and taxonomies;
4. encode at least 30 ordinary, 10 boundary and 10 adversarial cases;
5. complete independent second-person review;
6. demonstrate decision replay and safe abstention.

R3 additionally requires scoped jurisdiction-expert sign-off, permitted-output review and expiry/review dates. R4 requires production monitoring history and observed corrections/outcomes.
