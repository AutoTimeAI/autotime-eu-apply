-- NON-PRODUCTION review seed. This is not a captured-source archive or expert approval.
begin;
insert into public.mobility_source_documents (id, canonical_url, publisher, jurisdiction, source_class) values
('de000000-0000-4000-8000-000000000001','https://www.make-it-in-germany.com/en/visa-residence/types/eu-blue-card','German Federal Government','Germany','administrative_guidance'),
('de000000-0000-4000-8000-000000000002','https://www.gesetze-im-internet.de/aufenthg_2004/__18g.html','German Federal Ministry of Justice','Germany','legislation'),
('aa000000-0000-4000-8000-000000000001','https://ind.nl/en/residence-permits/work/highly-skilled-migrant','IND','Netherlands','administrative_guidance'),
('aa000000-0000-4000-8000-000000000002','https://ind.nl/en/required-amounts-income-requirements','IND','Netherlands','amount_or_statistic'),
('aa000000-0000-4000-8000-000000000003','https://ind.nl/en/public-register-recognised-sponsors/public-register-work','IND','Netherlands','register_or_list');

insert into public.mobility_source_versions (id,source_document_id,version,retrieved_at,effective_from,language,http_status,raw_sha256,normalized_sha256,snapshot_uri,parser_version,normalizer_version) values
('de100000-0000-4000-8000-000000000001','de000000-0000-4000-8000-000000000001',1,'2026-09-11T00:00:00Z','2026-01-01T00:00:00Z','en',200,repeat('1',64),repeat('1',64),'local-seed://not-a-source-capture/de-blue-card','review-seed-1','review-seed-1'),
('de100000-0000-4000-8000-000000000002','de000000-0000-4000-8000-000000000002',1,'2026-09-11T00:00:00Z','2026-01-01T00:00:00Z','de',200,repeat('2',64),repeat('2',64),'local-seed://not-a-source-capture/de-law-18g','review-seed-1','review-seed-1'),
('aa100000-0000-4000-8000-000000000001','aa000000-0000-4000-8000-000000000001',1,'2026-09-11T00:00:00Z','2026-01-01T00:00:00Z','en',200,repeat('3',64),repeat('3',64),'local-seed://not-a-source-capture/nl-hsm','review-seed-1','review-seed-1'),
('aa100000-0000-4000-8000-000000000002','aa000000-0000-4000-8000-000000000002',1,'2026-09-11T00:00:00Z','2026-01-01T00:00:00Z','en',200,repeat('4',64),repeat('4',64),'local-seed://not-a-source-capture/nl-amounts','review-seed-1','review-seed-1'),
('aa100000-0000-4000-8000-000000000003','aa000000-0000-4000-8000-000000000003',1,'2026-09-11T00:00:00Z','2026-09-03T00:00:00Z','en',200,repeat('5',64),repeat('5',64),'local-seed://not-a-source-capture/nl-register','review-seed-1','review-seed-1');

insert into public.mobility_source_spans (id,source_version_id,locator,exact_text,exact_text_sha256) values
('de200000-0000-4000-8000-000000000001','de100000-0000-4000-8000-000000000001','R&D claim DE-002','2026 general and shortage salary thresholds require effective-dated verification.',encode(digest('2026 general and shortage salary thresholds require effective-dated verification.','sha256'),'hex')),
('de200000-0000-4000-8000-000000000002','de100000-0000-4000-8000-000000000002','R&D claim DE-LAW-002','The IT experience branch has occupation, recency, comparability and job-necessity predicates.',encode(digest('The IT experience branch has occupation, recency, comparability and job-necessity predicates.','sha256'),'hex')),
('de200000-0000-4000-8000-000000000003','de100000-0000-4000-8000-000000000002','R&D claim DE-LAW-003','The concrete job offer must meet the statutory duration predicate.',encode(digest('The concrete job offer must meet the statutory duration predicate.','sha256'),'hex')),
('aa200000-0000-4000-8000-000000000001','aa100000-0000-4000-8000-000000000001','R&D claim NL-001','Only an IND-recognised sponsor can apply under the HSM route.',encode(digest('Only an IND-recognised sponsor can apply under the HSM route.','sha256'),'hex')),
('aa200000-0000-4000-8000-000000000002','aa100000-0000-4000-8000-000000000002','R&D claim NL-002','Salary thresholds depend on age and application context.',encode(digest('Salary thresholds depend on age and application context.','sha256'),'hex')),
('aa200000-0000-4000-8000-000000000003','aa100000-0000-4000-8000-000000000003','R&D claim NL-REG-001','Sponsor verification requires the versioned legal-entity register.',encode(digest('Sponsor verification requires the versioned legal-entity register.','sha256'),'hex'));

