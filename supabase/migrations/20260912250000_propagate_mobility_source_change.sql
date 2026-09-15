-- Atomically propagate material source changes into country readiness.

begin;

create function public.record_and_propagate_mobility_source_change(
  p_source_document_id uuid,
  p_previous_version_id uuid,
  p_observed_version_id uuid,
  p_observed_version jsonb,
  p_country_code text,
  p_classification text,
  p_quarantine boolean,
  p_review_required boolean,
  p_reason_codes text[],
  p_observed_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_event_id uuid;
  created_version_id uuid;
  affected_bundle record;
begin
  if p_country_code !~ '^[A-Z]{2}$' then
    raise exception using errcode = '22023', message = 'invalid source jurisdiction country code';
  end if;

  if p_observed_version is not null then
    insert into public.mobility_source_versions (
      source_document_id, version, retrieved_at, language, http_status,
      raw_sha256, normalized_sha256, snapshot_uri, redirect_chain,
      parser_version, normalizer_version
    ) values (
      p_source_document_id, (p_observed_version->>'version')::integer,
      p_observed_at, p_observed_version->>'language',
      (p_observed_version->>'httpStatus')::integer,
      p_observed_version->>'rawSha256', p_observed_version->>'normalizedSha256',
      p_observed_version->>'snapshotUri', '[]'::jsonb,
      p_observed_version->>'parserVersion', p_observed_version->>'normalizerVersion'
    ) returning id into created_version_id;
    p_observed_version_id := created_version_id;
  end if;

  insert into public.mobility_source_change_events (
    source_document_id, previous_version_id, observed_version_id,
    classification, quarantine, review_required, reason_codes, observed_at
  ) values (
    p_source_document_id, p_previous_version_id, p_observed_version_id,
    p_classification, p_quarantine, p_review_required, p_reason_codes, p_observed_at
  ) returning id into created_event_id;

  if p_quarantine then
    for affected_bundle in
      select distinct rule_link.rule_bundle_version_id
      from public.mobility_source_versions as source_version
      join public.mobility_source_spans as source_span
        on source_span.source_version_id = source_version.id
      join public.mobility_claim_source_spans as claim_source
        on claim_source.source_span_id = source_span.id
      join public.mobility_rule_claim_links as rule_link
        on rule_link.claim_version_id = claim_source.claim_version_id
      where source_version.source_document_id = p_source_document_id
        and rule_link.critical
    loop
      insert into public.mobility_country_readiness_snapshots (
        country_code, rule_bundle_version_id, expert_signoff_id,
        source_change_event_ids, state, score, output_permission,
        reason_codes, input_facts, evaluated_at
      ) values (
        p_country_code, affected_bundle.rule_bundle_version_id, null,
        array[created_event_id], 'quarantined', 0, 'blocked',
        array_append(p_reason_codes, 'CRITICAL_SOURCE_CHANGE'),
        jsonb_build_object(
          'sourceDocumentId', p_source_document_id,
          'sourceChangeEventId', created_event_id,
          'classification', p_classification,
          'automaticQuarantine', true
        ), p_observed_at
      );
    end loop;
  end if;

  return created_event_id;
end;
$$;

revoke all on function public.record_and_propagate_mobility_source_change(uuid, uuid, uuid, jsonb, text, text, boolean, boolean, text[], timestamptz) from public, anon, authenticated;
grant execute on function public.record_and_propagate_mobility_source_change(uuid, uuid, uuid, jsonb, text, text, boolean, boolean, text[], timestamptz) to service_role;

commit;
