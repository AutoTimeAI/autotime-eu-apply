-- Cloud schema for the Jobs/Applications/Interviews workflow (issue #29, phase 2).
-- This feature currently persists only to browser localStorage
-- (apps/web/lib/job-workflow-storage.ts, interview-storage.ts). These tables
-- are new and entirely separate from the existing public.applications /
-- public.interview_prep_packs tables, which belong to a different, older
-- feature (DashboardExperience) whose status vocabulary has already diverged
-- from this one. No FK to those tables; client-side URL dedup is used
-- instead, matching how the existing read-only bridge already works.
--
-- This migration only creates schema. Nothing in the app reads or writes
-- these tables yet - that is deliberately separate follow-up work. This
-- migration intentionally fails when any intended object already exists
-- (same one-shot style as 20260729120000_mobility_profiles_entry_gate.sql).

begin;

do $job_workflow_preflight$
begin
  if to_regclass('public.job_workflow_jobs') is not null
    or to_regclass('public.job_workflow_analysis_snapshots') is not null
    or to_regclass('public.job_workflow_applications') is not null
    or to_regclass('public.job_workflow_screening_answers') is not null
    or to_regclass('public.interview_records') is not null
    or to_regclass('public.interview_questions') is not null
    or to_regclass('public.interview_preparation_snapshots') is not null
  then
    raise exception
      'job workflow migration preflight failed: an intended table already exists';
  end if;

  if to_regclass('auth.users') is null then
    raise exception
      'job workflow migration preflight failed: auth.users is unavailable';
  end if;

  if to_regprocedure('public.set_updated_at()') is null then
    raise exception
      'job workflow migration preflight failed: public.set_updated_at() is unavailable';
  end if;

  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    raise exception
      'job workflow migration preflight failed: authenticated role is unavailable';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and policyname in (
        'job_workflow_jobs_select_own',
        'job_workflow_jobs_insert_own',
        'job_workflow_jobs_update_own',
        'job_workflow_jobs_delete_own',
        'job_workflow_analysis_snapshots_select_own',
        'job_workflow_analysis_snapshots_insert_own',
        'job_workflow_analysis_snapshots_update_own',
        'job_workflow_analysis_snapshots_delete_own',
        'job_workflow_applications_select_own',
        'job_workflow_applications_insert_own',
        'job_workflow_applications_update_own',
        'job_workflow_applications_delete_own',
        'job_workflow_screening_answers_select_own',
        'job_workflow_screening_answers_insert_own',
        'job_workflow_screening_answers_update_own',
        'job_workflow_screening_answers_delete_own',
        'interview_records_select_own',
        'interview_records_insert_own',
        'interview_records_update_own',
        'interview_records_delete_own',
        'interview_questions_select_own',
        'interview_questions_insert_own',
        'interview_questions_update_own',
        'interview_questions_delete_own',
        'interview_preparation_snapshots_select_own',
        'interview_preparation_snapshots_insert_own',
        'interview_preparation_snapshots_update_own',
        'interview_preparation_snapshots_delete_own'
      )
  ) then
    raise exception
      'job workflow migration preflight failed: an intended policy name already exists';
  end if;

  if exists (
    select 1
    from pg_trigger
    where tgname in (
      'job_workflow_jobs_set_updated_at',
      'job_workflow_applications_set_updated_at',
      'job_workflow_screening_answers_set_updated_at',
      'interview_records_set_updated_at'
    )
    and not tgisinternal
  ) then
    raise exception
      'job workflow migration preflight failed: an intended trigger name already exists';
  end if;
end
$job_workflow_preflight$;

