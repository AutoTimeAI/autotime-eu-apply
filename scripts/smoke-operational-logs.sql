create temp table autotime_operational_log_smoke_ids (
  id uuid primary key
) on commit drop;

create temp table autotime_operational_log_smoke_result (
  inserted boolean not null default false,
  read_back boolean not null default false,
  cleaned_up boolean not null default false
) on commit drop;

with inserted as (
  insert into public.operational_logs (
    level,
    area,
    code,
    message,
    metadata
  )
  values (
    'info',
    'verification',
    'operational_logs_smoke',
    'Temporary operational log smoke test.',
    '{"source":"codex-smoke"}'::jsonb
  )
  returning id
)
insert into autotime_operational_log_smoke_ids (id)
select id from inserted;

insert into autotime_operational_log_smoke_result (
  inserted,
  read_back,
  cleaned_up
)
values (
  (select count(*) from autotime_operational_log_smoke_ids) = 1,
  exists (
    select 1
    from public.operational_logs
    where id in (select id from autotime_operational_log_smoke_ids)
  ),
  false
);

with
deleted as (
  delete from public.operational_logs
  where id in (select id from autotime_operational_log_smoke_ids)
  returning id
)
update autotime_operational_log_smoke_result
set cleaned_up = (select count(*) from deleted) = 1;

select inserted, read_back, cleaned_up
from autotime_operational_log_smoke_result;
