alter table public.company_ats_slugs
  drop constraint if exists company_ats_slugs_ats_platform_check;

alter table public.company_ats_slugs
  add constraint company_ats_slugs_ats_platform_check
  check (ats_platform in ('greenhouse', 'lever', 'ashby', 'personio', 'smartrecruiters'));
