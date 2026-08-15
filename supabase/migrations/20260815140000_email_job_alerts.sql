-- Phase 12: user-controlled matched-job digest cadence.

alter table public.profiles
  add column if not exists alert_frequency text not null default 'weekly'
    check (alert_frequency in ('daily', 'weekly', 'off')),
  add column if not exists alert_last_sent_at timestamptz;

create index if not exists profiles_job_alert_due_idx
  on public.profiles(alert_frequency, alert_last_sent_at)
  where alert_frequency <> 'off' and onboarding_completed_at is not null;

