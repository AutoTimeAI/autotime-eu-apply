# Release candidate record

## Candidate under remediation

- Product: AutoTime AI / AutoTime EU Apply
- Baseline tag: `v1.0.0`
- Baseline commit: `d980c53aacbbfa26898891444c1899c51e9a54aa`
- Remediation branch: `remediation/private-beta-v1.0.1`
- Candidate commit: not frozen
- Evidence root: not assigned until the candidate commit is frozen
- Deployment: not deployed
- Decision: **NO-GO**

The baseline deployment was independently confirmed to match the baseline commit. Any remediation commit is a different release candidate and must receive a new tag, deployment, SHA comparison, and full verification. Evidence generated before the candidate is frozen is working evidence only and cannot support a final PASS.

## Freeze procedure

1. Commit all approved code, tests, and assurance documents.
2. Record the resulting 40-character commit as the tested SHA.
3. Create `test-evidence/<tested-sha>/` and execute the manifest without source changes.
4. Commit evidence separately; the tested SHA remains the frozen application commit.
5. Deploy the frozen application commit and independently compare provider Git SHA to it.
6. Use a new release-candidate tag; never move or reuse `v1.0.0`.

Founder GO sign-off and beta invitations are prohibited while any mandatory gate is not PASS.