insert into public.mobility_claims (id,jurisdiction,route_or_entity) values
('DE-002','Germany','EU Blue Card'),('DE-LAW-002','Germany','EU Blue Card IT experience'),('DE-LAW-003','Germany','EU Blue Card offer'),
('NL-001','Netherlands','Highly Skilled Migrant'),('NL-002','Netherlands','Highly Skilled Migrant'),('NL-REG-001','Netherlands','recognised sponsor register');
insert into public.mobility_claim_versions (id,claim_id,version,statement,claim_type,confidence,state,effective_from) values
('de300000-0000-4000-8000-000000000001','DE-002',1,'2026 general gross salary threshold is EUR 50,700; shortage/new-entrant threshold is EUR 45,934.20.','fact','high','review_required','2026-01-01T00:00:00Z'),
('de300000-0000-4000-8000-000000000002','DE-LAW-002',1,'The IT experience branch requires occupation, recency, comparability and job-necessity evidence.','fact','high','review_required','2026-01-01T00:00:00Z'),
('de300000-0000-4000-8000-000000000003','DE-LAW-003',1,'The concrete job offer must provide at least six months of employment.','fact','high','review_required','2026-01-01T00:00:00Z'),
('aa300000-0000-4000-8000-000000000001','NL-001',1,'Only an IND-recognised sponsor can apply under the Highly Skilled Migrant route.','fact','high','review_required','2026-01-01T00:00:00Z'),
('aa300000-0000-4000-8000-000000000002','NL-002',1,'2026 monthly gross thresholds excluding holiday pay vary by age and reduced-criterion context.','fact','high','review_required','2026-01-01T00:00:00Z'),
('aa300000-0000-4000-8000-000000000003','NL-REG-001',1,'Employer recognition must use a versioned IND work-sponsor register and exact legal entity.','derived_fact','high','review_required','2026-09-03T00:00:00Z');
insert into public.mobility_claim_source_spans select * from (values
('de300000-0000-4000-8000-000000000001'::uuid,'de200000-0000-4000-8000-000000000001'::uuid,'supports'),
('de300000-0000-4000-8000-000000000002','de200000-0000-4000-8000-000000000002','supports'),
('de300000-0000-4000-8000-000000000003','de200000-0000-4000-8000-000000000003','supports'),
('aa300000-0000-4000-8000-000000000001','aa200000-0000-4000-8000-000000000001','supports'),
('aa300000-0000-4000-8000-000000000002','aa200000-0000-4000-8000-000000000002','supports'),
('aa300000-0000-4000-8000-000000000003','aa200000-0000-4000-8000-000000000003','supports')) v(claim_version_id,source_span_id,relation);

insert into public.mobility_rule_bundles (id,jurisdiction,route) values ('de-eu-blue-card','Germany','EU Blue Card'),('nl-highly-skilled-migrant','Netherlands','Highly Skilled Migrant');
insert into public.mobility_rule_bundle_versions (id,bundle_id,version,state,rules,evaluation_case_ids,effective_from) values
('de400000-0000-4000-8000-000000000001','de-eu-blue-card',1,'review_required','{"mode":"review_seed","automation":"disabled"}',array['DE-BOUNDARY-001','DE-NEG-001','DE-ICT-001'],'2026-01-01T00:00:00Z'),
('aa400000-0000-4000-8000-000000000001','nl-highly-skilled-migrant',1,'review_required','{"mode":"review_seed","automation":"disabled"}',array['NL-SPONSOR-001','NL-SPONSOR-002'],'2026-01-01T00:00:00Z');
insert into public.mobility_rule_claim_links select * from (values
('de400000-0000-4000-8000-000000000001'::uuid,'de300000-0000-4000-8000-000000000001'::uuid,true),('de400000-0000-4000-8000-000000000001','de300000-0000-4000-8000-000000000002',true),('de400000-0000-4000-8000-000000000001','de300000-0000-4000-8000-000000000003',true),
('aa400000-0000-4000-8000-000000000001','aa300000-0000-4000-8000-000000000001',true),('aa400000-0000-4000-8000-000000000001','aa300000-0000-4000-8000-000000000002',true),('aa400000-0000-4000-8000-000000000001','aa300000-0000-4000-8000-000000000003',true)) v(rule_bundle_version_id,claim_version_id,critical);
insert into public.mobility_country_readiness_snapshots (country_code,rule_bundle_version_id,expert_signoff_id,state,score,output_permission,reason_codes,input_facts,evaluated_at) values
('DE','de400000-0000-4000-8000-000000000001',null,'information_only',35,'information_only',array['NON_PRODUCTION_REVIEW_SEED','SOURCE_CAPTURE_REQUIRED','EXPERT_SIGNOFF_ABSENT'],'{"automated":false,"expertReviewed":false,"realSourceCapture":false}','2026-09-12T00:00:00Z'),
('NL','aa400000-0000-4000-8000-000000000001',null,'information_only',35,'information_only',array['NON_PRODUCTION_REVIEW_SEED','SOURCE_CAPTURE_REQUIRED','EXPERT_SIGNOFF_ABSENT'],'{"automated":false,"expertReviewed":false,"realSourceCapture":false}','2026-09-12T00:00:00Z');
commit;
