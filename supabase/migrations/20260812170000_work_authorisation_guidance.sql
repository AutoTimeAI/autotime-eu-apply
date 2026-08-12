alter table public.profiles add column if not exists work_authorisation_category text
  check (work_authorisation_category in ('eu_eea_swiss_citizen','existing_permission','sponsorship_required','country_specific','unsure'));
alter table public.profiles drop constraint if exists profiles_onboarding_step_check;
alter table public.profiles add constraint profiles_onboarding_step_check check (onboarding_step between 0 and 6);