-- Mirrors apps/web/lib/job-application-workflow.ts JobRecord. ids are
-- client-supplied (crypto.randomUUID() already generated locally), not
-- server-defaulted, so local records round-trip on sync without remapping.
create table public.job_workflow_jobs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title jsonb not null,
  employer jsonb not null,
  facts jsonb not null,
  description text not null default '',
  source text not null
    check (source in ('Pasted vacancy', 'Browser extension', 'Saved job', 'Development fixture')),
  source_url text not null default '',
  ats_platform text,
  lane text not null default '',
  source_surface text not null default 'web'
    check (source_surface in ('web', 'extension')),
  captured_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint job_workflow_jobs_title_object check (jsonb_typeof(title) = 'object'),
  constraint job_workflow_jobs_employer_object check (jsonb_typeof(employer) = 'object'),
  constraint job_workflow_jobs_facts_object check (jsonb_typeof(facts) = 'object')
);

-- Mirrors JobAnalysisResult. Append-only: one row per analysis run, never
-- updated in place (same pattern as evidence_records/outcome_records).
create table public.job_workflow_analysis_snapshots (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.job_workflow_jobs(id) on delete cascade,
  version integer not null check (version > 0),
  decision text not null
    check (decision in ('Apply', 'Consider', 'Skip', 'Insufficient information')),
  confidence text not null check (confidence in ('Low', 'Medium', 'High')),
  coverage integer not null check (coverage between 0 and 100),
  critical_risk text not null default '',
  next_action text not null default '',
  positive_evidence text not null default '',
  reason text not null default '',
  capability jsonb not null default '[]'::jsonb,
  unknowns text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint job_workflow_analysis_snapshots_job_version_unique unique (job_id, version),
  constraint job_workflow_analysis_snapshots_capability_array
    check (jsonb_typeof(capability) = 'array')
);

