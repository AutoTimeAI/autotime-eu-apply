# CID investigation system

This directory is AutoTime EU Apply's independent Moat Investigation & Intelligence Director (CID) record. It answers a stricter question than “was code added?”: **what changed, what evidence proves it, what remains unproved, and what should the company test next?**

## Evidence states

These states are sequential and must not be collapsed:

| State | Test |
|---|---|
| Documented | A dated specification, finding or decision exists. |
| Implemented | Repository code and proportionate automated tests exist. |
| Deployed | The intended production environment has been directly verified. |
| Validated | Target users, qualified experts, transactions or operational outcomes provide evidence of value/accuracy. |

An item can be Implemented without being Deployed or Validated. “Unknown” is the required state when evidence is unavailable.

## Register map

- [CID charter](cid-agent-charter.md)
- [Baseline and comparison method](baseline-definition.md)
- [Repository before/after](before-after-repository-diff.md)
- [Production before/after](before-after-production-diff.md)
- [Findings register](findings-register.csv)
- [Assumptions and contradictions](assumptions-and-contradictions.md)
- [Adversarial moat review](moat-adversarial-review.md)
- [Ranked hypotheses](hypothesis-backlog.csv)
- [Experiment register](experiment-register.csv)
- [Current intelligence brief](monthly-intelligence-brief.md)

## Operating cadence

CID refreshes the repository comparison after a material mobility release, the production comparison after each deployment verification, and the intelligence brief monthly. Findings use immutable IDs (`CID-YYYY-NNN`); corrections supersede rather than silently rewrite material conclusions. Evidence paths refer to repository-relative files or immutable commit IDs. Owners update status only when the required evidence artifact exists.

## Current headline

As of 12 September 2026, the research and substantial engineering foundation exist. There is no evidence in this workspace proving that the new migrations run in production, live source monitoring operates, experts have signed off marketed guidance, or target users change decisions and achieve better outcomes. The moat is therefore a **credible, testable thesis**, not yet a demonstrated market moat.
