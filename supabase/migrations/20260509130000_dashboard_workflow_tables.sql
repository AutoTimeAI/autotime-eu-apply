-- Dashboard workflow persistence.
-- Stores user-owned job workflow data that currently exists in the local
-- dashboard state: reusable answers, applications, evidence, outcomes and
-- interview prep packs. This does not enable auto-apply, scraping, or browser
-- automation.

create extension if not exists pgcrypto;

create table if not exists public.reusable_answers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sponsorship_answer text not null default '',
  relocation_answer text not null default '',
  work_authorisation_answer text not null default '',
  notice_period_answer text not null default '',
  salary_expectation_answer text not null default '',
  motivation_answer text not null default '',
  strengths_answer text not null default '',
  availability_answer text not null default '',
  source_surface text not null default 'web'
    check (source_surface in ('web', 'extension')),
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text not null default 'Manual dashboard entry',
  company text,
  role_title text,
  source text,
  status text not null default 'Saved'
    check (status in ('Saved', 'Applied', 'Interview', 'Rejected', 'Offer', 'Closed')),
  next_action text,
  next_action_date date,
  notes text,
  outcome_reason text not null default 'Unknown'
    check (
      outcome_reason in (
        'Unknown',
        'No response',
        'Rejected after application',
        'Rejected after interview',
        'Interview secured',
        'Offer or final stage',
        'Sponsorship blocker',
        'Work-right blocker',
        'Role mismatch',
        'Location mismatch',
        'Salary mismatch',
        'Withdrew',
        'Other'
      )
    ),
  fit_score integer check (fit_score is null or (fit_score >= 0 and fit_score <= 100)),
  fit_decision text check (
    fit_decision is null or fit_decision in (
      'Apply now',
      'Worth applying',
      'Stretch application',
      'Skip for now'
    )
  ),
  content_gate text check (
    content_gate is null or content_gate in ('ready', 'stretch', 'blocked')
  ),
  content_snapshot jsonb,
  job_snapshot jsonb,
  source_surface text not null default 'web'
    check (source_surface in ('web', 'extension')),
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_title_present check (length(trim(title)) > 0),
  constraint applications_url_present check (length(trim(url)) > 0),
  constraint applications_content_snapshot_object
    check (content_snapshot is null or jsonb_typeof(content_snapshot) = 'object'),
  constraint applications_job_snapshot_object
    check (job_snapshot is null or jsonb_typeof(job_snapshot) = 'object')
);

create table if not exists public.evidence_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  job_url text,
  check_key text not null,
  check_label text not null,
  status text not null check (status in ('found', 'missing', 'risk', 'limit')),
  evidence_text text not null,
  source_type text not null
    check (source_type in ('profile', 'cv', 'job_text', 'user_answer', 'official_source', 'system_rule')),
  source_label text not null,
  missing_input text,
  risk_flag text,
  explanation text not null,
  limit_text text not null,
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  constraint evidence_records_check_key_present check (length(trim(check_key)) > 0),
  constraint evidence_records_check_label_present check (length(trim(check_label)) > 0),
  constraint evidence_records_evidence_text_present check (length(trim(evidence_text)) > 0),
  constraint evidence_records_explanation_present check (length(trim(explanation)) > 0),
  constraint evidence_records_limit_present check (length(trim(limit_text)) > 0)
);

create table if not exists public.outcome_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  role_title text not null,
  company text,
  country text,
  source text,
  status text not null
    check (status in ('Saved', 'Applied', 'Interview', 'Rejected', 'Offer', 'Closed')),
  outcome_reason text not null
    check (
      outcome_reason in (
        'Unknown',
        'No response',
        'Rejected after application',
        'Rejected after interview',
        'Interview secured',
        'Offer or final stage',
        'Sponsorship blocker',
        'Work-right blocker',
        'Role mismatch',
        'Location mismatch',
        'Salary mismatch',
        'Withdrew',
        'Other'
      )
    ),
  decision_index_at_save integer
    check (decision_index_at_save is null or (decision_index_at_save >= 0 and decision_index_at_save <= 100)),
  decision_label_at_save text check (
    decision_label_at_save is null or decision_label_at_save in (
      'Apply now',
      'Worth applying',
      'Stretch application',
      'Skip for now'
    )
  ),
  content_gate_at_save text check (
    content_gate_at_save is null or content_gate_at_save in ('ready', 'stretch', 'blocked')
  ),
  applied_at timestamptz,
  interview_at timestamptz,
  closed_at timestamptz,
  notes text,
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outcome_records_application_unique unique (user_id, application_id),
  constraint outcome_records_role_title_present check (length(trim(role_title)) > 0)
);

