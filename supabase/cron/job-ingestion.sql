-- Run manually in the production Supabase SQL editor after replacing both
-- placeholder values and confirming all required secrets. Do not commit values.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault;

select vault.create_secret('https://PROJECT_REF.supabase.co/functions/v1', 'job_sync_function_base_url');
select vault.create_secret('REPLACE_WITH_LONG_RANDOM_CRON_SECRET', 'job_sync_cron_secret');

select cron.schedule(
  'autotime-eures-daily',
  '17 3 * * *',
  $$select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'job_sync_function_base_url') || '/sync-eures',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'job_sync_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );$$
);
-- Direct ATS and licensed aggregators run daily, thirty minutes after EURES.
-- This is deliberately conservative; provider-specific loops also pause between calls.
select cron.schedule(
  'autotime-ats-aggregators-daily',
  '47 3 * * *',
  $$select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'job_sync_function_base_url') || '/sync-job-sources',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'job_sync_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );$$
);
