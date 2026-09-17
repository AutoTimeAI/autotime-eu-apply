# Staging verification pack — ready to run once `autotime-private-beta-staging` is unpaused

## Purpose

Closes the "Unknown"/"Not Deployed" evidence gaps recorded in
[before-after-production-diff.md](before-after-production-diff.md) (CID-2026-008
through CID-2026-012). All steps here are **read-only** or write only
synthetic, clearly-labelled non-production rows — no real candidate data, and
nothing here promotes any rule bundle to `active` or writes a real expert
sign-off.

Project ref: `lhnqriuwmyhmrdxhesnq` (autotime-private-beta-staging, West EU
Ireland). As of 2026-09-12 this project is **paused** — an admin must unpause
it from https://supabase.com/dashboard/project/lhnqriuwmyhmrdxhesnq before any
step below can run.

## Step 0 — link (read-only, stores config only)

```sh
supabase link --project-ref lhnqriuwmyhmrdxhesnq
```

Confirms the project is reachable. Does not modify the database.

## CID-2026-008 — are the new mobility migrations applied?

```sh
supabase migration list --linked
```

Expect all five to show as applied, matching local:

- `20260912120000_mobility_evidence_registry`
- `20260912130000_mobility_decision_provenance`
- `20260912140000_mobility_readiness_ledger`
- `20260912150000_mobility_learning_lineage`
- `20260912160000_mobility_learning_experiments`

If any are missing, do **not** run `supabase db push` as a first move —
diff first:

```sh
supabase db diff --linked --schema public
```

Also capture the deployment identity the CID pack asks for:

```sh
git rev-parse HEAD
```

and note whichever Vercel/hosting deployment is currently serving
`NEXT_PUBLIC_SUPABASE_URL` pointed at this project ref.

## CID-2026-009 — are governed decisions written/replayed?

Read-only row counts (redacted, no payload contents):

```sql
select count(*) from public.mobility_decision_records;
select count(*) from public.mobility_vacancy_snapshots;
select count(*) from public.mobility_decision_replays;
```

If `MOBILITY_GOVERNANCE_ENFORCEMENT_ENABLED` has never been set to `true` in
this environment (check the actual deployed env vars, not just
`.env.production.example`), expect all three counts to be `0` — that is the
correct current-state result, not a failure. To generate one real synthetic
decision as evidence, exercise `/api/ai/content` end-to-end with a synthetic
job/candidate against a project where the flag is `true`, then re-run the
counts and inspect one row's `canonical_output_sha256` for determinism by
recomputing the hash from `canonical_output` locally.

## CID-2026-010 — are sources monitored and quarantined?

```sql
select classification, count(*) from public.mobility_source_change_events group by 1;
```

No scheduler currently exists in the repo (`docs/reports/evidence-deep-rd-2026-09/engineering-implementation-gap-audit.md`
confirms "Absent"), so expect `0` rows. This query exists so the *next* time
this pack runs, a scheduler having been added is visible without re-reading
code.

## CID-2026-011 — are employer registers current?

```sql
select register_id, max(version), max(recorded_at) from public.mobility_employer_register_versions group by 1;
select state, count(*) from public.mobility_employer_verifications group by 1;
```

Expect empty — no register ingestion adapter exists yet
(`mobility-decision-writer.ts` hardcodes `employer_verification_id: null`).

## CID-2026-012 — does expert sign-off gate outputs?

```sql
select decision, count(*) from public.mobility_expert_signoffs group by 1;
select state, count(*) from public.mobility_rule_bundle_versions group by 1;
```

Expect `0` sign-offs and no bundle in `state = 'active'` — matches the local
DE/NL seed result (0 sign-offs, 0 activations) and confirms staging hasn't
diverged by having a real bundle activated without this pack's knowledge.

## Drills required by the CID verification-pack paragraph (not yet scripted)

These need a short synthetic-data script, not just a query — track as
follow-up work rather than running ad hoc against staging:

- **Replay equivalence drill**: insert one synthetic decision, replay it via
  the (not yet built) replay worker, assert `equivalent = true` in
  `mobility_decision_replays`.
- **Source-change quarantine drill**: insert a synthetic `mobility_source_change_events`
  row with `classification = 'material_content'`, confirm the fail-closed
  constraint forces `quarantine = true, review_required = true` (already
  enforced by `mobility_country_readiness_fail_closed`/`mobility_source_change_events_fail_closed`
  check constraints — this drill only needs to prove the constraint is live
  on staging, e.g. attempt an insert that violates it and confirm rejection).
- **Sign-off expiry/withdrawal drill**: insert a synthetic sign-off with
  `review_by` in the past, confirm no downstream code treats it as valid
  (there is currently no code path that reads `mobility_expert_signoffs` at
  all outside migrations/tests — this drill will fail until that reader
  exists, which is itself useful evidence).
- **Deletion cascade and recovery drill**: delete a synthetic
  `mobility_candidate_evidence_items` row for a test user, confirm
  `mobility_candidate_evidence_versions` cascade-deletes (`on delete cascade`
  in the migration) while `mobility_decision_records` for that user are
  retained per the immutability design (delete-only via
  `reject_mobility_version_update`, no cascade from candidate evidence to
  decisions).

## What this pack cannot prove

Per the CID doc's own boundary: a clean result here still does not establish
that real users generated any of this data, that the readiness thresholds are
legally correct, or that Sentry/Resend/Stripe integrations work — those need
their own environment-specific checks (Sentry event, Resend delivery, Stripe
checkout/webhook) that are out of scope for this pack.