create table if not exists public.interview_prep_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  role_summary text not null,
  positioning_statement text not null,
  fit_and_gap_recap text not null,
  likely_questions text[] not null default '{}',
  star_answer_prompts text[] not null default '{}',
  project_talking_points text[] not null default '{}',
  skills_to_revise text[] not null default '{}',
  questions_to_ask_employer text[] not null default '{}',
  final_prep_checklist text[] not null default '{}',
  source_surface text not null default 'web'
    check (source_surface in ('web', 'extension')),
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interview_prep_packs_application_unique unique (user_id, application_id),
  constraint interview_prep_packs_role_summary_present check (length(trim(role_summary)) > 0),
  constraint interview_prep_packs_positioning_statement_present check (length(trim(positioning_statement)) > 0),
  constraint interview_prep_packs_fit_recap_present check (length(trim(fit_and_gap_recap)) > 0)
);

create index if not exists applications_user_id_created_at_idx
  on public.applications(user_id, created_at desc);

create index if not exists applications_user_id_status_idx
  on public.applications(user_id, status, updated_at desc);

create index if not exists applications_user_id_next_action_date_idx
  on public.applications(user_id, next_action_date)
  where next_action_date is not null;

create index if not exists evidence_records_user_id_created_at_idx
  on public.evidence_records(user_id, created_at desc);

create index if not exists evidence_records_application_id_idx
  on public.evidence_records(application_id, created_at desc);

create index if not exists outcome_records_user_id_updated_at_idx
  on public.outcome_records(user_id, updated_at desc);

create index if not exists outcome_records_user_id_status_idx
  on public.outcome_records(user_id, status, updated_at desc);

create index if not exists interview_prep_packs_user_id_created_at_idx
  on public.interview_prep_packs(user_id, created_at desc);

drop trigger if exists reusable_answers_set_updated_at on public.reusable_answers;
create trigger reusable_answers_set_updated_at
before update on public.reusable_answers
for each row
execute function public.set_updated_at();

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
before update on public.applications
for each row
execute function public.set_updated_at();

drop trigger if exists outcome_records_set_updated_at on public.outcome_records;
create trigger outcome_records_set_updated_at
before update on public.outcome_records
for each row
execute function public.set_updated_at();

drop trigger if exists interview_prep_packs_set_updated_at on public.interview_prep_packs;
create trigger interview_prep_packs_set_updated_at
before update on public.interview_prep_packs
for each row
execute function public.set_updated_at();

alter table public.reusable_answers enable row level security;
alter table public.applications enable row level security;
alter table public.evidence_records enable row level security;
alter table public.outcome_records enable row level security;
alter table public.interview_prep_packs enable row level security;

drop policy if exists "reusable_answers_select_own" on public.reusable_answers;
create policy "reusable_answers_select_own"
on public.reusable_answers
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "reusable_answers_insert_own" on public.reusable_answers;
create policy "reusable_answers_insert_own"
on public.reusable_answers
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "reusable_answers_update_own" on public.reusable_answers;
create policy "reusable_answers_update_own"
on public.reusable_answers
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "reusable_answers_delete_own" on public.reusable_answers;
create policy "reusable_answers_delete_own"
on public.reusable_answers
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "applications_select_own" on public.applications;
create policy "applications_select_own"
on public.applications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "applications_insert_own" on public.applications;
create policy "applications_insert_own"
on public.applications
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "applications_update_own" on public.applications;
create policy "applications_update_own"
on public.applications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "applications_delete_own" on public.applications;
create policy "applications_delete_own"
on public.applications
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "evidence_records_select_own" on public.evidence_records;
create policy "evidence_records_select_own"
on public.evidence_records
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "evidence_records_insert_own" on public.evidence_records;
create policy "evidence_records_insert_own"
on public.evidence_records
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "evidence_records_update_own" on public.evidence_records;
create policy "evidence_records_update_own"
on public.evidence_records
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "evidence_records_delete_own" on public.evidence_records;
create policy "evidence_records_delete_own"
on public.evidence_records
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "outcome_records_select_own" on public.outcome_records;
create policy "outcome_records_select_own"
on public.outcome_records
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "outcome_records_insert_own" on public.outcome_records;
create policy "outcome_records_insert_own"
on public.outcome_records
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "outcome_records_update_own" on public.outcome_records;
create policy "outcome_records_update_own"
on public.outcome_records
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "outcome_records_delete_own" on public.outcome_records;
create policy "outcome_records_delete_own"
on public.outcome_records
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "interview_prep_packs_select_own" on public.interview_prep_packs;
create policy "interview_prep_packs_select_own"
on public.interview_prep_packs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "interview_prep_packs_insert_own" on public.interview_prep_packs;
create policy "interview_prep_packs_insert_own"
on public.interview_prep_packs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "interview_prep_packs_update_own" on public.interview_prep_packs;
create policy "interview_prep_packs_update_own"
on public.interview_prep_packs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "interview_prep_packs_delete_own" on public.interview_prep_packs;
create policy "interview_prep_packs_delete_own"
on public.interview_prep_packs
for delete
to authenticated
using (auth.uid() = user_id);

alter table public.sync_events
drop constraint if exists sync_events_entity_type_check;

alter table public.sync_events
add constraint sync_events_entity_type_check
check (
  entity_type in (
    'profile',
    'profile_revision',
    'reusable_answers',
    'application',
    'evidence_record',
    'outcome_record',
    'interview_prep_pack'
  )
);
