update public.applications
set status = case
  when status = 'Applying' then 'Ready to apply'
  when status = 'Closed' then 'Archived'
  else status
end
where status in ('Applying', 'Closed');

update public.outcome_records
set status = case
  when status = 'Applying' then 'Ready to apply'
  when status = 'Closed' then 'Archived'
  else status
end
where status in ('Applying', 'Closed');

alter table public.applications
drop constraint if exists applications_status_check;

alter table public.applications
add constraint applications_status_check
check (
  status in (
    'Saved',
    'Checking fit',
    'Ready to apply',
    'Applied',
    'Interview',
    'Offer',
    'Rejected',
    'Archived'
  )
);

alter table public.outcome_records
drop constraint if exists outcome_records_status_check;

alter table public.outcome_records
add constraint outcome_records_status_check
check (
  status in (
    'Saved',
    'Checking fit',
    'Ready to apply',
    'Applied',
    'Interview',
    'Offer',
    'Rejected',
    'Archived'
  )
);
