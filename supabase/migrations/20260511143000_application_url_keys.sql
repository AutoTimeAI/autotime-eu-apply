-- Stable per-user application identity by canonical job URL.
-- This lets extension/dashboard retries upsert the same job even if the
-- browser generated a different local application id.

alter table public.applications
add column if not exists url_key text;

create or replace function public.autotime_normalize_application_url(input_url text)
returns text
language sql
immutable
as $$
  select nullif(
    lower(
      regexp_replace(
        regexp_replace(trim(coalesce(input_url, '')), '#.*$', ''),
        '/+$',
        ''
      )
    ),
    ''
  );
$$;

with keyed as (
  select
    id,
    public.autotime_normalize_application_url(url) as base_url_key,
    row_number() over (
      partition by user_id, public.autotime_normalize_application_url(url)
      order by created_at asc, id asc
    ) as duplicate_rank
  from public.applications
)
update public.applications applications
set url_key =
  case
    when keyed.base_url_key is null then applications.id::text
    when keyed.duplicate_rank = 1 then keyed.base_url_key
    else keyed.base_url_key || '#duplicate-' || applications.id::text
  end
from keyed
where applications.id = keyed.id
  and applications.url_key is null;

alter table public.applications
alter column url_key set not null;

create unique index if not exists applications_user_id_url_key_unique
  on public.applications(user_id, url_key);

create index if not exists applications_user_id_url_key_idx
  on public.applications(user_id, url_key);
