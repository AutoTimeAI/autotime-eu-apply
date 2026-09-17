-- Read-only production/staging preflight for the complete mobility moat migration chain.
-- Returns metadata only; it does not read candidate, vacancy, decision or learning rows.
with expected(table_name) as (values
  ('mobility_source_documents'), ('mobility_source_versions'), ('mobility_source_spans'),
  ('mobility_claims'), ('mobility_claim_versions'), ('mobility_claim_source_spans'),
  ('mobility_rule_bundles'), ('mobility_rule_bundle_versions'), ('mobility_rule_claim_links'),
  ('mobility_expert_signoffs'), ('mobility_rule_bundle_activations'),
  ('mobility_candidate_evidence_items'), ('mobility_candidate_evidence_versions'),
  ('mobility_vacancy_snapshots'), ('mobility_employer_registers'),
  ('mobility_employer_register_versions'), ('mobility_employer_register_rows'),
  ('mobility_employer_verifications'), ('mobility_decision_records'),
  ('mobility_decision_evidence_links'), ('mobility_decision_corrections'), ('mobility_decision_replays'),
  ('mobility_source_change_events'), ('mobility_country_readiness_snapshots'),
  ('mobility_learning_consents'), ('mobility_learning_events'),
  ('mobility_learning_experiments'), ('mobility_learning_experiment_events'),
  ('mobility_learning_assignments'), ('mobility_learning_evaluation_runs')
)
select e.table_name,
  to_regclass('public.' || e.table_name) is not null as exists,
  coalesce(c.relrowsecurity, false) as rls_enabled,
  not exists (
    select 1 from information_schema.role_table_grants g
    where g.table_schema = 'public' and g.table_name = e.table_name
      and g.grantee in ('anon', 'authenticated')
  ) as browser_roles_revoked
from expected e
left join pg_class c on c.oid = to_regclass('public.' || e.table_name)
order by e.table_name;

select version, statements is not null as recorded
from supabase_migrations.schema_migrations
where version in ('20260912120000', '20260912130000', '20260912140000', '20260912150000', '20260912160000')
order by version;

select routine_name, routine_type
from information_schema.routines
where routine_schema = 'public' and routine_name in (
  'reject_mobility_immutable_mutation', 'reject_mobility_version_update',
  'validate_mobility_learning_event', 'append_mobility_learning_consent'
)
order by routine_name;

select event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where event_object_schema = 'public' and event_object_table like 'mobility_%'
order by event_object_table, trigger_name, event_manipulation;

select country_code, state, output_permission, rule_bundle_version_id,
  expert_signoff_id is not null as has_expert_signoff, evaluated_at
from public.mobility_country_readiness_snapshots
where country_code in ('DE', 'NL')
order by country_code, evaluated_at desc;
