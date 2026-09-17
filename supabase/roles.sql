-- Local-development globals loaded before migrations by `supabase db reset`.
-- These non-production placeholders let the cron migration validate its Vault
-- dependencies without contacting an external service.
select vault.create_secret(
  'http://host.docker.internal:54321/functions/v1',
  'job_sync_function_base_url',
  'Local Supabase Edge Functions base URL'
)
where not exists (
  select 1 from vault.decrypted_secrets where name = 'job_sync_function_base_url'
);

select vault.create_secret(
  'local-reset-placeholder-not-for-production',
  'job_sync_cron_secret',
  'Local-only cron authentication placeholder'
)
where not exists (
  select 1 from vault.decrypted_secrets where name = 'job_sync_cron_secret'
);
