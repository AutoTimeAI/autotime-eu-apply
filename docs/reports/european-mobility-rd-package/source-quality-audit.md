# Source Quality Audit

**Audit date:** 10 September 2026

## Inventory result

The ledger contains 72 records and 16 required fields. Source IDs are unique. The evidence-level
distribution is 65 R1 and 7 R0; no source cluster or country is yet R2/R3. The composition is:

| Source class                                | Count | Permitted use                                                           |
| ------------------------------------------- | ----: | ----------------------------------------------------------------------- |
| Official national guidance                  |    34 | Route claims, subject to law reconciliation                             |
| Vendor-primary pages                        |    12 | Competitor claims only                                                  |
| EU official guidance                        |     7 | Framework/orientation; national implementation may supersede detail     |
| Regulator guidance                          |     5 | Regulatory claims, subject to product-specific counsel application      |
| Primary law                                 |     5 | Controlling legal propositions, with expert interpretation where needed |
| Official notices                            |     3 | Dated parameters and administrative changes                             |
| Official registers                          |     2 | Narrow assertions defined by the register                               |
| Official circular/dataset/report/statistics |     4 | Topic-specific supporting claims                                        |

Seventy-one rows record a known gap. This is not a failure of the ledger: it prevents discovery-level
sources from silently becoming production authority. It does mean the current package is a research
portfolio, not a legal knowledge base ready for automated conclusions.

`source-coverage-by-market.csv` makes the imbalance explicit. France, Austria, Luxembourg, Norway,
Poland, Sweden and Switzerland currently have only one ledger source each; none can support a
production rule pack from that source alone. Germany has the strongest law-linked beachhead chain,
the Netherlands has the strongest competent-authority operational chain, and Spain has the strongest
captured threshold-change chain outside the beachhead. These are depth observations, not release
ratings.

## Reliability defects found

1. **Guidance dominance.** Fifty-three of 72 sources are national/EU guidance or vendor pages; only
   five are primary-law records. Marketed routes require a law-to-guidance reconciliation.
2. **Current-page/stale-value risk.** Spain, Portugal, Belgium, Italy and Lithuania contain examples
   where update metadata does not guarantee current embedded numbers.
3. **Country aggregation risk.** Belgium is regional/federal; Netherlands HSM and Blue Card differ;
   German Blue Card and practical-experience routes differ. Country-wide rule values are unsafe.
4. **Register-semantic risk.** A sponsor-register match supports only the register's defined legal
   assertion, not willingness to sponsor a vacancy.
5. **Vendor-evidence risk.** Competitive capability, coverage and performance statements are vendor
   claims until independently exercised.
6. **Language risk.** English guidance is useful operationally but may not control over national law.
7. **Temporal risk.** Annual thresholds, monthly registers, occupation lists and administrative
   interpretations require different monitoring cadences.

## Source promotion protocol

Promote a claim cluster from R1 to R2 only when:

- controlling law/instrument and competent-authority guidance are both captured;
- applicability, exceptions, effective date and supersession are reconciled;
- the exact source content or lawful snapshot is hash-addressable;
- a second reviewer verifies the extraction and mapping;
- positive, negative, boundary, missing and conflicting cases pass; and
- unresolved interpretation is converted to an abstention or expert question.

Promote a rule bundle to R3 only when a qualified jurisdiction reviewer signs the bundle version,
source revision set, test-corpus hash, output language and review expiry.

## Monitoring tiers

| Tier     | Source type                                                     | Check cadence                               | Response target                                            |
| -------- | --------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| Critical | Threshold notice, law change, sponsor register, occupation list | Daily/weekly/monthly according to publisher | Triage within one business day of detected material change |
| High     | Route guidance, application requirements, regulator guidance    | Weekly                                      | Triage within two business days                            |
| Medium   | Statistical datasets and market reports                         | Monthly/quarterly                           | Update planning model, not live decisions                  |
| Low      | Vendor pages and positioning claims                             | Quarterly                                   | Update threat/price matrix                                 |

HTTP change alone is not a legal change. The detector creates a candidate diff; a reviewer classifies
materiality, affected claims/rules, effective date and required replay.

## Immediate primary-source backlog

Priority 0 is the Germany/Netherlands corridor: complete the German statutory instrument/annual
threshold publication chain, relevant employment-regulation provisions, Dutch-language legal basis
for HSM/Blue Card, IND implementation guidance and register revision capture. Priority 1 is the
France, Spain, Ireland and Sweden routes selected for next validation. Other markets remain R1 until
commercial evidence justifies their source-operations cost.

## Audit controls

- CI rejects duplicate IDs, missing mandatory fields and production rules with R0/R1-only claims.
- URLs are availability-checked, but availability never substitutes for semantic review.
- A source revision stores retrieval time, content hash, language, publisher metadata and parsing
  result.
- A claim cannot silently relink to a newer revision.
- Superseded facts remain available for historical replay.
- Vendor sources cannot satisfy legal-rule evidence requirements.
- The market status is computed from the weakest mandatory gate, not manually promoted.