-- Mirrors ApplicationWorkspace.
create table public.job_workflow_applications (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.job_workflow_jobs(id) on delete cascade,
  status text not null
    check (
      status in (
        'Preparing', 'Needs review', 'Ready', 'Applied',
        'Interview', 'Offer', 'Rejected', 'Withdrawn'
      )
    ),
  checklist boolean[] not null,
  consequential_answers_reviewed boolean not null default false,
  cover_letter text,
  cover_letter_requested boolean not null default false,
  document_versions text[] not null default '{}',
  evidence_confirmed boolean not null default false,
  follow_up_date date,
  reference_number text,
  selected_cv_version text not null default 'Confirmed profile',
  submission_confirmed boolean not null default false,
  unsupported_claims text[] not null default '{}',
  applied_at timestamptz,
  application_channel text,
  source_surface text not null default 'web'
    check (source_surface in ('web', 'extension')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_workflow_applications_checklist_length
    check (array_length(checklist, 1) = 8)
);

-- Mirrors ScreeningAnswer. Real child rows (individually confirmed/edited),
-- not a jsonb array on the application row.
create table public.job_workflow_screening_answers (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.job_workflow_applications(id) on delete cascade,
  question text not null,
  proposed text not null default '',
  user_value text not null default '',
  confirmed boolean not null default false,
  consequential boolean not null default false,
  -- Opaque self-generated ids (see InterviewSourceReference.id elsewhere in
  -- this feature) - not a foreign key into evidence_records.
  evidence_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mirrors InterviewRecord, minus its questions array (see interview_questions
-- below). updated_at on this row is the single concurrency token for the
-- whole interview plus its questions - the local reducers already treat
-- `questions` as a whole-array replace on every mutation, so per-question
-- optimistic concurrency would not match how the app actually writes.
create table public.interview_records (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.job_workflow_applications(id) on delete cascade,
  job_id uuid not null references public.job_workflow_jobs(id) on delete cascade,
  stage text not null
    check (
      stage in (
        'recruiter_screen', 'hiring_manager', 'technical', 'case_study',
        'behavioural', 'panel', 'final', 'other'
      )
    ),
  custom_stage text,
  format text not null
    check (format in ('phone', 'video', 'onsite', 'take_home', 'unknown')),
  scheduled_at timestamptz,
  timezone text,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 10 and 480),
  location_or_meeting_note text,
  participant_notes text,
  participant_roles text[] not null default '{}',
  preparation_notes text,
  status text not null
    check (status in ('scheduled', 'preparing', 'ready', 'completed', 'cancelled')),
  outcome text not null
    check (
      outcome in (
        'awaiting', 'progressed', 'offer', 'rejected',
        'withdrawn', 'cancelled', 'no_response'
      )
    ),
  preparation_version integer not null default 1,
  final_review_completed boolean not null default false,
  outcome_details jsonb,
  source_surface text not null default 'web'
    check (source_surface in ('web', 'extension')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interview_records_outcome_details_object
    check (outcome_details is null or jsonb_typeof(outcome_details) = 'object')
);

-- Mirrors InterviewQuestion, one row per question. Ids are the app's
-- deterministic stableId() hash strings, not uuids - hence text, not uuid.
-- No updated_at/trigger: see interview_records above for why concurrency is
-- tracked at the interview level, not per question.
create table public.interview_questions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_id uuid not null references public.interview_records(id) on delete cascade,
  category text not null
    check (
      category in (
        'motivation', 'experience', 'behavioural', 'technical',
        'scenario', 'stakeholder', 'job_risk', 'employer_questions'
      )
    ),
  question text not null,
  reason text not null default '',
  source_references jsonb not null default '[]'::jsonb,
  importance text not null check (importance in ('high', 'medium', 'low')),
  evidence_status text not null
    check (evidence_status in ('strong', 'partial', 'missing', 'not_required')),
  answer_draft jsonb,
  user_confidence text
    check (user_confidence is null or user_confidence in ('not_started', 'low', 'medium', 'high')),
  marked_for_practice boolean not null default false,
  practice_sessions jsonb not null default '[]'::jsonb,
  origin text not null
    check (
      origin in ('deterministic', 'interview_bank', 'job_requirement', 'evidence_gap', 'ai')
    ),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  constraint interview_questions_source_references_array
    check (jsonb_typeof(source_references) = 'array'),
  constraint interview_questions_answer_draft_object
    check (answer_draft is null or jsonb_typeof(answer_draft) = 'object'),
  constraint interview_questions_practice_sessions_array
    check (jsonb_typeof(practice_sessions) = 'array')
);

-- Mirrors InterviewRecord.preparationHistory. Append-only, one row per
-- preparation version, same pattern as job_workflow_analysis_snapshots.
create table public.interview_preparation_snapshots (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_id uuid not null references public.interview_records(id) on delete cascade,
  version integer not null check (version > 0),
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint interview_preparation_snapshots_interview_version_unique
    unique (interview_id, version),
  constraint interview_preparation_snapshots_questions_array
    check (jsonb_typeof(questions) = 'array')
);

create index job_workflow_jobs_user_id_captured_at_idx
  on public.job_workflow_jobs(user_id, captured_at desc);

create index job_workflow_analysis_snapshots_job_id_version_idx
  on public.job_workflow_analysis_snapshots(job_id, version desc);

create index job_workflow_applications_user_id_updated_at_idx
  on public.job_workflow_applications(user_id, updated_at desc);

create index job_workflow_applications_user_id_status_idx
  on public.job_workflow_applications(user_id, status, updated_at desc);

create index job_workflow_applications_job_id_idx
  on public.job_workflow_applications(job_id);

create index job_workflow_screening_answers_application_id_idx
  on public.job_workflow_screening_answers(application_id);

create index interview_records_user_id_updated_at_idx
  on public.interview_records(user_id, updated_at desc);

create index interview_records_application_id_idx
  on public.interview_records(application_id);

create index interview_records_job_id_idx
  on public.interview_records(job_id);

create index interview_questions_interview_id_idx
  on public.interview_questions(interview_id);

create index interview_preparation_snapshots_interview_id_idx
  on public.interview_preparation_snapshots(interview_id, version desc);

create trigger job_workflow_jobs_set_updated_at
before update on public.job_workflow_jobs
for each row execute function public.set_updated_at();

create trigger job_workflow_applications_set_updated_at
before update on public.job_workflow_applications
for each row execute function public.set_updated_at();

create trigger job_workflow_screening_answers_set_updated_at
before update on public.job_workflow_screening_answers
for each row execute function public.set_updated_at();

create trigger interview_records_set_updated_at
before update on public.interview_records
for each row execute function public.set_updated_at();

alter table public.job_workflow_jobs enable row level security;
alter table public.job_workflow_analysis_snapshots enable row level security;
alter table public.job_workflow_applications enable row level security;
alter table public.job_workflow_screening_answers enable row level security;
alter table public.interview_records enable row level security;
alter table public.interview_questions enable row level security;
alter table public.interview_preparation_snapshots enable row level security;

create policy "job_workflow_jobs_select_own"
on public.job_workflow_jobs for select to authenticated
using (auth.uid() = user_id);
create policy "job_workflow_jobs_insert_own"
on public.job_workflow_jobs for insert to authenticated
with check (auth.uid() = user_id);
create policy "job_workflow_jobs_update_own"
on public.job_workflow_jobs for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "job_workflow_jobs_delete_own"
on public.job_workflow_jobs for delete to authenticated
using (auth.uid() = user_id);

create policy "job_workflow_analysis_snapshots_select_own"
on public.job_workflow_analysis_snapshots for select to authenticated
using (auth.uid() = user_id);
create policy "job_workflow_analysis_snapshots_insert_own"
on public.job_workflow_analysis_snapshots for insert to authenticated
with check (auth.uid() = user_id);
create policy "job_workflow_analysis_snapshots_update_own"
on public.job_workflow_analysis_snapshots for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "job_workflow_analysis_snapshots_delete_own"
on public.job_workflow_analysis_snapshots for delete to authenticated
using (auth.uid() = user_id);

create policy "job_workflow_applications_select_own"
on public.job_workflow_applications for select to authenticated
using (auth.uid() = user_id);
create policy "job_workflow_applications_insert_own"
on public.job_workflow_applications for insert to authenticated
with check (auth.uid() = user_id);
create policy "job_workflow_applications_update_own"
on public.job_workflow_applications for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "job_workflow_applications_delete_own"
on public.job_workflow_applications for delete to authenticated
using (auth.uid() = user_id);

create policy "job_workflow_screening_answers_select_own"
on public.job_workflow_screening_answers for select to authenticated
using (auth.uid() = user_id);
create policy "job_workflow_screening_answers_insert_own"
on public.job_workflow_screening_answers for insert to authenticated
with check (auth.uid() = user_id);
create policy "job_workflow_screening_answers_update_own"
on public.job_workflow_screening_answers for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "job_workflow_screening_answers_delete_own"
on public.job_workflow_screening_answers for delete to authenticated
using (auth.uid() = user_id);

create policy "interview_records_select_own"
on public.interview_records for select to authenticated
using (auth.uid() = user_id);
create policy "interview_records_insert_own"
on public.interview_records for insert to authenticated
with check (auth.uid() = user_id);
create policy "interview_records_update_own"
on public.interview_records for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "interview_records_delete_own"
on public.interview_records for delete to authenticated
using (auth.uid() = user_id);

create policy "interview_questions_select_own"
on public.interview_questions for select to authenticated
using (auth.uid() = user_id);
create policy "interview_questions_insert_own"
on public.interview_questions for insert to authenticated
with check (auth.uid() = user_id);
create policy "interview_questions_update_own"
on public.interview_questions for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "interview_questions_delete_own"
on public.interview_questions for delete to authenticated
using (auth.uid() = user_id);

create policy "interview_preparation_snapshots_select_own"
on public.interview_preparation_snapshots for select to authenticated
using (auth.uid() = user_id);
create policy "interview_preparation_snapshots_insert_own"
on public.interview_preparation_snapshots for insert to authenticated
with check (auth.uid() = user_id);
create policy "interview_preparation_snapshots_update_own"
on public.interview_preparation_snapshots for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "interview_preparation_snapshots_delete_own"
on public.interview_preparation_snapshots for delete to authenticated
using (auth.uid() = user_id);

commit;
