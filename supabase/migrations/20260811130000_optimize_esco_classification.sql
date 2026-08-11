create or replace function public.classify_job_listings_esco(p_limit integer default 100)
returns integer language plpgsql security definer set search_path=public as $$
declare changed integer;
begin
  with candidate_jobs as (
    select jl.id, jl.title
    from job_listings jl
    where jl.esco_occupation_id is null
    order by jl.created_at
    limit greatest(1,least(p_limit,500))
  ), candidates as (
    select job.id, occupation.id occupation_id
    from candidate_jobs job
    cross join lateral (
      select eo.id
      from esco_occupations eo
      where regexp_replace(lower(job.title),'[^a-z0-9]+','','g')=regexp_replace(lower(eo.preferred_label),'[^a-z0-9]+','','g')
         or lower(job.title) like '%'||lower(eo.preferred_label)||'%'
      order by
        case when regexp_replace(lower(job.title),'[^a-z0-9]+','','g')=regexp_replace(lower(eo.preferred_label),'[^a-z0-9]+','','g') then 0 else 1 end,
        length(eo.preferred_label) desc
      limit 1
    ) occupation
  )
  update job_listings jl set esco_occupation_id=c.occupation_id
  from candidates c where jl.id=c.id;
  get diagnostics changed = row_count;
  return changed;
end;$$;

revoke all on function public.classify_job_listings_esco(integer) from public, anon, authenticated;
