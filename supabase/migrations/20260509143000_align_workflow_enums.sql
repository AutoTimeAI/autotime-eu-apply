-- Align dashboard workflow constraints with shared application schemas.

alter table public.applications
drop constraint if exists applications_status_check;

alter table public.applications
add constraint applications_status_check
check (status in ('Saved', 'Applying', 'Applied', 'Interview', 'Rejected', 'Closed'));

alter table public.applications
drop constraint if exists applications_outcome_reason_check;

alter table public.applications
add constraint applications_outcome_reason_check
check (
  outcome_reason in (
    'Unknown',
    'Interview secured',
    'Offer or final stage',
    'No response',
    'Sponsorship blocker',
    'Work-right blocker',
    'Skill mismatch',
    'Location mismatch',
    'Role closed'
  )
);

alter table public.applications
drop constraint if exists applications_fit_decision_check;

alter table public.applications
add constraint applications_fit_decision_check
check (
  fit_decision is null or fit_decision in (
    'Apply now',
    'Stretch application',
    'Skip for now',
    'Improve profile first'
  )
);

alter table public.outcome_records
drop constraint if exists outcome_records_status_check;

alter table public.outcome_records
add constraint outcome_records_status_check
check (status in ('Saved', 'Applying', 'Applied', 'Interview', 'Rejected', 'Closed'));

alter table public.outcome_records
drop constraint if exists outcome_records_outcome_reason_check;

alter table public.outcome_records
add constraint outcome_records_outcome_reason_check
check (
  outcome_reason in (
    'Unknown',
    'Interview secured',
    'Offer or final stage',
    'No response',
    'Sponsorship blocker',
    'Work-right blocker',
    'Skill mismatch',
    'Location mismatch',
    'Role closed'
  )
);

alter table public.outcome_records
drop constraint if exists outcome_records_decision_label_at_save_check;

alter table public.outcome_records
add constraint outcome_records_decision_label_at_save_check
check (
  decision_label_at_save is null or decision_label_at_save in (
    'Apply now',
    'Stretch application',
    'Skip for now',
    'Improve profile first'
  )
);
