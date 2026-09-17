-- A placeholder rule-bundle-version purely so that decision recording (the
-- LandWell validation pilot's evaluation corpus) has a valid, non-null
-- mobility_rule_bundle_versions row to reference. Deliberately staged in
-- 'draft' state and never activated: it is never written into
-- mobility_rule_bundle_current, never read by loadCurrentMobilityReadiness
-- (which only queries mobility_country_readiness_snapshots), and therefore
-- can never affect a real governed decision or block a real candidate's
-- recommendation. It exists solely to satisfy the NOT NULL foreign key on
-- mobility_decision_records.rule_bundle_version_id for pilot-recorded rows.
begin;

insert into public.mobility_rule_bundles (id, jurisdiction, route)
values ('pilot-observation', 'ZZ', 'validation-pilot-observation-only')
on conflict (id) do nothing;

insert into public.mobility_rule_bundle_versions (
  bundle_id, version, state, rules, evaluation_case_ids
) values (
  'pilot-observation', 1, 'draft', '{}'::jsonb, array['pilot-observation-placeholder']
)
on conflict (bundle_id, version) do nothing;

commit;
