-- Install the production ingestion and alert schedules only when the required
-- Vault values were configured previously. Secret values never enter source.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault;

do $$
declare
  function_base_url text;
  cron_secret text;
  existing_job record;
begin
  select decrypted_secret
    into function_base_url
    from vault.decrypted_secrets
   where name = 'job_sync_function_base_url'
   limit 1;

  select decrypted_secret
    into cron_secret
    from vault.decrypted_secrets
   where name = 'job_sync_cron_secret'
   limit 1;

  if nullif(trim(function_base_url), '') is null then
    raise exception 'Vault secret job_sync_function_base_url must be configured before scheduling';
  end if;

  if nullif(trim(cron_secret), '') is null then
    raise exception 'Vault secret job_sync_cron_secret must be configured before scheduling';
  end if;

  for existing_job in
    select jobid
      from cron.job
     where jobname in (
       'autotime-eures-daily',
       'autotime-ats-aggregators-daily',
       'autotime-matched-job-alerts-daily'
     )
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'autotime-eures-daily',
    '17 3 * * *',
    $schedule$select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'job_sync_function_base_url') || '/sync-eures',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'job_sync_cron_secret'),
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'job_sync_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );$schedule$
  );

  perform cron.schedule(
    'autotime-ats-aggregators-daily',
    '47 3 * * *',
    $schedule$select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'job_sync_function_base_url') || '/sync-job-sources',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'job_sync_cron_secret'),
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'job_sync_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );$schedule$
  );

  perform cron.schedule(
    'autotime-matched-job-alerts-daily',
    '17 4 * * *',
    $schedule$select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'job_sync_function_base_url') || '/sync-job-alerts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'job_sync_cron_secret'),
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'job_sync_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );$schedule$
  );
end
$$;
