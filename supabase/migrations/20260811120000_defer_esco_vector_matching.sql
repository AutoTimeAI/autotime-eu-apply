-- MVP matching uses transparent essential-skill overlap only.
-- Vector similarity is intentionally deferred until an embedding lifecycle,
-- model/version metadata, backfill strategy, and quota controls are designed.
drop function if exists public.match_esco_jobs(uuid, extensions.vector, integer);

alter table public.job_listings drop column if exists embedding;
alter table public.esco_skills drop column if exists embedding;
alter table public.esco_occupations drop column if exists embedding;

create or replace function public.match_esco_jobs(p_user_id uuid, p_limit integer default 50)
returns table(job_id uuid, title text, company text, location text, matched_skills bigint, total_essential_skills bigint, matched_skill_labels text[], missing_skill_labels text[], overlap numeric)
language sql stable security invoker set search_path=public as $$
  select jl.id, jl.title, jl.company, jl.location,
    count(usp.esco_skill_id) filter(where usp.confidence>0.5), count(eos.skill_id),
    coalesce(array_agg(es.preferred_label order by es.preferred_label) filter(where usp.confidence>0.5),'{}'),
    coalesce(array_agg(es.preferred_label order by es.preferred_label) filter(where usp.esco_skill_id is null or usp.confidence<=0.5),'{}'),
    count(usp.esco_skill_id) filter(where usp.confidence>0.5)::numeric/nullif(count(eos.skill_id),0)
  from job_listings jl
  join esco_occupation_skills eos on eos.occupation_id=jl.esco_occupation_id and eos.relation_type='essential'
  join esco_skills es on es.id=eos.skill_id
  left join user_skill_profile usp on usp.esco_skill_id=eos.skill_id and usp.user_id=p_user_id
  group by jl.id
  order by 9 desc nulls last, max(jl.posted_date) desc nulls last
  limit greatest(1,least(p_limit,100));
$$;

grant execute on function public.match_esco_jobs(uuid,integer) to authenticated;
