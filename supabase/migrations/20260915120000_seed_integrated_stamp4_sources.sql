-- Register the official pages that support the sponsorship rules imported
-- from Stamp4. The existing daily monitor creates immutable source versions,
-- detects normalized-content changes, and quarantines linked critical rules.

begin;

insert into public.mobility_source_documents (
  canonical_url, publisher, jurisdiction, source_class
) values
  (
    'https://www.gov.uk/skilled-worker-visa/your-job',
    'Home Office / UK Visas and Immigration',
    'United Kingdom',
    'administrative_guidance'
  ),
  (
    'https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/permit-types/critical-skills-employment-permit/',
    'Department of Enterprise, Tourism and Employment',
    'Ireland',
    'amount_or_statistic'
  ),
  (
    'https://ind.nl/en/required-amounts-income-requirements',
    'Immigration and Naturalisation Service',
    'Netherlands',
    'amount_or_statistic'
  ),
  (
    'https://www.make-it-in-germany.com/en/visa-residence/types/eu-blue-card',
    'Federal Government of Germany',
    'Germany',
    'amount_or_statistic'
  )
on conflict (canonical_url) do nothing;

commit;
