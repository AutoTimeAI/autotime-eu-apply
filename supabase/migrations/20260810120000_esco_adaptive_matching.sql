create extension if not exists vector with schema extensions;

create table if not exists public.esco_skills (
  id text primary key, preferred_label text not null, alt_labels text[] not null default '{}',
  skill_type text, language text not null default 'en', embedding extensions.vector(1536)
);
create table if not exists public.esco_occupations (
  id text primary key, preferred_label text not null, isco_group text,
  description text, language text not null default 'en', embedding extensions.vector(1536)
);
create table if not exists public.esco_occupation_skills (
  occupation_id text not null references public.esco_occupations(id) on delete cascade,
  skill_id text not null references public.esco_skills(id) on delete cascade,
  relation_type text not null check (relation_type in ('essential','optional')),
  primary key (occupation_id, skill_id)
);
create table if not exists public.user_skill_profile (
  user_id uuid not null references auth.users(id) on delete cascade,
  esco_skill_id text not null references public.esco_skills(id),
  confidence numeric not null check (confidence between 0 and 1),
  source text not null check (source in ('stated','inferred','confirmed')),
  updated_at timestamptz not null default now(), primary key (user_id, esco_skill_id)
);
create table if not exists public.esco_questionnaire_answers (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  question text not null, answer text not null, sequence integer not null check (sequence between 1 and 6),
  next_question text,
  created_at timestamptz not null default now(), unique(user_id, sequence)
);
alter table public.job_listings add column if not exists esco_occupation_id text references public.esco_occupations(id);
alter table public.job_listings add column if not exists embedding extensions.vector(1536);
create index if not exists esco_occupation_skills_skill_idx on public.esco_occupation_skills(skill_id, relation_type);
create index if not exists user_skill_profile_user_idx on public.user_skill_profile(user_id, confidence desc);
create index if not exists job_listings_esco_idx on public.job_listings(esco_occupation_id);

alter table public.esco_skills enable row level security;
alter table public.esco_occupations enable row level security;
alter table public.esco_occupation_skills enable row level security;
alter table public.user_skill_profile enable row level security;
alter table public.esco_questionnaire_answers enable row level security;
create policy "esco_skills_authenticated_read" on public.esco_skills for select to authenticated using (true);
create policy "esco_occupations_authenticated_read" on public.esco_occupations for select to authenticated using (true);
create policy "esco_relations_authenticated_read" on public.esco_occupation_skills for select to authenticated using (true);
create policy "user_skill_profile_own" on public.user_skill_profile for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "esco_questionnaire_answers_own" on public.esco_questionnaire_answers for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

create or replace function public.match_esco_jobs(p_user_id uuid, p_query_embedding extensions.vector(1536) default null, p_limit integer default 50)
returns table(job_id uuid, title text, company text, location text, matched_skills bigint, total_essential_skills bigint, matched_skill_labels text[], missing_skill_labels text[], overlap numeric, embedding_similarity double precision)
language sql stable security invoker set search_path=public,extensions as $$
  select jl.id, jl.title, jl.company, jl.location,
    count(usp.esco_skill_id) filter(where usp.confidence>0.5), count(eos.skill_id),
    coalesce(array_agg(es.preferred_label order by es.preferred_label) filter(where usp.confidence>0.5),'{}'),
    coalesce(array_agg(es.preferred_label order by es.preferred_label) filter(where usp.esco_skill_id is null or usp.confidence<=0.5),'{}'),
    count(usp.esco_skill_id) filter(where usp.confidence>0.5)::numeric/nullif(count(eos.skill_id),0),
    case when p_query_embedding is not null and jl.embedding is not null then 1-(jl.embedding<=>p_query_embedding) else null end
  from job_listings jl join esco_occupation_skills eos on eos.occupation_id=jl.esco_occupation_id and eos.relation_type='essential'
  join esco_skills es on es.id=eos.skill_id left join user_skill_profile usp on usp.esco_skill_id=eos.skill_id and usp.user_id=p_user_id
  group by jl.id order by 9 desc nulls last, 10 desc nulls last limit greatest(1,least(p_limit,100));
$$;
grant execute on function public.match_esco_jobs(uuid,extensions.vector,integer) to authenticated;

create or replace function public.classify_job_listings_esco(p_limit integer default 1000)
returns integer language plpgsql security definer set search_path=public as $$
declare changed integer;
begin
  with candidates as (
    select jl.id, eo.id occupation_id,
      row_number() over(partition by jl.id order by
        case when regexp_replace(lower(jl.title),'[^a-z0-9]+','','g')=regexp_replace(lower(eo.preferred_label),'[^a-z0-9]+','','g') then 0 else 1 end,
        length(eo.preferred_label) desc) rank
    from job_listings jl join esco_occupations eo on
      regexp_replace(lower(jl.title),'[^a-z0-9]+','','g')=regexp_replace(lower(eo.preferred_label),'[^a-z0-9]+','','g')
      or lower(jl.title) like '%'||lower(eo.preferred_label)||'%'
    where jl.esco_occupation_id is null limit greatest(1,least(p_limit,5000))
  ) update job_listings jl set esco_occupation_id=c.occupation_id from candidates c where jl.id=c.id and c.rank=1;
  get diagnostics changed = row_count; return changed;
end;$$;
revoke all on function public.classify_job_listings_esco(integer) from public, anon, authenticated;
