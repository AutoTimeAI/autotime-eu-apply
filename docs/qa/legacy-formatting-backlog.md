# Legacy formatting backlog

## Classification

The repository-wide Prettier check predates the private-beta remediation and
reports formatting drift across application, test, workflow, and documentation
files that this remediation did not otherwise change. Generated lockfiles,
screenshots, build output, browser reports, and release evidence are now ignored
because their owning tools define their format.

Remediation-touched source and configuration files must pass Prettier. Unrelated
tracked source remains visible to a repository-wide check and is not excluded or
mass-reformatted as part of security and release-assurance work.

## Risk decision

- Classification: non-critical maintainability risk, not a private-beta safety
  or functional release blocker by itself.
- Rationale: formatting drift does not change runtime behaviour; lint,
  typecheck, builds, security tests, and changed-file formatting remain mandatory.
- Owner: Engineering founder.
- Target date: 30 September 2026.
- Exit criterion: format legacy files in reviewable subsystem-sized commits and
  enable a repository-wide formatting gate after the backlog reaches zero.
